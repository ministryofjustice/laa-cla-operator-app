import os
from dotenv import load_dotenv

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
    SERVICE_NAME = os.environ.get(
        "SERVICE_NAME", "Assess and refer for civil legal advice"
    )
    SERVICE_PHASE = os.environ.get("SERVICE_PHASE", "Beta")
    SERVICE_URL = os.environ.get("SERVICE_URL", "")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = (
        os.environ.get("SESSION_COOKIE_SECURE", "true").lower() == "true"
    )
    ENTRA_CLIENT_ID = os.getenv("ENTRA_CLIENT_ID")
    ENTRA_CLIENT_SECRET = os.getenv("ENTRA_CLIENT_SECRET")
    ENTRA_TENANT_ID = os.getenv("ENTRA_TENANT_ID")
    ENTRA_SCOPE = os.getenv("ENTRA_SCOPE")
    ENTRA_EXPECTED_AUDIENCE = os.getenv("ENTRA_TOKEN_EXPECTED_AUDIENCE")
    ENTRA_AUTHORITY = os.getenv("ENTRA_AUTHORITY")
    ENTRA_REDIRECT_PATH = os.getenv("ENTRA_REDIRECT_PATH")
