import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import readline from 'readline';

dotenv.config();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_TOKEN_PATH
} = process.env;

// All Google API scopes needed by the project
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
];

/**
 * Shared Google OAuth2 client used by all tools (docs, calendar, etc.).
 * Handles token persistence, auto-refresh, and first-time auth flow.
 */
export async function getGoogleAuth() {
  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  const tokenPath = path.resolve(GOOGLE_TOKEN_PATH || './tokens.json');

  // Listen for token refresh events and persist updated tokens to disk
  oAuth2Client.on('tokens', (tokens) => {
    try {
      const existing = fs.existsSync(tokenPath)
        ? JSON.parse(fs.readFileSync(tokenPath, 'utf8'))
        : {};
      const updated = { ...existing, ...tokens };
      fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2));
      console.log('Tokens refreshed and saved to', tokenPath);
    } catch (err) {
      console.error('Failed to save refreshed tokens:', err);
    }
  });

  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

    if (!token.refresh_token) {
      console.warn('Refresh token missing in token file. Deleting and re-authenticating...');
      fs.unlinkSync(tokenPath);
      return await getGoogleAuth();
    }

    oAuth2Client.setCredentials(token);

    // Proactively refresh if the access token is expired or about to expire (within 5 min)
    const bufferMs = 5 * 60 * 1000;
    const isExpired = token.expiry_date && (Date.now() >= token.expiry_date - bufferMs);

    if (isExpired) {
      console.log('Access token expired or expiring soon, refreshing...');
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        const updated = { ...token, ...credentials };
        fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2));
        console.log('Access token refreshed successfully.');
      } catch (err) {
        console.error('Failed to refresh access token:', err);
        // If refresh fails, delete tokens and re-authenticate
        fs.unlinkSync(tokenPath);
        return await getGoogleAuth();
      }
    }

    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log(' Authorize this app by visiting this URL:\n', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) =>
    rl.question('\n Enter the code from that page here: ', (code) => {
      rl.close();
      resolve(decodeURIComponent(code.trim()));
    })
  );

  const tokenResponse = await oAuth2Client.getToken(code);
  const tokens = tokenResponse.tokens;
  if (!tokens) {
    throw new Error(' Failed to get tokens from code');
  }

  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log(`Tokens stored at ${tokenPath}`);

  return oAuth2Client;
}
