import { addDays, addMinutes, isWithinInterval } from 'date-fns';
import { Task, World, CalendarEvent } from '@/app/types';

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
    
    // בדוק שהמשימה נכנסת בתוך החלון
    if (taskEnd > window.end) {
      return false;
    }
    
    // בדוק התנגשות עם אירועים קיימים
    for (const event of existingEvents) {
      if (
        isWithinInterval(window.start, { start: event.start, end: event.end }) ||
        isWithinInterval(taskEnd, { start: event.start, end: event.end })
      ) {
        return false;
      }
    }
    
    return true;
  }

  async findNextAvailableSlot(
    task: Task,
    world: World,
    existingEvents: CalendarEvent[],
    startDate: Date = new Date(),
    daysToLook: number = 30
  ): Promise<ScheduleResult> {
    const windows = this.getAvailableWindows(world, startDate, daysToLook);
    
    // חפש חלון פנוי בתוך הזמנים המועדפים
    for (const window of windows) {
      if (this.isWindowAvailable(window, task.estimatedDuration, existingEvents)) {
        return {
          success: true,
          scheduledStart: window.start,
          scheduledEnd: addMinutes(window.start, task.estimatedDuration)
        };
      }
    }
    
    // אם לא נמצא זמן בתוך החלונות המועדפים ויש deadline
    if (task.deadline) {
      // חפש כל חלון פנוי עד ה-deadline
      const allDayWindows = this.getAllDayWindows(startDate, new Date(task.deadline));
      
      for (const window of allDayWindows) {
        if (this.isWindowAvailable(window, task.estimatedDuration, existingEvents)) {
          return {
            success: true,
            scheduledStart: window.start,
            scheduledEnd: addMinutes(window.start, task.estimatedDuration),
            isOutOfPreferredTime: true
          };
        }
      }
    }
    
    return { success: false };
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