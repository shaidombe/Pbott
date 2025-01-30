import { adminAuth } from '@/lib/firebase/admin';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // קריאה אחת בלבד ל-request.json()
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { token, name, color } = requestData;
    if (!token) {
      return NextResponse.json({ error: 'No Google token provided' }, { status: 400 });
    }

    // אימות הטוקן ושליפת מידע על המשתמש
    let userId;
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (!decodedToken.uid) {
        throw new Error('Invalid token');
      }
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/calendar-callback`
    );

    oauth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const calendarName = name || 'Pbott Tasks'; // ברירת מחדל אם לא נשלח שם

    // בדיקה אם יומן המשימות כבר קיים
    const calendarList = await calendar.calendarList.list();
    const existingTasksCalendar = calendarList.data.items?.find(
      cal => cal.summary === calendarName
    );

    if (existingTasksCalendar) {
      return NextResponse.json({ 
        error: 'Tasks calendar already exists',
        calendarId: existingTasksCalendar.id,
        calendarData: {
          id: existingTasksCalendar.id,
          name: calendarName,
          googleCalendarId: existingTasksCalendar.id,
          type: 'TASKS',
          types: ['TASKS'],
          color: color || '#FF9800',
          isActive: true,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }, { status: 400 });
    }

    // יצירת יומן חדש
    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: calendarName,
        description: 'Calendar for Pbot system tasks and automated events',
        timeZone: 'Asia/Jerusalem',
      },
    });

    // עדכון צבע היומן והגדרות נוספות
    if (newCalendar.data.id) {
      await calendar.calendarList.update({
        calendarId: newCalendar.data.id,
        requestBody: {
          backgroundColor: color || '#FF9800',
          foregroundColor: '#000000',
          colorId: '6',
          defaultReminders: [{ method: 'popup', minutes: 30 }]
        }
      });
    }

    return NextResponse.json({
      calendarId: newCalendar.data.id,
      calendarData: {
        id: newCalendar.data.id,
        name: calendarName,
        googleCalendarId: newCalendar.data.id,
        type: 'TASKS',
        types: ['TASKS'],
        color: color || '#FF9800',
        isActive: true,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error creating tasks calendar:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create calendar' 
    }, { status: 500 });
  }
} 