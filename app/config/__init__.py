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
    ENTRA_CLIENT_ID = os.getenv("CLIENT_ID")
    ENTRA_CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    ENTRA_AUTHORITY = os.getenv("AUTHORITY")
    ENTRA_REDIRECT_PATH = os.getenv("REDIRECT_PATH")
    ENTRA_ENDPOINT = os.getenv("ENDPOINT")
    ENTRA_SCOPE = os.getenv("SCOPE")
    ENTRA_SESSION_TYPE = os.getenv("SESSION_TYPE")
    ENTRA_TENANT_ID = os.getenv("TENANT_ID")
    ENTRA_EXPECTED_AUDIENCE = os.getenv("EXPECTED_AUDIENCE")
