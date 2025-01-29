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

export interface WorldStats {
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  timeInvested: number;
}

export interface World {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: WorldCategory;
  isActive: boolean;
  timeSlots: TimeSlot[];
  createdAt: Date;
  updatedAt: Date;
  stats?: WorldStats;
  icon?: string;
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

export type Goal = {
  id: string;
  worldId: string;
  userId: string;
  title: string;
  description: string;
  importance: 'MUST' | 'VERY_HIGH' | 'HIGH';
  deadline: Date;
  measurementType: 'TASKS' | 'NUMERIC';
  target: number;
  targetUnit: string;
  currentProgress: number;
  timeInvested: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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
  events: CalendarEvent[];
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
  calendarId?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  backgroundColor?: string;
  calendarColor?: string;
}

export interface GoogleCalendarResponse {
  items: CalendarEvent[];
}

export interface GoogleCalendarService {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getEvents: (timeMin: Date, timeMax: Date) => Promise<GoogleCalendarResponse>;
}

export interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  googleCalendar: GoogleCalendarService;
  connectedCalendars: ConnectedCalendar[];
} 