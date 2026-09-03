import { randomBytes } from 'node:crypto';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validatePerson } from '#src/middlewares/personSchema.js';
import { getPerson, postPerson } from '#src/controllers/personController.js';
import { exampleApiService } from '#src/services/exampleApiService.js';
import { ConfidentialClientApplication } from '@azure/msal-node';
import config from '#config.js'
import type { AccessTokenClaims } from '#types/auth-types.js';
import { request } from 'node:http';
import { loginAction } from '#src/controllers/silasController.js';


function decodeToken(token:string): AccessTokenClaims {
	//decode the JWT Token 
	const parts = token.split('.')

	if (parts.length !== 3) {
		throw new Error('Silas Token failed to decode, not 3 parts')
	}

	try {
    const payloadBuffer = Buffer.from(parts[1], 'base64url');
    const payload = JSON.parse(payloadBuffer.toString('utf8')) as AccessTokenClaims;
    return payload;
  } catch (error) {
    throw new Error(`Failed to decode SILAS access token claims: ${error instanceof Error ? error.message : String(error)}`);
  }


}

const OIDC_SCOPES = new Set(['openid', 'profile', 'offline_access']);

function normalizeScope(scope: string): string {
  if (!scope.includes('/')) {
    return scope;
  }
  const segments = scope.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? scope;
}

function validateAccessTokenClaims(claims: AccessTokenClaims): void {

	const expectedIss =  `https://login.microsoftonline.com/${config.silas.tenantId}/v2.0`;
  	if (claims.iss !== expectedIss) {
    	throw new Error(`Unexpected SILAS token issuer. Expected '${expectedIss}', got '${claims.iss ?? 'undefined'}'`);
  	}

  if (claims.aud !== config.silas.expectedAudience) {
    throw new Error(`Unexpected SILAS token audience. Expected '${config.silas.expectedAudience}', got '${claims.aud ?? 'undefined'}'`);
  }

  const configuredApiScopes = config.silas.scopes
    .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
    .map(normalizeScope);

  if (configuredApiScopes.length === 0) {
    return;
  }

    if (configuredApiScopes.length === 0) {
    return;
  }

  const tokenScopeValues = typeof claims.scp === 'string'
    ? claims.scp.split(' ').map((scope) => scope.trim()).filter(Boolean)
    : [];

  const hasConfiguredScope = configuredApiScopes.some((scope) => tokenScopeValues.includes(scope));

  if (!hasConfiguredScope) {
    throw new Error(
      `SILAS token missing expected delegated scope. Expected one of: ${configuredApiScopes.join(', ')}`
    );
  }

}


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
router.get('/login', loginAction);

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

		const payload = decodeToken(response.accessToken)
		validateAccessTokenClaims(payload);

		console.log("Response from Entra:", response);
		
		req.session.silasAuth = {
			accessToken: response.accessToken,
			idToken: response.idToken,
			expiresAt: response.expiresOn?.getTime() ?? Date.now() + (30 * 60 * 1000),
			email: payload.USER_EMAIL,
			name: payload.name
		};

		req.session.user = {
			email: response.account.username,
			name: response.account.name,
			oid: response.account.homeAccountId,
		};

		console.log("SILAS AUTH:", req.session.silasAuth);

		// decode the tome
		req.session.save((saveErr) => {
			if (saveErr !== null && saveErr !== undefined) {
				console.error("Session save failed: ", saveErr instanceof Error ? saveErr.message : String(saveErr));
				return;
			}
			return res.redirect('/receive-call');
		});
	});
    } catch (error) {
		console.log("This has run")
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
	//making an call to the api


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
