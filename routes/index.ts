import express from 'express';
import type { Request, Response } from 'express';
import { validatePerson } from '#src/middlewares/personSchema.js';
import { getPerson, postPerson } from '#src/controllers/personController.js';
import { callbackAction, loginAction, logOut } from '#src/controllers/silasController.js';

// Create a new router
const router = express.Router();

const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;

// 1. Trigger Login
router.get('/sign-in', (req: Request, res: Response): void => {
  res.render('main/auth/sign-in.njk');
});

// Login
router.get('/login', loginAction);

// 2. Handle Callback
router.get('/redirect', callbackAction);

// Log out of the application
router.get('/logout', logOut);

/* GET home page. */
router.get('/', (req: Request, res: Response): void => {
  if (req.session.silasAuth === undefined) {
    res.redirect('/sign-in');
    return;
  }
  res.redirect('/receive-call');
});

router.get('/privacy', (req: Request, res: Response): void => {
  res.render('main/privacy.njk');
});

// Liveness and readiness probes for Helm deployments
router.get('/status', (req: Request, res: Response): void => {
  res.status(SUCCESSFUL_REQUEST).send('OK');
});

router.get('/health', (req: Request, res: Response): void => {
  res.status(SUCCESSFUL_REQUEST).send('Healthy');
});

router.get('/error', (req: Request, res: Response): void => {
  // Simulate an error
  res.set('X-Error-Tag', 'TEST_500_ALERT').status(UNSUCCESSFUL_REQUEST).send('Internal Server Error');
});

// GET endpoint to render the person change form
router.get('/change/person', getPerson);

router.post('/change/person', validatePerson(), postPerson);

export default router;