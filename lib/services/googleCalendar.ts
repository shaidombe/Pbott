import { Task } from '@/app/types';
import { convertPriorityToGoogle } from '@/app/types';

export class GoogleCalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';
  
  constructor(private accessToken: string) {}

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Calendar API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      console.error('Calendar API request failed:', error);
      throw error;
    }
  }

  async getCalendarList() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    return this.fetchWithAuth('/users/me/calendarList');
  }

  async getEvents(timeMin: Date, timeMax: Date) {
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    return this.fetchWithAuth(`/calendars/primary/events?${params}`);
  }

  async createEvent(task: Task) {
    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.scheduledStart?.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: task.scheduledEnd?.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: convertPriorityToGoogle(task.priority),
    };

    const response = await this.fetchWithAuth('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });

    return response.id;
  }

  async updateEvent(eventId: string, task: Task) {
    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.scheduledStart?.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: task.scheduledEnd?.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: convertPriorityToGoogle(task.priority),
    };

    return this.fetchWithAuth(`/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    });
  }

  async deleteEvent(eventId: string) {
    return this.fetchWithAuth(`/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  private getPriorityColor(priority: 'low' | 'medium' | 'high'): string {
    // Google Calendar color IDs
    switch (priority) {
      case 'high':
        return '11'; // Red
      case 'medium':
        return '5';  // Yellow
      case 'low':
        return '9';  // Green
      default:
        return '1';  // Blue
    }
  }
} 