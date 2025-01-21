export type ViewType = 'month' | 'week' | 'day';

export interface BaseCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export interface CalendarEvent extends BaseCalendarEvent {
  source: 'google' | 'local';
  calendarId: string;
}

export interface CalendarViewEvent extends BaseCalendarEvent {
  worldId?: string;
  isTask?: boolean;
} 