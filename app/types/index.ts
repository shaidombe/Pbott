export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  googleCalendarConnected: boolean;
  googleAccessToken?: string;  // אופציונלי כי לא תמיד יהיה לנו
  createdAt: Date;
  updatedAt: Date;
}

export enum WorldCategory {
  WORK = 'WORK',
  FAMILY = 'FAMILY',
  HEALTH = 'HEALTH',
  PERSONAL = 'PERSONAL',
  SOCIAL = 'SOCIAL',
  STUDY = 'STUDY',
  SLEEP = 'SLEEP',
  CUSTOM = 'CUSTOM'
}

export interface TimeSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
}

export interface World {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: WorldCategory;
  isActive: boolean;
  timeSlots: TimeSlot[];
  stats?: {
    totalGoals: number;
    completedGoals: number;
    timeInvested: number;
  };
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BigStone {
  id: string;
  worldId: string;
  userId: string;
  title: string;
  description: string;
  deadline: Date;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'cancelled';
  subTasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  worldId: string;
  userId: string;
  title: string;
  description: string;
  target: number;        // יעד מספרי (למשל: 20 שיתופי פעולה)
  currentProgress: number; // התקדמות נוכחית
  timeInvested: number;  // זמן שהושקע בדקות
  deadline?: Date;       // תאריך יעד
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  worldId: string;
  goalId: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedDuration: number;
  deadline?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  isOutOfPreferredTime?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyPlan {
  id: string;
  userId: string;
  date: Date;
  tasks: Task[];
  completed: boolean;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CalendarType = 'HOME' | 'WORK' | 'LEISURE' | 'PRIMARY' | 'OTHER';

export interface ConnectedCalendar {
  id: string;
  googleCalendarId: string;
  name: string;
  types: string[];
  color?: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper type for Google Calendar priority
export type GooglePriority = 'low' | 'medium' | 'high';

// Helper function to convert our priority to Google's format
export const convertPriorityToGoogle = (priority: Task['priority']): GooglePriority => {
  return priority.toLowerCase() as GooglePriority;
};

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  isAllDay: boolean;
} 