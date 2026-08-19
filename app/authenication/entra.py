from flask import render_template, redirect, url_for, make_response
from urllib.parse import urlencode
import requests
import logging
import jwt
from app.config import Config


class EntraLogin:
    def __init__(self):
        self.authority = Config.AUTHORITY + Config.TENANT_ID
        self.client_id = Config.CLIENT_ID
        self.redirect_uri = Config.REDIRECT_PATH
        self.scope = Config.SCOPE
        self.client_secret = Config.CLIENT_SECRET
        self.tennat_id = Config.TENANT_ID

        if not all([self.authority, self.client_id, self.redirect_uri, self.scope]):
            raise ValueError("Config is missing for Entra")

    def public_keys(self, keys):
        if not keys:
            response = requests.get(self.discovery_url)
            response.raise_for_status()
            keys = response.json().get("keys", [])

        return keys

    def get_public_key(self, retry=True):
        """Retrieve the public certificate matching the JWT key ID.

        Looks up the key using the token's ``kid`` and retries once if no matching
        key is found. Returns the certificate or ``None`` if the key is unavailable.
        """
        unverified_header = jwt.get_unverified_header(self.token)
        kid = unverified_header.get("kid")
        key_data = next((k for k in self.public_keys if k["kid"] == kid), None)

        if not key_data and retry:
            return self.get_public_key(retry=False)
        if not key_data:
            logging.error(
                "Entra authentication - No public key found for kid: %s" % kid
            )
            return None
        return key_data["x5c"][0]

    def validate_token(self, token):
        """
        Validate and decode a JWT using its key ID and matching public certificate.

        Verifies the token signature, algorithm, audience, and issuer, and returns
        the decoded JWT claims. Raises an error if the key cannot be found or the
        token fails validation.
        """

        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        keys = self._public_keys()
        key_data = next((k for k in keys if k["kid"] == kid), None)

        if not key_data:
            keys = self._public_keys()
            key_data = next((k for k in keys if k["kid"] == kid), None)

        if not key_data:
            raise ValueError("Key ID not found")

        cert_str = (
            "-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----"
            % key_data["x5c"][0]
        )
        cert_obj = load_pem_x509_certificate(cert_str.encode("utf-8"), default_backend)
        public_key = cert_obj.public_key()
        return jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=self.expected_audience,
            issuer=self.issuer,
        )

    def _decode(self):
        """
        Decode and validate the Entra JWT using its public key.

        Validates the token signature, issuer, audience, and RS256 algorithm.

        Returns:
            dict: Decoded JWT claims, or None if the public key cannot be retrieved.
        """
        public_key = self.get_public_key()
        if not public_key:
            logging.error(
                "Entra authentication - Could not retrieve public key for token"
            )
            return
        cert_str = (
            "-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----" % public_key
        )
        cert_obj = load_pem_x509_certificate(
            cert_str.encode("utf-8"), default_backend()
        )
        public_key = cert_obj.public_key()

        return jwt.decode(
            self.token,
            public_key,
            algorithms=["RS256"],
            audience=self.expected_audience,
            issuer=self.issuer,
        )

    def get_jwt_token(token):

        pass 


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
            f"https://login.microsoftonline.com/"
            f"{self.tennat_id}/oauth2/v2.0/token"
        )

        response = requests.post(
            token_url,
            data=token_data,
            timeout=30,
        )

        if not response.ok:
            return redirect(url_for("sign_in"))

        token = response.json()
        _valid = self.validate_token(token)

        if not _valid:
             return redirect(url_for("sign_in"))


        return token