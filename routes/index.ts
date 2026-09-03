import { randomBytes } from 'node:crypto';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validatePerson } from '#src/middlewares/personSchema.js';
import { getPerson, postPerson } from '#src/controllers/personController.js';
import { exampleApiService } from '#src/services/exampleApiService.js';

import { ConfidentialClientApplication } from '@azure/msal-node';
import config from '#config.js'



const msalConfig = {
    auth: {
        clientId: config.silas.clientId,
        authority: config.silas.authority,
        clientSecret: config.silas.clientSecret, 
    }
};
const SCOPES = config.silas.scopes
const REDIRECT_URI = config.silas.redirectUri



// Create a new router
const router = express.Router();
const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;
const FIRST_ITEM_INDEX = 0;


// 1. Trigger Login
router.get('/login', async (req, res) => {
	const nonce = randomBytes(32).toString("base64url")
    const authCodeUrlParameters = {
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
		state: nonce,
    };
	req.session.auth_nonce = nonce
	req.session.save()
	const msalClient = new ConfidentialClientApplication(msalConfig);
    // Get the URL to sign the user in and redirect them
	const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(response);
});

// 2. Handle Callback
router.get('/redirect', async (req, res) => {
	const code = typeof req.query.code == "string" ? req.query.code : ""
	const state = typeof req.query.state == "string" ? req.query.state : ""
	console.log("Recieved code", code)
	console.log("Recieved state", state)
	if (!code) {
		console.error("Entra callback - Invalid code")
		return res.status(500).send("")
	}
	if (!state) {
		console.error("Entra callback - Invalid state")
		return res.status(500).send("")
	}
    const tokenRequest = {
        code: code, // The Authorization Code from Entra
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
    };

    try {
		const msalClient = new ConfidentialClientApplication(msalConfig)
        const response = await msalClient.acquireTokenByCode(tokenRequest);

        // Success! We have a token for the user.
        // response.accessToken contains the 'scp' claim.
        console.log("User Token Acquired!");
		req.session.regenerate((regenErr) => {
		if (regenErr !== null && regenErr !== undefined) {
			console.error("Session regeneration failed: ", regenErr instanceof Error ? regenErr.message : String(regenErr));
			return;
		}

		if (!response || !response.accessToken || !response.idToken || !response.account || !response.account.username || !response.account.name || !response.account.homeAccountId) {
			console.error("Entra callback - Invalid response from Entra:", response);
			return res.status(500).send("Invalid response from Entra");
		}

		// console.log("Response from Entra:", response);

		req.session.silasAuth = {
			accessToken: response.accessToken,
			idToken: response.idToken,
		};

		req.session.user = {
			email: response.account.username,
			name: response.account.name,
			oid: response.account.homeAccountId,
		};

		console.log("SILAS AUTH:", req.session.silasAuth);
		req.session.save((saveErr) => {
			if (saveErr !== null && saveErr !== undefined) {
				console.error("Session save failed: ", saveErr instanceof Error ? saveErr.message : String(saveErr));
				return;
			}
			return res.redirect('/receive-call');
		});
	});
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

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

	console.log("Silas Auth Session Data:", req.session.silasAuth.idToken);

	if (!req.session.silasAuth?.accessToken || !req.session.silasAuth?.idToken) {
		console.error("Missing access token or ID token in session");
		return res.status(401).send("Unauthorized");
	}

	console.log("The cases endpoint was called with access token:");
});

// router.get('/test', (req, res) => {
// 	console.log("Session Data:", req.session);
// 	// if (req.session.silasAuth) {
// 	// 	res.json({
// 	// 		accessToken: req.session.silasAuth.accessToken,
// 	// 		idToken: req.session.silasAuth.idToken,
// 	// 	});
// 	// } else {
// 	// 	res.status(404).send('No session data found');
// 	// }
// });


/* GET home page. */
router.get('/', function (req: Request, res: Response): void {
	res.redirect('/receive-call');
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
