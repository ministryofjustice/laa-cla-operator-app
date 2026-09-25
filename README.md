# Legal Aid Agency - CLA Operator App

[![Standards Icon]][Standards Link]

![govuk-frontend 5.10.2](https://img.shields.io/badge/govuk--frontend%20version-5.10.2-005EA5?logo=gov.uk&style=flat)

## Get Started

### Prerequisites

- node stable version [26.8.1](https://nodejs.org/en/blog/release/v26.8.1/)
- [Yarn 4.9.2](https://yarnpkg.com/) package manager (see installation instructions below)
- TypeScript 5.8.3

#### Installing Yarn

This project uses Yarn 4.9.2 managed by corepack (built into Node.js 16.10+). To ensure all team members use the same version, follow these installation steps:

1. **Enable corepack (if not already enabled):**

   ```shell
   corepack enable
   ```

2. **Install dependencies:**

   ```shell
   yarn install
   ```

3. **Verify the installation:**

   ```shell
   yarn --version
   # Should output: 4.9.2
   ```

**To Note:**

- Corepack automatically uses the Yarn version specified in the `packageManager` field of `package.json`. No additional setup is required once corepack is enabled
- Corepack is the preferred `yarn` way, to install the package manager, instead of `npm install -g yarn` in your ci/cd pipeline
- `yarn install --immutable` ensures that the lockfile (`yarn.lock`) is not modified during the installation process

### Start the application

#### Set local environment variables

Create your local config file `.env` from the template file:

```shell
cp .env.example .env
```

#### Align to the Node Version specified for this project

If using Node Version Manager (nvm), use the following command to switch to the correct version:

```shell
nvm use
nvm install
```

#### Install dependencies and run application for development

```shell
yarn install
yarn build
yarn dev
```

Then, load http://localhost:3000/ in your browser to access the app.

#### Install dependencies and run application for production

```shell
yarn install
yarn build
yarn start
```

##### Node Version Manager

You may have to tell your local machine to use the latest version of node already installed on your device, before installing and running the application. Use the following command.

```shell
nvm install node
```

##### Running locally with docker

Prerequisites, Docker Desktop

- To build the docker image

  ```shell
  docker build -t your-repo-name:latest .
  ```

- To run the docker image

  ```shell
  docker run -d -p 8888:3000 your-repo-name:latest
  ```

  (The application should be running at http://localhost:8888)

- To stop the container

  obtain the container id

  ```shell
  docker ps
  ```

  stop the container

  ```shell
  docker stop {container_id}
  ```

### Run end-to-end tests locally

Run just the unit tests with:

```shell
yarn test:unit
```

Run the full test suite, including unit tests and end-to-end tests, with:

```shell
yarn test
```

To run only the end-to-end tests, build the application first because the test server starts the built application from `public/app.js`:

```shell
yarn build
```

Install the Playwright Chromium browser once if it is not already installed:

```shell
yarn playwright install chromium
```

Run the end-to-end suite:

```shell
yarn test:e2e
```

Playwright starts the application on `http://localhost:3001` with MSW intercepting backend requests, then shuts the server down when the tests finish. You do not need to start `yarn dev` separately. The HTML test report is generated after the run; open it with `yarn playwright show-report`.

### GitHub Actions

The workflows in `.github/workflows` automate validation, security checks, container
builds, deployments, and documentation publishing:

- `feature-branch.yml` runs for pushes and pull requests on non-`main` branches. It
  runs the unit and end-to-end tests, lint checks, builds and pushes a Docker image to
  ECR, scans the image with Snyk, and deploys an ephemeral UAT environment for the
  branch. The ephemeral environment is removed when the pull request is closed by
  `cleanup-release.yml`.
- `main-branch.yml` runs when changes are pushed to `main`. It runs the tests, lint,
  static analysis, and dependency integrity checks before building and scanning the
  Docker image. A successful image is deployed sequentially to UAT, staging, and
  production.
- `commit.yml` validates pull request commit messages and metadata against the MoJ
  DevSecOps commit standards.
- `dependency-review.yml` reviews dependency changes on pull requests and fails for
  critical-severity vulnerabilities.

The following reusable workflows are called by the branch pipelines:

- `test.yml` runs unit tests with coverage and Playwright end-to-end tests, uploading
  both reports as workflow artifacts.
- `lint.yml` runs ESLint.
- `static-analysis.yml` verifies dependency and lockfile integrity. It is invoked by
  the `main` pipeline. TODO: configure the Sonar and Gitleaks checks in this workflow.
- `build.yml` builds and pushes a SHA-tagged Docker image to the configured AWS ECR
  repository.
- `deploy.yml` deploys an image to a Cloud Platform Kubernetes environment using the
  repository's Helm chart.
- `deploy-ephemeral.yml` creates a branch-specific Kubernetes deployment and URL for
  previewing a pull request.
### Formatting and linting

This repo enforces formatting and linting as part of CI.

- Local autofix: `yarn lint` runs ESLint with `--fix`
- Local formatting: `yarn format` runs Prettier with `--write`
- CI check: `yarn format:check` runs Prettier in check mode only
- CI lint: `yarn eslint .` checks the code without modifying files

Use `yarn format` and `yarn lint` locally to fix issues before pushing. CI will fail on formatting or lint errors instead of rewriting files. These should be fixed locally.

### Pre-commit checks

This repo uses Husky and `lint-staged` to format and lint code before each commit.

1. Install hooks:

   ```shell
   yarn install
   yarn prepare
   ```

2. On commit, staged `*.js` and `*.ts` files are automatically checked with:

   ```shell
   prettier --write
   eslint
   ```

3. Prettier applies formatting fixes. ESLint reports lint errors without modifying files and prevents the commit until they are fixed.

### Secret detection

Gitleaks runs through the MoJ DevSecOps pre-commit hook. Install [prek](https://github.com/j178/prek), then enable and run the hook:

```shell
prek install
prek run
```

### Licence

[Licence](./LICENSE)

[Standards Link]: https://operations-engineering-reports.cloud-platform.service.justice.gov.uk/repository-standards/laa-cla-operator-app

[![Standards Icon](https://github-community.service.justice.gov.uk/repository-standards/api/laa-cla-operator-app/badge)](https://github-community.service.justice.gov.uk/repository-standards/laa-cla-operator-app)
