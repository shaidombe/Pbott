import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db, adminAuth } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');

    // Get Firebase token from request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the Firebase token
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Verified token for user:', decodedToken.uid);

      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) {
        console.error('No user document found for uid:', decodedToken.uid);
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      const userData = userDoc.data();
      
      if (!userData?.googleCalendarTokens) {
        console.error('No Google Calendar tokens found for user:', decodedToken.uid);
        return NextResponse.json({ error: 'No calendar tokens found' }, { status: 401 });
      }

      // Initialize Google Calendar client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials(userData.googleCalendarTokens);

      // Check if token is expired
      const isTokenExpired = userData.googleCalendarTokens.expiry_date < Date.now();
      
      if (isTokenExpired) {
        console.log('Token expired, refreshing...');
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          await db.collection('users').doc(decodedToken.uid).update({
            googleCalendarTokens: credentials
          });
          oauth2Client.setCredentials(credentials);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
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
      });

      return NextResponse.json(response.data);
      
    } catch (error) {
      console.error('Calendar events error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 