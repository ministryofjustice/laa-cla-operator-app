import express from "express";
import type { Request, Response } from "express";
import {
  callbackAction,
  loginAction,
  logOut,
} from "#src/controllers/silasController.js";

// Create a new router
const router = express.Router();

const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const AUTH_SESSION_TTL_MS =
  MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

/**
 * Returns a safe relative redirect path for test login flows.
 * Falls back to /receive-call when the input is not a local path.
 *
 * @param {unknown} next Potential next path from query string.
 * @returns {string} A safe relative path.
 */
const getSafeRelativeNextPath = (next: unknown): string => {
  if (typeof next !== "string") {
    return "/receive-call";
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/receive-call";
  }

  return next;
};

// 1. Trigger Login
router.get("/sign-in", (req: Request, res: Response): void => {
  res.render("main/auth/sign-in.njk");
});

// Login
router.get("/login", loginAction);

// 2. Handle Callback
router.get("/redirect", callbackAction);

// Log out of the application
router.get("/logout", logOut);

// Test-only helper route to seed an authenticated session for E2E tests.
if (process.env.NODE_ENV === "test") {
  router.get("/test-auth/login", (req: Request, res: Response): void => {
    const next = getSafeRelativeNextPath(req.query.next);

    req.session.silasAuth = {
      accessToken: "test-access-token",
      expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
      email: "test.user@justice.gov.uk",
      name: "Test User",
    };

    req.session.user = {
      email: "test.user@justice.gov.uk",
      name: "Test User",
    };

    res.redirect(next);
  });
}

/* GET home page. */
router.get("/", (req: Request, res: Response): void => {
  if (req.session.silasAuth === undefined) {
    res.redirect("/sign-in");
    return;
  }
  res.redirect("/receive-call");
});

router.get("/privacy", (req: Request, res: Response): void => {
  res.render("main/privacy.njk");
});

//Cookies page
router.get("/cookies", function (req: Request, res: Response): void {
  res.render("main/cookies.njk");
});

// Liveness and readiness probes for Helm deployments
router.get("/status", (req: Request, res: Response): void => {
  res.status(SUCCESSFUL_REQUEST).send("OK");
});

router.get("/health", (req: Request, res: Response): void => {
  res.status(SUCCESSFUL_REQUEST).send("Healthy");
});

router.get("/error", (req: Request, res: Response): void => {
  // Simulate an error
  res
    .set("X-Error-Tag", "TEST_500_ALERT")
    .status(UNSUCCESSFUL_REQUEST)
    .send("Internal Server Error");
});

export default router;
