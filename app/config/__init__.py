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
    SECRET_KEY = os.environ.get("SECRET_KEY", "Change me")
    SERVICE_NAME = os.environ.get("SERVICE_NAME", "Civil Legal Advice Helpline")
    SERVICE_PHASE = os.environ.get("SERVICE_PHASE", "Alpha")
    SERVICE_URL = os.environ.get("SERVICE_URL", "")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = (
        os.environ.get("SESSION_COOKIE_SECURE", "true").lower() == "true"
    )
