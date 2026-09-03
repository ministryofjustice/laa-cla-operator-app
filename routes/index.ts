import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validatePerson } from '#src/middlewares/personSchema.js';
import { getPerson, postPerson } from '#src/controllers/personController.js';
import { exampleApiService } from '#src/services/exampleApiService.js';
import { callbackAction, loginAction } from '#src/controllers/silasController.js';
import { requireAuth } from '#src/middleware/apiMiddleware.js';


// Create a new router
const router = express.Router();
const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;
const FIRST_ITEM_INDEX = 0;


// 1. Trigger Login
router.get('/sign-in', async (req, res) => {
	return res.render("main/auth/sign-in.njk")
});
router.get('/login', loginAction);

// 2. Handle Callback
router.get('/redirect', callbackAction);


async function getCases(accessToken: string): Promise<unknown> {
	
	
	const CASES_API_URL = `http://localhost:8010/call_centre/api/v1/case/?dashboard=1`;

	

	const response = await fetch(CASES_API_URL, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
		},
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Cases API request failed with status ${response.status}: ${body}`);
	}

	return response.json();
}

router.get('/cases', async (req, res) => {
	if (!req.session.silasAuth) {
		console.error("No session data found for user");
		return res.status(401).send("Unauthorized");
	}

	const { accessToken, idToken } = req.session.silasAuth;

	if (!accessToken || !idToken) {
		console.error("Missing access token or ID token in session");
		return res.status(401).send("Unauthorized");
	}

	try {
		const cases = await getCases(accessToken);
		return res.status(SUCCESSFUL_REQUEST).json(cases);
	} catch (error) {
		console.error("Failed to fetch cases:", error instanceof Error ? error.message : String(error));
		return res.status(UNSUCCESSFUL_REQUEST).send("Failed to fetch cases");
	}
});



/* GET home page. */
router.get('/', function (req: Request, res: Response): void {
	if (!req.session.silasAuth) {
		return res.redirect("/sign-in")
	}
	return res.redirect('/receive-call');
});

router.get('/privacy', function (req: Request, res: Response): void {
	res.render('main/privacy.njk');
});

// GET users from external API using BaseApiService pattern
router.get('/users', async function (req: Request, res: Response, next: NextFunction) {
	try {
		// Use the BaseApiService - returns raw axios response (no domain transformation)
		const response = await exampleApiService.getUsers(req.axiosMiddleware, {
			_page: typeof req.query.page === 'string' ? req.query.page : '1',
			_limit: typeof req.query.limit === 'string' ? req.query.limit : '10'
		});

		// Template users add their own response handling here
		res.json(response.data);
	} catch (error) {
		next(error);
	}
});

// GET single user by ID (demonstrates BaseApiService pattern)
router.get('/users/:id', async function (req: Request, res: Response, next: NextFunction) {
	try {
		const userId = Array.isArray(req.params.id) ? req.params.id[FIRST_ITEM_INDEX] : req.params.id;
		const response = await exampleApiService.getUserById(req.axiosMiddleware, userId);

		// Template users add their own response handling here
		res.json(response.data);
	} catch (error) {
		next(error);
	}
});

// liveness and readiness probes for Helm deployments
router.get('/status', function (req: Request, res: Response): void {
	res.status(SUCCESSFUL_REQUEST).send('OK');
});

router.get('/health', function (req: Request, res: Response): void {
	res.status(SUCCESSFUL_REQUEST).send('Healthy');
});

router.get('/error', function (req: Request, res: Response): void {
	// Simulate an error
	res.set('X-Error-Tag', 'TEST_500_ALERT').status(UNSUCCESSFUL_REQUEST).send('Internal Server Error');
});

// GET endpoint to render the person change form
router.get('/change/person', getPerson);

router.post('/change/person', validatePerson(), postPerson);


export default router;
