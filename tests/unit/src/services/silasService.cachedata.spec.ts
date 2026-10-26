import { randomUUID } from "node:crypto";

interface CachedMsalBlobArgs {
  clientId: string;
  scopes: string[];
}

interface CachedMsalBlobReturn {
  homeAccountId: string;
  serializedCache: string;
}

/**
 * Acts as a dummy redis cache data for the silas service
 * @param {CachedMsalBlobArgs} args - clientId and scopes
 * @returns {CachedMsalBlobReturn} - The homeAccountId and serialized cache
 */
export function createCachedMsalBlob(
  args: CachedMsalBlobArgs,
): CachedMsalBlobReturn {
  const { clientId, scopes } = args;
  const uid = randomUUID();
  const tenantId = randomUUID();
  const homeAccountId = `${uid}.${tenantId}`;
  const environment = "login.microsoftonline.com";
  const nowInSeconds = Math.floor(Date.now() / 1_000);
  const scopeTarget = [...scopes].sort().join(" ").toLowerCase();

  const account = {
    home_account_id: homeAccountId,
    environment,
    realm: tenantId,
    local_account_id: uid,
    username: "cache-test@example.invalid",
    authority_type: "MSSTS",
    name: "Cache Test User",
  };

  const accessToken = {
    home_account_id: homeAccountId,
    environment,
    credential_type: "AccessToken",
    client_id: clientId,
    realm: tenantId,
    target: scopeTarget,
    token_type: "Bearer",
    secret: "not-a-real-access-token",
    cached_at: String(nowInSeconds),
    expires_on: String(nowInSeconds + 3_600),
    extended_expires_on: String(nowInSeconds + 7_200),
  };

  return {
    homeAccountId,
    serializedCache: JSON.stringify({
      Account: {
        [`${homeAccountId}-${environment}-${tenantId}`]: account,
      },
      AccessToken: {
        [`${homeAccountId}-${environment}-accesstoken-${clientId}-${tenantId}-${scopeTarget}`]:
          accessToken,
      },
      RefreshToken: {},
      IdToken: {},
      AppMetadata: {},
    }),
  };
}
