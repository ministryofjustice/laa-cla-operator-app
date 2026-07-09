import os
from dotenv import load_dotenv

# Allows .env to be used in project for local development.
load_dotenv()


class Config(object):
    ENVIRONMENT = os.environ.get(
        "CLAH_ENVIRONMENT", os.environ.get("CLAH_ENVIRONMENT", "production")
    )
    CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "")
    CONTACT_PHONE = os.environ.get("CONTACT_PHONE", "")
    DEPARTMENT_NAME = os.environ.get("DEPARTMENT_NAME", "Justice Digital")
    DEPARTMENT_URL = os.environ.get("DEPARTMENT_URL", "https://mojdigital.blog.gov.uk/")
    RATELIMIT_HEADERS_ENABLED = True
    # Functional/Playwright test runs fire requests faster than the default
    # "2 per second" limit allows, tripping 429s unrelated to the page under
    # test. Set RATELIMIT_ENABLED=false when running the server for those tests.
    RATELIMIT_ENABLED = os.environ.get("RATELIMIT_ENABLED", "true").lower() == "true"
    SECRET_KEY = os.environ.get("SECRET_KEY", "Change me")
    SERVICE_NAME = os.environ.get("SERVICE_NAME", "Assess and refer for civil legal advice")
    SERVICE_PHASE = os.environ.get("SERVICE_PHASE", "Alpha")
    SERVICE_URL = os.environ.get("SERVICE_URL", "")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = (
        os.environ.get("SESSION_COOKIE_SECURE", "true").lower() == "true"
    )
