import type { Request, Response } from 'express';
import express from 'express';
import chalk from 'chalk';
import morgan from 'morgan';
import compression from 'compression';
import { setupCsrf, setupMiddlewares, setupConfig, setupLocaleMiddleware, setupGlobalErrorHandler } from '#middleware/index.js';
import session from 'express-session';
import { nunjucksSetup, rateLimitSetUp, helmetSetup, displayAsciiBanner } from '#utils/index.js';
import { initializeI18nextSync } from '#src/scripts/helpers/index.js';
import config from '#config.js';
import indexRouter from '#routes/index.js';
import livereload from 'connect-livereload';
import { Forge } from '@ministryofjustice/hmpps-forge/core'
import type { Deps } from './journeys/api.js'
import { apiService } from './services/api/index.js';
import { govukComponents } from '@ministryofjustice/hmpps-forge/govuk-components'
import { createExpressRouter } from '@ministryofjustice/hmpps-forge/express-nunjucks'
import journeyPackages from './journeys/index.js';
import { buildSessionConfig } from '#utils/session.js';
import { axiosMiddleware, setAuthStatus } from './middleware/apiMiddleware.js';

const TRUST_FIRST_PROXY = 1;
/**
 * Creates and configures an Express application.
 * Then starts the server listening on the configured port.
 *
 * @returns {import('express').Application} The configured Express application
 */
const createApp = (): express.Application => {
	// Initialise i18next synchronously before setting up the app
	initializeI18nextSync();

	const app = express();

	// Set up common middleware for handling cookies, body parsing, etc.
	setupMiddlewares(app);

	// Set up cookie security for sessions
	app.set('trust proxy', TRUST_FIRST_PROXY);
	app.use(session(buildSessionConfig(config)));

	app.use(axiosMiddleware);

	// Response compression setup
	app.use(compression({
		/**
		 * Custom filter for compression.
		 * Prevents compression if the 'x-no-compression' header is set in the request.
		 *
		 * @param {import('express').Request} req - The Express request object
		 * @param {import('express').Response} res - The Express response object
		 * @returns {boolean} True if compression should be applied, false otherwise
		 */
		filter: (req: Request, res: Response): boolean => {
			if ('x-no-compression' in req.headers) {
				return false;
			}
			return compression.filter(req, res);
		}
	}));

	// Set up security headers
	helmetSetup(app);

	// Reducing fingerprinting by removing the 'x-powered-by' header
	app.disable('x-powered-by');

	app.use(setAuthStatus);

	// Set up Cross-Site Request Forgery (CSRF) protection
	setupCsrf(app);

	// Set up locale middleware for internationalization
	app.use(setupLocaleMiddleware);

	// Set up rate limiting
	rateLimitSetUp(app, config);

	  // Set up application-specific configurations
	  setupConfig(app);
	  
	  // Set up request logging based on environment
	  if (process.env.NODE_ENV === 'production') {
		  // Use combined format for production (more structured, less verbose)
		  app.use(morgan('combined'));
		} else {
			// Use dev format for development (colored, more readable)
			app.use(morgan('dev'));
		}
		
	// Register the main router
	app.use('/', indexRouter);

	// Enable live-reload middleware in development mode
	if (process.env.NODE_ENV === 'development') {
		app.use(livereload());
	}

	// Display ASCII Art banner
	displayAsciiBanner(config);

	// Set up Nunjucks as the template engine
	const nunjucksEnv = nunjucksSetup(app);

	const forge = new Forge({})
	  .registerGlobalComponents(govukComponents)

	// Everytime a new journey is added to the project,
	// it'll be automatically registered with Forge here.
	const pathLookup: Record<string, string> = {}
	for (const journeyPackage of journeyPackages) {
		const steps = journeyPackage.journey.steps ?? []
		const journeyPath = journeyPackage.journey.path.replace(/^\/+|\/+$/gu, "");
		pathLookup[journeyPackage.journey.code] = journeyPackage.journey.path; // eslint-disable-line @typescript-eslint/prefer-destructuring -- Don't want to introduce `code` and `path` variables here as their use is ambiguous at this point.
		for(const step of  steps) {
			const code = `${journeyPackage.journey.code}.${step.code}`
			const stepPath = step.path.replace(/^\/+|\/+$/gu, "");
			pathLookup[code] = `/${journeyPath}/${stepPath}`;
		}
		forge.registerPackage<Deps>(journeyPackage, {
			caseApi: apiService
		});
	}

	/**
	 * Create a function to go from forge code to path
	 *
	 * @param {string} code - The full forge code, if it's a step then include the parent journey code separated by a dot i.e <journey.code>.<step.code>
	 * @returns {string} path - The forge path
	 */
	app.locals.forgeReverse = (code: string): string => {
		if(!(code in pathLookup)) {
			throw new Error(`Could not find path for ${code}`)
		}
		return pathLookup[code]
	}

	app.use(express.urlencoded({ extended: true }));
	app.use('/', createExpressRouter(forge, { nunjucksEnv }));

	// Register last to catch errors from routes, controllers, and services.
	setupGlobalErrorHandler(app);


	// Starts the Express server on the specified port
	app.listen(config.app.port, () => {
		console.log(chalk.yellow(`Listening on port ${config.app.port}...`));
	});

	return app;
};

// Self-execute the app directly to allow app.js to be executed directly
createApp();

// Export the createApp function for testing/import purposes
export default createApp;