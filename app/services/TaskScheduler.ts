import { addDays, addMinutes, isWithinInterval } from 'date-fns';
import { Task, World, CalendarEvent, GoogleCalendarService } from '@/app/types';

interface ScheduleWindow {
  start: Date;
  end: Date;
}

interface ScheduleResult {
  success: boolean;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  isOutOfPreferredTime?: boolean;
  conflictingEvents?: CalendarEvent[];
  diagnosticInfo: {
    taskDuration: number;
    numberOfWindows: number;
    existingEvents: number;
    worldTimeSlots: number;
    checkedCalendars: string[];
    failureReason: string;
  };
  error?: string;
  suggestedAlternativeTime?: Date | null;
}

interface ErrorState {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  diagnosticInfo?: {
    checkedCalendars: string[];
    timeRange: {
      start: Date;
      end: Date;
    };
    availableSlots?: {
      start: Date;
      end: Date;
    }[];
  };
  actionButton?: {
    text: string;
    action: () => void;
  };
}

export class TaskScheduler {
  constructor(private calendars: GoogleCalendarService[]) {}

  private getAvailableWindows(world: World, startDate: Date, daysToLook: number): ScheduleWindow[] {
    const windows: ScheduleWindow[] = [];
    const endDate = addDays(startDate, daysToLook);
    const now = new Date();
    
    for (let date = startDate; date < endDate; date = addDays(date, 1)) {
      const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const slotsForDay = world.timeSlots.filter(slot => slot.dayOfWeek === dayOfWeek);
      
      for (const slot of slotsForDay) {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        const windowStart = new Date(date);
        windowStart.setHours(startHour, startMinute, 0, 0);
        
        const windowEnd = new Date(date);
        windowEnd.setHours(endHour, endMinute, 0, 0);

        // בדיקה שהחלון הוא בעתיד ובטווח של 30 יום
        if (windowStart > now && windowStart <= endDate) {
          windows.push({
            start: windowStart,
            end: windowEnd
          });
        }
      }
    }

    // מיון החלונות לפי תאריך
    return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private isWindowAvailable(
    window: ScheduleWindow,
    taskDuration: number,
    existingEvents: CalendarEvent[]
  ): boolean {
    // בדיקה שהמשימה לא חורגת מהחלון
    if (addMinutes(window.start, taskDuration) > window.end) {
      return false;
    }

    // מיון האירועים לפי זמן התחלה
    const sortedEvents = existingEvents
      .filter(event => event.start?.dateTime && event.end?.dateTime)
      .sort((a, b) => 
        new Date(a.start!.dateTime!).getTime() - new Date(b.start!.dateTime!).getTime()
      );

    // בדיקת חלונות פנויים בין האירועים
    let currentTime = window.start;

    for (const event of sortedEvents) {
      const eventStart = new Date(event.start!.dateTime!);
      const eventEnd = new Date(event.end!.dateTime!);

      // אם יש מספיק זמן לפני האירוע הבא
      if (eventStart.getTime() - currentTime.getTime() >= taskDuration * 60 * 1000) {
        return true;
      }

      // התקדמות לסוף האירוע הנוכחי
      currentTime = eventEnd > currentTime ? eventEnd : currentTime;
    }

    // בדיקה אם נשאר מספיק זמן אחרי האירוע האחרון
    return window.end.getTime() - currentTime.getTime() >= taskDuration * 60 * 1000;
  }

  async getAllEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const allEvents = await Promise.all(
      this.calendars.map(cal => cal.getEvents(startDate, endDate))
    );
    return allEvents.flatMap(response => response.items);
  }

