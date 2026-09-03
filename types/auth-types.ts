export interface SilasSessionAuth {
  accessToken: string;
  idToken?: string;
  expiresAt: number;
  oboAccessToken?: string;
  oboExpiresAt?: number;
  refreshToken?: string;
  scopes?: string[];
  email: string;
  name:string;
}

export interface SilasUserInfo {
  email: string;
  name: string;
  oid?: string;
  roles?: string[];
  providerId?: number;
}

export interface AccessTokenClaims {
  iss?: string;
  aud?: string;
  scp?: string;
  name:string,
  USER_EMAIL:string,
  preferred_username?: string;
  oid?: string;
  [key: string]: unknown;
}