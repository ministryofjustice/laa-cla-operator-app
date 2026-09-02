export interface SilasSessionAuth {
  accessToken: string;
  idToken?: string;
  expiresAt?: number;
  oboAccessToken?: string;
  oboExpiresAt?: number;
  refreshToken?: string;
  scopes?: string[];
}

export interface SilasUserInfo {
  email: string;
  name?: string;
  oid?: string;
  roles?: string[];
  providerId?: number;
}