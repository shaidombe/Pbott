import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json();
    console.log('Received code in API:', !!code);
    console.log('Redirect URI:', redirectUri);

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Authorization code and redirect URI are required' },
        { status: 400 }
      );
    }

    // Get the base URL and ensure HTTPS in production
    const host = request.headers.get('host') || '';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    
    console.log('Using redirect URI:', `${baseUrl}/auth/calendar-callback`);
    console.log('Client ID exists:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('Got tokens from Google:', !!tokens);

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Store tokens in the client credentials
      oauth2Client.setCredentials(tokens);
      
      // Return success with the tokens
      return NextResponse.json({ 
        success: true,
        tokens 
      });

    } catch (error: any) {
      console.error('Google OAuth error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to exchange authorization code for tokens',
          details: error.message 
        },
        { status: 401 }
      );
    }

  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 