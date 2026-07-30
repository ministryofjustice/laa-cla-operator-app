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
    SERVICE_NAME = os.environ.get(
        "SERVICE_NAME", "Assess and refer for civil legal advice"
    )
    SERVICE_PHASE = os.environ.get("SERVICE_PHASE", "Beta")
    SERVICE_URL = os.environ.get("SERVICE_URL", "")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = (
        os.environ.get("SESSION_COOKIE_SECURE", "true").lower() == "true"
    )
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    
    BACKEND_BASE_URI = os.environ.get("BACKEND_BASE_URI", "http://127.0.0.1:8010")

    # Entra auth config
    ENTRA_TENANT_ID = os.environ.get("ENTRA_TENANT_ID", "")
    ENTRA_CLIENT_ID = os.environ.get("ENTRA_CLIENT_ID", "")
    ENTRA_CLIENT_SECRET = os.environ.get("ENTRA_CLIENT_SECRET", "")
    ENTRA_SCOPE = os.environ.get("ENTRA_SCOPE", "openid profile email")
    ENTRA_REDIRECT_PATH = os.environ.get("ENTRA_REDIRECT_PATH", "/auth/entra-callback")
    ENTRA_AUTH_MOCK_ENABLED = (
        os.environ.get("ENTRA_AUTH_MOCK_ENABLED", "false").lower() == "true"
    )
