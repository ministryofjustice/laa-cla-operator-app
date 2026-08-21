from flask import (
    render_template,
    redirect,
    url_for,
    make_response,
    request,
    session,
    flash,
)
from urllib.parse import urlencode
import requests
import logging
from cryptography import x509
import jwt
from datetime import datetime, timezone
from functools import wraps
from app.config import Config
from app.authenication.constants import ROLES


class EntraLogin:
    def __init__(self):
        self.authority = Config.AUTHORITY + Config.TENANT_ID
        self.client_id = Config.CLIENT_ID
        self.redirect_uri = Config.REDIRECT_PATH
        self.scope = Config.SCOPE
        self.client_secret = Config.CLIENT_SECRET
        self.tenant_id = Config.TENANT_ID
        self.audience = Config.EXPECTED_AUDIENCE
        self.issuer = f"https://login.microsoftonline.com/{Config.TENANT_ID}/v2.0"

    def _get_public_key(self):
        url = "https://login.microsoftonline.com/common/discovery/v2.0/keys"
        response = requests.get(url, timeout=10)
        return response.json()

    def get_public_key(self, token):
        keys = self._get_public_key()
        keys = keys["keys"]
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        key_data = next((key for key in keys if key.get("kid") == kid), None)
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
            return
        try:
            decoded_token = self.decode(token)

            now = int(datetime.now(timezone.utc).timestamp())

            # 1. Check expiration
            exp = decoded_token.get("exp")
            if exp is not None and now > exp:
                return ValueError("Token has expired")

            # 2.  Check role
            role = decoded_token.get("APP_ROLES")
            role_config = ROLES.get(role)

            if not role or not role_config:
                return ValueError("Role not in scope")

            # 3. Check office codes
            raw_accounts = decoded_token.get("LAA_ACCOUNTS", [])
            office_codes = (
                raw_accounts if isinstance(raw_accounts, list) else [raw_accounts]
            )

            if not office_codes:
                return ValueError("Missing office code")

            # 4.  Check username
            username = decoded_token.get("preferred_username")
            if not username:
                return ValueError("Missing username")

            user = {
                "username": username,
                "roles": role,
                "is_manager": role_config.get("is_manager"),
                "office_codes": office_codes,
            }
            # 5 set the user details to be pass on
            session["user"] = user

            # 6 return the user
            return user if user else None

        except Exception:
            return

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
            user = self.validate_token(token)

            if user:
                return redirect(url_for("search_client"))
            else:
                return render_template("auth/sign_in.html")

        return render_template("auth/sign_in.html")

    def login_entra(self):
        """
        Redirects the user to the Microsoft Entra ID login page
        and attempts to authenticate the user.

        On successful authentication:
            Return the user to the dashboard.

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

            user = self.validate_token(token)
            if not user:
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
                validate = login.validate_token(token)

                if validate:
                    return func(*args, **kwargs)

            return redirect(url_for("sign_in"))

        return wrapper
