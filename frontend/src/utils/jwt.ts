import { jwtDecode } from 'jwt-decode';

export interface DecodedToken {
  exp: number;
  iat: number;
  user_id?: string;
  username?: string;
  is_demo?: boolean;
  [key: string]: any;
}

export const decodeToken = (token: string): DecodedToken | null => {
  try {
    // Handle demo tokens that might not be valid JWTs (legacy support)
    if (token.startsWith('demo_token_')) {
      return null;
    }
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  // Legacy demo token support - assume valid if it's the simple string
  if (token.startsWith('demo_token_')) {
    return false;
  }

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Date.now() / 1000;
  // Token is expired if current time is past expiration
  // Small 5-second buffer to account for clock skew
  return decoded.exp < currentTime + 5;
};

export const generateMockJwt = (payload: any, expiresInSeconds: number = 1800): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    is_demo: true
  };

  const base64UrlEncode = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(jwtPayload);
  const signature = 'mock_signature_for_demo_purposes_only';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const isDemoToken = (token: string): boolean => {
  if (token.startsWith('demo_token_')) return true;
  const decoded = decodeToken(token);
  return !!decoded?.is_demo;
};
