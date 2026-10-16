export interface SilasUserInfo {
  email: string;
  name: string;
  homeAccountId: string;
}

export interface AccessTokenClaims {
  iss?: string;
  aud?: string;
  scp?: string;
  name: string;
  USER_EMAIL: string;
  preferred_username?: string;
  oid?: string;
  [key: string]: unknown;
}
