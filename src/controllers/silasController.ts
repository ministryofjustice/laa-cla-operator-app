import { randomUUID } from "node:crypto";

import type { ConfidentialClientApplication } from "@azure/msal-node";
import type { Request, Response } from "express";

import config from "#config.js";
import { SilasService } from "#src/services/api/silasService.js";
import {
  destroySession,
  regenerateSession,
  saveSession,
} from "#src/helpers/session.js";
import { EMPTY_LENGTH, INTERNAL_SERVER_ERROR } from "#src/constants.js";

const EPHEMERAL_SUFFIX =
  "laa-cla-operator-app.cloud-platform.service.justice.gov.uk";

/**
 * Get a querystring as a string
 * @param {Request} request - The express request
 * @param {string} key - Which querystring to get
 * @returns {string | undefined} - The querysyting value
 */
function getQueryStringAsString(
  request: Request,
  key: string,
): string | undefined {
  // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- direct access is much cleaner here
  const value = request.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Redirects user to main uat if they are on a ephemeral environment for silas authentication
 * @param {"login" | "redirect"} action - The action under which this function is being called under
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @returns {boolean} - Returns true if the user was redirected
 */
export async function processUATRedirect(
  action: "login" | "redirect",
  req: Request,
  res: Response,
): Promise<boolean> {
  if (action === "login") {
    const returnTo = getQueryStringAsString(req, "return_to");
    if (config.app.environment.toLowerCase() === "ephemeral") {
      if (config.SERVICE_URL !== undefined) {
        const nonce = randomUUID();
        req.session.auth_nonce = nonce;
        await saveSession(req);
        // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Direct property access is clearer here
        const domain = new URL(config.silas.redirectUri).origin;
        const redirect = `${domain}/login?return_to=https://${config.SERVICE_URL}/redirect&nonce=${nonce}`;
        res.redirect(redirect);
        return true;
      }
    } else if (
      config.app.environment.toLowerCase() === "uat" &&
      returnTo !== undefined
    ) {
      // limit redirects those on our namespace
      // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- direct access is much cleaner here
      const returnToDomain = new URL(returnTo).origin;
      if (!returnToDomain.endsWith(EPHEMERAL_SUFFIX)) {
        throw new Error(
          `Return to does not belong to our namespace: ${returnTo}`,
        );
      }

      if (req.query.nonce !== undefined) {
        req.session.auth_nonce = getQueryStringAsString(req, "nonce");
      }
      req.session.return_to = returnTo;
      await saveSession(req);
      return false;
    }
  } else if (
    config.app.environment.toLocaleLowerCase() === "uat" &&
    req.session.return_to !== undefined
  ) {
    const queryString = new URLSearchParams(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- query parameters will be a single value here
      req.query as Record<string, string>,
    ).toString();
    const redirect = `${req.session.return_to}?${queryString}`;
    console.log("Redirect is ", redirect);
    res.redirect(redirect);
    return true;
  }
  return false;
}

/**
 * Handles the initial SILAS login request and redirects the user to Microsoft.
 *
 * @param {Request} req Express request containing the authenticated session.
 * @param {Response} res Express response used to redirect the user.
 * @returns {Promise<void>} A promise that resolves after the redirect.
 */
export async function loginAction(req: Request, res: Response): Promise<void> {
  const userRedirected = await processUATRedirect("login", req, res);
  if (userRedirected) {
    return;
  }
  const authUrl = await SilasService.factory().getAuthCodeUrl(req);

  res.redirect(authUrl);
}

/**
 * Sends an authentication failure response.
 *
 * @param {Response} res Express response used to send the failure status.
 * @returns {void} Sends the authentication failure response.
 */
function sendAuthenticationFailure(res: Response): void {
  res.status(INTERNAL_SERVER_ERROR).send("");
}

/**
 * Determines whether an MSAL authentication response contains
 * the information required to establish a session.
 *
 * @param {Awaited<ReturnType<ConfidentialClientApplication["acquireTokenByCode"]>>} response
 * MSAL authentication response to validate.
 * @returns {boolean} Whether the response contains valid authentication data.
 */
function hasValidAccountResponse(
  response: Awaited<
    ReturnType<ConfidentialClientApplication["acquireTokenByCode"]>
  >,
): response is typeof response & {
  accessToken: string;
  idToken: string;
  account: {
    username: string;
    name: string;
    homeAccountId: string;
  };
} {
  return (
    response.accessToken.length > EMPTY_LENGTH &&
    response.idToken.length > EMPTY_LENGTH &&
    response.account !== null &&
    response.account.username.length > EMPTY_LENGTH &&
    (response.account.name?.length ?? EMPTY_LENGTH) > EMPTY_LENGTH &&
    response.account.homeAccountId.length > EMPTY_LENGTH
  );
}

/**
 * Validate code and state from an entra redirect
 * @param {string} code - The entra code that will be exchange for an access token
 * @param {state} state - The alue that was added to the original lokin request
 * @param {Request} req - Express request object
 * @returns {boolean} - Whether the given values are valid
 */
function validateCodeAndState(
  code: string,
  state: string,
  req: Request,
): boolean {
  if (code.length === EMPTY_LENGTH || state.length === EMPTY_LENGTH) {
    return false;
  }

  if (state !== req.session.auth_nonce) {
    return false;
  }
  return true;
}
/**
 * Handles the OAuth callback from SILAS.
 *
 * @param {Request} req Express request containing the OAuth callback.
 * @param {Response} res Express response used to complete authentication.
 * @returns {Promise<void>} A promise resolving after the response is sent.
 */
export async function callbackAction(
  req: Request,
  res: Response,
): Promise<void> {
  // ON UAT we might need to proxy to an ephemeral environment
  const userRedirected = await processUATRedirect("redirect", req, res);
  if (userRedirected) {
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!validateCodeAndState(code, state, req)) {
    sendAuthenticationFailure(res);
    return;
  }

  await regenerateSession(req);
  try {
    const service = SilasService.factory(req.session.id);
    const response = await service.acquireTokenByCode(code);
    if (!hasValidAccountResponse(response)) {
      sendAuthenticationFailure(res);
      return;
    }

    const { session } = req;
    session.auth_nonce = undefined;
    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- direct access much clearer
    session.account = response.account;
    session.isAuthenticated = true;

    await saveSession(req);

    res.redirect("/dashboard");
  } catch {
    res.status(INTERNAL_SERVER_ERROR).send("Authentication failed");
  }
}

/**
 * Logs the user out of the local session and redirects them
 * to the SILAS logout endpoint.
 *
 * @param {Request} req Express request containing the authenticated session.
 * @param {Response} res Express response used to redirect the user.
 * @returns {Promise<void>} A promise resolving after logout redirect.
 */
export async function logOut(req: Request, res: Response): Promise<void> {
  try {
    await destroySession(req);
  } catch {
    // Local session cleanup failure should not prevent provider logout.
  }

  res.clearCookie("connect.sid");

  const logoutUrl = new URL(`${config.silas.authority}/oauth2/v2.0/logout`);

  res.redirect(logoutUrl.toString());
}
