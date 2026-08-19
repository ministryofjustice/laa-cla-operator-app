from flask import render_template, redirect, url_for, make_response
from urllib.parse import urlencode
import requests
import logging
from cryptography import x509
import jwt
from app.config import Config
from datetime import datetime, timezone
from constants import ROLES

URLS = []


class EntraLogin:
    def __init__(self):
        self.authority = Config.AUTHORITY + Config.TENANT_ID
        self.client_id = Config.CLIENT_ID
        self.redirect_uri = Config.REDIRECT_PATH
        self.scope = Config.SCOPE
        self.client_secret = Config.CLIENT_SECRET
        self.tennat_id = Config.TENANT_ID
        self.audience = Config.EXPECTED_AUDIENCE
        self.issuer = f"https://login.microsoftonline.com/{Config.TENANT_ID}/v2.0"

        if not all([self.authority, self.client_id, self.redirect_uri, self.scope]):
            raise ValueError("Config is missing for Entra")

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

        try:
            cert_obj = x509.load_pem_x509_certificate(cert_str.encode("utf-8"))

            public_key = cert_obj.public_key()

            return jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.audience,
                issuer=self.issuer,
            )

        except Exception as e:
            print(f"JWT decode failed: {e}")
            return None

    def validate_token(self, token):
        decode_token = self.decode(token)

        time = int(datetime.now(timezone.utc).timestamp())
        exp = decode_token.get("exp", int)

        if exp and time > exp:
            return ValueError("Token has expired")

        roles = decode_token.get("APP_ROLES", [])

        if roles not in ROLES:
            return ValueError("Role not in scope")

    def login(self):
        """
        The page provides a link that redirects the user to the
        Microsoft Entra ID login page for authentication.

        Returns:
            Rendered login page, or redirects the user after a
            successful authentication.
        """
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

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": self.scope,
        }

        auth_url = f"{self.authority}/oauth2/v2.0/authorize?{urlencode(params)}"
        return redirect(auth_url)

    def logout(self):
        """
        Remove the authentication token cookie.

        Creates a response that deletes the ``token`` cookie from the
        user's browser and redirects the user to the sign-in page.

        Returns:
            Response: A redirect response with the authentication cookie
            removed.
        """

        response = make_response(redirect(url_for("sign_in")))
        response.delete_cookie(
            "token",
            httponly=True,
            secure=True,
            samesite="Lax",
        )
        return response

    def callback(self, data: dict):
        if not data:
            return redirect(url_for("sign_in"))

        error = data.get("args", {}).get("error")
        code = data.get("args").get("code", {})

        if error or not code:
            logging.error("Entra callback error: %s", error)
            return redirect(url_for("sign_in"))

        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "scope": self.scope,
        }

        token_url = (
            f"https://login.microsoftonline.com/{self.tennat_id}/oauth2/v2.0/token"
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

        _valid = self.validate_token(token)

        if not _valid:
            return redirect(url_for("sign_in"))

        return redirect(url_for("receive_call"))
