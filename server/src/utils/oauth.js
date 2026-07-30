import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';

const googleClient = config.google.clientId ? new OAuth2Client(config.google.clientId) : null;
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export async function verifyGoogleIdToken(idToken) {
  if (!googleClient) {
    throw new Error('google_not_configured');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  return { sub: payload.sub, email: payload.email, name: payload.name };
}

export async function verifyAppleIdToken(idToken) {
  if (!config.apple.clientId) {
    throw new Error('apple_not_configured');
  }
  const { payload } = await jwtVerify(idToken, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: config.apple.clientId,
  });
  return { sub: payload.sub, email: payload.email ?? null };
}
