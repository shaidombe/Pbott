import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@/lib/firebase/admin';
import { authOptions } from '@/lib/auth';
import { calendar_v3 } from 'googleapis';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const calendarId = searchParams.get('calendarId');

    console.log('Calendar API request params:', { timeMin, timeMax, calendarId });

    const userDoc = await db.collection('users').doc(session.user.id).get();
    const userData = userDoc.data();
    console.log('User data from Firestore:', {
      hasTokens: !!userData?.googleCalendarTokens,
      isConnected: userData?.googleCalendarConnected,
      tokenExpiry: userData?.googleCalendarTokens?.expiry_date,
      email: userData?.email
    });
    
    if (!userData?.googleCalendarTokens) {
      console.error('No calendar tokens found for user:', session.user.id);
      return NextResponse.json(
        { error: 'No calendar tokens found' }, 
        { status: 401 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials(userData.googleCalendarTokens);

    // בדיקה אם הטוקן פג תוקף
    const isTokenExpired = userData.googleCalendarTokens.expiry_date < Date.now();
    
    if (isTokenExpired) {
      console.log('Token expired, refreshing...');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        // עדכון הטוקן בפיירבייס
        await db.collection('users').doc(session.user.id).update({
          'googleCalendarTokens': credentials
        });
        oauth2Client.setCredentials(credentials);
        console.log('Token refreshed successfully');
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh token' }, 
          { status: 401 }
        );
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log(`Fetching events for calendar: ${calendarId}`);
    const response = await calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 24*60*60*1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    } as calendar_v3.Params$Resource$Events$List);

    console.log(`Events found for calendar ${calendarId}:`, {
      count: response.data?.items?.length
    });

    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Calendar API error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response?.data
    });
    
    // אם זו שגיאת הרשאה, ננסה לנקות את הטוקן ולהחזיר שגיאה מתאימה
    if (error.code === 401 || error.message?.includes('auth')) {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await db.collection('users').doc(session.user.id).update({
          googleCalendarConnected: false,
          googleCalendarTokens: null
        });
      }
      return NextResponse.json(
        { error: 'Calendar authorization expired. Please reconnect your calendar.' }, 
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' }, 
      { status: error.code === 401 ? 401 : 500 }
    );
  }
} 