  async findNextAvailableSlot(
    task: Task,
    world: World,
    startDate: Date = new Date(),
    daysToLook: number = 30,
    skipUntil?: Date
  ): Promise<ScheduleResult> {
    console.log('=== Starting findNextAvailableSlot ===');
    console.log('Task:', {
      title: task.title,
      duration: task.estimatedDuration,
      deadline: task.deadline
    });
    console.log('World:', {
      id: world.id,
      name: world.name,
      timeSlots: world.timeSlots,
      rawWorld: world
    });

    const endDate = addDays(startDate, daysToLook);
    const existingEvents = await this.getAllEvents(startDate, endDate);
    let windows = this.getAvailableWindows(world, startDate, daysToLook);
    
    if (skipUntil) {
      windows = windows.filter(window => window.start > skipUntil);
    }

    const diagnosticInfo = {
      taskDuration: task.estimatedDuration,
      numberOfWindows: windows.length,
      existingEvents: existingEvents.length,
      worldTimeSlots: world.timeSlots.length,
      checkedCalendars: this.calendars.map(cal => cal.type || 'UNKNOWN'),
      failureReason: ''
    };

    // בדיקה אם יש בכלל חלונות זמן מוגדרים
    if (windows.length === 0) {
      diagnosticInfo.failureReason = 'NO_TIME_SLOTS';
      return {
        success: false,
        diagnosticInfo,
        error: 'לא הוגדרו זמנים בעולם זה. אנא הגדר זמנים בהגדרות העולם.'
      };
    }

    // בדיקה אם משך המשימה ארוך מדי
    const longestWindow = Math.max(...windows.map(w => 
      (w.end.getTime() - w.start.getTime()) / (1000 * 60)
    ));
    
    if (task.estimatedDuration > longestWindow) {
      diagnosticInfo.failureReason = 'TASK_TOO_LONG';
      return {
        success: false,
        diagnosticInfo,
        error: `משך המשימה (${task.estimatedDuration} דקות) ארוך מהחלון הפנוי הארוך ביותר (${longestWindow} דקות)`
      };
    }

    // חיפוש בתוך הזמנים המועדפים
    for (const window of windows) {
      if (this.isWindowAvailable(window, task.estimatedDuration, existingEvents)) {
        return {
          success: true,
          scheduledStart: window.start,
          scheduledEnd: addMinutes(window.start, task.estimatedDuration),
          diagnosticInfo
        };
      }
    }

    // אם הגענו לכאן, יש התנגשויות בכל החלונות
    const lastWindow = windows[windows.length - 1];
    const conflictingEvents = this.findConflictingEvents(
      lastWindow.start,
      lastWindow.end,
      task.estimatedDuration,
      existingEvents
    );

    const alternativeTime = this.suggestAlternativeTime(
      lastWindow,
      windows,
      task.estimatedDuration,
      existingEvents
    );

    diagnosticInfo.failureReason = 'CALENDAR_CONFLICTS';
    return {
      success: false,
      diagnosticInfo,
      error: `נמצאו ${conflictingEvents.length} התנגשויות בחלון הזמן המבוקש`,
      conflictingEvents,
      suggestedAlternativeTime: alternativeTime
    };
  }

  private findConflictingEvents(
    start: Date,
    end: Date,
    duration: number,    events: CalendarEvent[]
  ): CalendarEvent[] {
    return events.filter(event => 
      this.doesEventConflict(event, start, addMinutes(start, duration))
    );
  }

  private doesEventConflict(event: CalendarEvent, start: Date, end: Date): boolean {
    if (!event.start?.dateTime || !event.end?.dateTime) {
      return false;
    }
    
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);
    
    return (
      isWithinInterval(start, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(end, { start: eventStart, end: eventEnd })
    );
  }

  private suggestAlternativeTime(
    currentWindow: ScheduleWindow,
    windows: ScheduleWindow[],
    taskDuration: number,
    events: CalendarEvent[]
  ): Date | null {
    // נתחיל מהחלון הבא אחרי החלון הנוכחי
    const currentWindowIndex = windows.findIndex(w => 
      w.start.getTime() === currentWindow.start.getTime()
    );
    
    // נעבור על כל החלונות החל מהחלון הבא
    for (let i = currentWindowIndex + 1; i < windows.length; i++) {
      const window = windows[i];
      let currentTime = window.start;
      
      while (currentTime < window.end) {
        // בדיקה אם יש מספיק זמן עד סוף החלון
        if (addMinutes(currentTime, taskDuration) > window.end) {
          break;
        }

        // בדיקת התנגשויות
        const conflictingEvents = this.findConflictingEvents(
          currentTime,
          window.end,
          taskDuration,
          events
        );

        if (conflictingEvents.length === 0) {
          return currentTime;
        }

        // התקדמות ב-30 דקות
        currentTime = addMinutes(currentTime, 30);
      }
    }
    
    return null;
  }

  private getAllDayWindows(startDate: Date, endDate: Date): ScheduleWindow[] {
    const windows: ScheduleWindow[] = [];
    
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      windows.push({
        start: new Date(date.setHours(9, 0, 0, 0)),  // התחל ב-9 בבוקר
        end: new Date(date.setHours(21, 0, 0, 0))    // סיים ב-9 בערב
      });
    }
    
    return windows;
  }

  async getCalendarEvents(startDate: Date): Promise<CalendarEvent[]> {
    if (!this.calendars[0]) return [];
    
    try {
      const endDate = addDays(startDate, 1);
      const response = await this.calendars[0].getEvents(startDate, endDate);
      return response.items;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }
} 
