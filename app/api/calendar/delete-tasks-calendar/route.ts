import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase/admin';

export async function DELETE(request: Request) {
  try {
    const { calendarId } = await request.json();
    
    // אימות המשתמש
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // קבלת נתוני המשתמש מ-Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData?.googleCalendarTokens) {
      return NextResponse.json({ error: 'No calendar tokens found' }, { status: 401 });
    }

    // יצירת OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials(userData.googleCalendarTokens);

    // בדיקה אם הטוקן פג תוקף
    const isTokenExpired = userData.googleCalendarTokens.expiry_date < Date.now();
    
    if (isTokenExpired) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await db.collection('users').doc(userId).update({
          googleCalendarTokens: credentials
        });
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // מחיקת היומן
    await calendar.calendars.delete({
      calendarId: calendarId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar' },
      { status: 500 }
    );
  }
} 