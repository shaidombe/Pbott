import { Task } from '@/app/types';
import { convertPriorityToGoogle } from '@/app/types';

export class GoogleCalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';
  
  constructor(private accessToken: string) {}

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    try {
      console.log('Making calendar API request:', endpoint);
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
        console.error('Calendar API error response:', errorData);
        throw new Error(
          `Calendar API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('Calendar API response:', data);
      return data;
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

  async getEvents(timeMin: Date, timeMax: Date, calendarId: string = 'primary') {
    console.log('Getting events for calendar:', calendarId, { timeMin, timeMax });
    
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    return this.fetchWithAuth(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  }

  async createEvent(task: Task, calendarId: string = 'primary') {
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

    const response = await this.fetchWithAuth(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });

    return response.id;
  }

  async updateEvent(eventId: string, task: Task, calendarId: string = 'primary') {
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

    return this.fetchWithAuth(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    });
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary') {
    return this.fetchWithAuth(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async testAccess(calendarId: string = 'primary') {
    try {
      const params = new URLSearchParams({
        maxResults: '1',
      });
      
      await this.fetchWithAuth(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
      return true;
    } catch (error) {
      console.error('Calendar access test failed:', error);
      return false;
    }
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