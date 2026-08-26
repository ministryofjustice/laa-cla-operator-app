from flask import (
    render_template,
    redirect,
    url_for,
    make_response,
    request,
    session,
    flash,
)
from app import cache
from urllib.parse import urlencode
import requests
import logging
from cryptography import x509
import jwt
from datetime import datetime, timezone
from functools import wraps
from app.config import Config
from app.authenication.constants import ROLES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EntraLogin:
    def __init__(self):
        self.authority = Config.ENTRA_AUTHORITY + Config.ENTRA_TENANT_ID
        self.client_id = Config.ENTRA_CLIENT_ID
        self.redirect_uri = Config.ENTRA_REDIRECT_PATH
        self.scope = Config.ENTRA_SCOPE
        self.client_secret = Config.ENTRA_CLIENT_SECRET
        self.tenant_id = Config.ENTRA_TENANT_ID
        self.audience = Config.ENTRA_EXPECTED_AUDIENCE
        self.issuer = f"https://login.microsoftonline.com/{Config.ENTRA_TENANT_ID}/v2.0"

    def _fetch_public_keys(self):
        cache_key = "microsoft_keys"

        cached_keys = cache.get(cache_key)

        if cached_keys is not None:
            logging.info("Microsoft public keys cache hit, no need for new request")
            return cached_keys

        url = "https://login.microsoftonline.com/common/discovery/v2.0/keys"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        keys = response.json()

        cache.set(cache_key, keys, timeout=86400)

        return keys

    def get_public_key(self, token):
        keys = self._fetch_public_keys()["keys"]

        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        key_data = next((key for key in keys if key.get("kid") == kid), None)

        if key_data is None:
            cache.delete("microsoft_keys")
            keys = self._fetch_public_keys()["keys"]

            key_data = next((key for key in keys if key.get("kid") == kid), None)

        if key_data is None:
            return None

        return key_data["x5c"][0]

    def decode(self, token):
        public_key = self.get_public_key(token)

        if not public_key:
            return None

        cert_str = (
            f"-----BEGIN CERTIFICATE-----\n{public_key}\n-----END CERTIFICATE-----"
        )

        cert_obj = x509.load_pem_x509_certificate(cert_str.encode("utf-8"))

        public_key = cert_obj.public_key()

        return jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=self.audience,
            issuer=self.issuer,
        )

    def validate_token(self, token=None):
        if not token:
            return None, False

        try:
            decoded_token = self.decode(token)

            now = int(datetime.now(timezone.utc).timestamp())

            # 1. Check expiration
            exp = decoded_token.get("exp")
            if exp is not None and now > exp:
                raise ValueError("Token has expired")

            # 2. Check role
            roles = decoded_token.get("APP_ROLES", [])

            if isinstance(roles, str):
                roles = [roles]

            if len(roles) != 1:
                raise ValueError(f"Token must contain exactly one role, got: {roles}")

            role = roles[0]

            # Get configuration for the role
            role_config = ROLES.get(role)
            if role_config is None:
                raise ValueError(f"Role not in scope: {role}")

            # 3. Check office codes
            raw_accounts = decoded_token.get("LAA_ACCOUNTS", [])

            if isinstance(raw_accounts, list):
                office_codes = raw_accounts
            else:
                office_codes = [raw_accounts]

            if not office_codes or office_codes == [None]:
                raise ValueError("No office codes found in token")

            # 4. Check username
            username = decoded_token.get("preferred_username")
            if not username:
                raise ValueError("Username not found in token")

            # 5. Build user details
            user = {
                "username": username,
                "roles": role,
                "is_manager": role_config.get("is_manager", False),
                "office_codes": office_codes,
            }

            # 6. Set user details
            session["user"] = user

            # 7. Return user
            return user, True

        except Exception as e:
            logging.info("Failed to validate token: %s", e)
            return None, e

    def login(self):
        """
        The page provides a link that redirects the user to the
        Microsoft Entra ID login page for authentication.

        Returns:
            Rendered login page, or redirects the user after a
            successful authentication.
        """

        token = request.cookies.get("token")

        if token:
            user, e = self.validate_token(token)
            if user:
                return redirect(url_for("search_client"))
            else:
                flash(f"Login failed: {e}", "error")
                return render_template("auth/sign_in.html")

        return render_template("auth/sign_in.html")

    def login_entra(self):
        """
        Redirects the user to the Microsoft Entra ID login page
        and attempts to authenticate the user.

        On successful authentication:
            Return the user to the auth pages.

        On authentication failure:
            Display an appropriate error message.
        """
        try:
            params = {
                "client_id": self.client_id,
                "response_type": "code",
                "redirect_uri": self.redirect_uri,
                "response_mode": "query",
                "scope": self.scope,
            }

            auth_url = f"{self.authority}/oauth2/v2.0/authorize?{urlencode(params)}"
            return redirect(auth_url)
        except Exception:
            flash("Fail to obtain config for SILAS login", "error")
            return redirect(url_for("receive_call"))

    def logout(self):
        session.clear()

        post_logout_uri = url_for("sign_in", _external=True)

        params = urlencode({"post_logout_redirect_uri": post_logout_uri})

        logout_url = (
            f"https://login.microsoftonline.com/"
            f"{self.tenant_id}/oauth2/v2.0/logout?{params}"
        )

        response = redirect(logout_url)
        response.delete_cookie("token")

        return response

    def callback(self, payload: dict = {}):
        if not payload:
            return redirect(url_for("sign_in"))

        error = payload.get("args", {}).get("error")
        code = payload.get("args").get("code", {})

        if error or not code:
            logging.error("Entra callback error: %s", error)
            return redirect(url_for("sign_in"))

        try:
            token_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.redirect_uri,
                "scope": self.scope,
            }

            token_url = (
                f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
            )
            response = requests.post(
                token_url,
                data=token_data,
                timeout=30,
            )

            if not response.ok:
                return redirect(url_for("sign_in"))

            response = response.json()
            token = response.get("access_token")

            user, error = self.validate_token(token)
            if not user:
                flash(f"Failed to login user {error}", "error")
                return redirect(url_for("sign_in"))

            response = make_response(redirect(url_for("search_client")))

            """param httponly: Disallow JavaScript access to the cookie."""
            response.set_cookie(
                "token", token, httponly=True, secure=True, samesite="Lax"
            )
            return response

        except Exception:
            flash("Fail to obtain config for SILAS login", "error")
            return redirect(url_for("receive_call"))


class LoginRequired:
    @staticmethod
    def auth_required(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            token = request.cookies.get("token")
            login = EntraLogin()

            if token:
                validate, _ = login.validate_token(token)

                if validate:
                    return func(*args, **kwargs)

            return redirect(url_for("sign_in"))

        return wrapper
