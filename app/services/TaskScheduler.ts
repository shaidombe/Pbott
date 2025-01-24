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
}

export class TaskScheduler {
  constructor(private calendars: GoogleCalendarService[]) {}

  private getAvailableWindows(world: World, startDate: Date, daysToLook: number): ScheduleWindow[] {
    const windows: ScheduleWindow[] = [];
    const endDate = addDays(startDate, daysToLook);
    
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      const dayOfWeek = date.getDay();
      const daySlots = world.timeSlots.filter(slot => slot.dayOfWeek === dayOfWeek);
      
      for (const slot of daySlots) {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        const windowStart = new Date(date);
        windowStart.setHours(startHour, startMinute, 0);
        
        const windowEnd = new Date(date);
        windowEnd.setHours(endHour, endMinute, 0);
        
        windows.push({ start: windowStart, end: windowEnd });
      }
    }
    
    return windows;
  }

  private isWindowAvailable(
    window: ScheduleWindow,
    taskDuration: number,
    existingEvents: CalendarEvent[]
  ): boolean {
    const taskEnd = addMinutes(window.start, taskDuration);
    
    if (taskEnd > window.end) {
      return false;
    }
    
    for (const event of existingEvents) {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      
      if (
        isWithinInterval(window.start, { start: eventStart, end: eventEnd }) ||
        isWithinInterval(taskEnd, { start: eventStart, end: eventEnd })
      ) {
        return false;
      }
    }
    
    return true;
  }

  async getAllEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const allEvents = await Promise.all(
      this.calendars.map(cal => cal.getEvents(startDate, endDate))
    );
    return allEvents.flat();
  }

  async findNextAvailableSlot(
    task: Task,
    world: World,
    startDate: Date = new Date(),
    daysToLook: number = 30
  ): Promise<ScheduleResult> {
    const endDate = addDays(startDate, daysToLook);
    const existingEvents = await this.getAllEvents(startDate, endDate);
    const windows = this.getAvailableWindows(world, startDate, daysToLook);
    
    // חיפוש בתוך הזמנים המועדפים
    for (const window of windows) {
      if (this.isWindowAvailable(window, task.estimatedDuration, existingEvents)) {
        return {
          success: true,
          scheduledStart: window.start,
          scheduledEnd: addMinutes(window.start, task.estimatedDuration)
        };
      }
    }
    
    // אם יש deadline ולא נמצא זמן בשעות המועדפות
    if (task.deadline) {
      const conflictingEvents = this.findConflictingEvents(
        startDate,
        new Date(task.deadline),
        task.estimatedDuration,
        existingEvents
      );

      return {
        success: true,
        scheduledStart: this.suggestAlternativeTime(startDate, new Date(task.deadline), task.estimatedDuration, existingEvents),
        isOutOfPreferredTime: true,
        conflictingEvents
      };
    }
    
    return { success: false };
  }

  private findConflictingEvents(
    start: Date,
    end: Date,
    duration: number,
    events: CalendarEvent[]
  ): CalendarEvent[] {
    return events.filter(event => 
      this.doesEventConflict(event, start, addMinutes(start, duration))
    );
  }

  private doesEventConflict(event: CalendarEvent, start: Date, end: Date): boolean {
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);
    
    return (
      isWithinInterval(start, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(end, { start: eventStart, end: eventEnd })
    );
  }

  private suggestAlternativeTime(
    start: Date,
    end: Date,
    duration: number,
    events: CalendarEvent[]
  ): Date {
    // מציאת החלון הפנוי הראשון
    let currentTime = start;
    while (currentTime < end) {
      const isConflict = events.some(event => 
        this.doesEventConflict(event, currentTime, addMinutes(currentTime, duration))
      );
      
      if (!isConflict) {
        return currentTime;
      }
      
      // נסה את החלון הבא
      currentTime = addMinutes(currentTime, 30);
    }
    
    // אם לא נמצא זמן פנוי, החזר את זמן ההתחלה המקורי
    return start;
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
} 