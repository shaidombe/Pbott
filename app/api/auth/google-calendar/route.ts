import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Credentials } from 'google-auth-library';

export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json();

    console.log('Token exchange request details:', {
      hasCode: !!code,
      hasRedirectUri: !!redirectUri,
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Using provided redirect URI:', redirectUri);
    console.log('Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    try {
      console.log('Attempting to exchange code for tokens...');
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('Got tokens from Google:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      return NextResponse.json({
        token: tokens.access_token,
        success: true
      });

    } catch (tokenError: any) {
      console.error('Token exchange error details:', {
        message: tokenError.message,
        response: tokenError.response?.data,
        code: tokenError.code
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to exchange authorization code for tokens',
          details: tokenError.message,
          googleError: tokenError.response?.data
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('General error in token exchange:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 