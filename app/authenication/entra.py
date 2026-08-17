from flask import render_template, redirect
from urllib.parse import urlencode
import requests, logging, jwt
from app.config import Config

class EntraLogin:

    def __init__(self):
        self.authority = Config.AUTHORITY
        self.client_id = Config.CLIENT_ID
        self.redirect_uri = Config.REDIRECT_PATH
        self.scope = Config.SCOPE

        if not all([
            self.authority,
            self.client_id,
            self.redirect_uri,
            self.scope
        ]):
            raise ValueError("Config is missing for Entra")
        

    def public_keys(self):
        if not keys:
            response = requests.get(self.discovery_url)
            response.raise_for_status()
            keys = response.json().get("keys", [])
        
        return keys

    def get_public_key(self, retry=True):
        unverified_header = jwt.get_unverified_header(self.token)
        kid = unverified_header.get("kid")
        key_data = next((k for k in self.public_keys if k["kid"] == kid), None)

        if not key_data and retry:
         
            return self.get_public_key(retry=False)
        if not key_data:
            logging.error("Entra authentication - No public key found for kid: %s" % kid)
            return None
        return key_data["x5c"][0]

   
    def validate_token(self, token):
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        keys = self._public_keys()
        key_data = next((k for k in keys if k["kid"] == kid), None)

        if not key_data:
           
            keys = self._public_keys()
            key_data = next((k for k in keys if k["kid"] == kid), None)

        if not key_data:
            raise exceptions.AuthenticationFailed("Key ID not found")

        cert_str = "-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----" % key_data["x5c"][0]
        cert_obj = load_pem_x509_certificate(cert_str.encode("utf-8"), default_backend)
        public_key = cert_obj.public_key()
        return jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=self.expected_audience,
            issuer=self.issuer
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
            logging.error("Entra authentication - Could not retrieve public key for token")
            return 
        cert_str = "-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----" % public_key
        cert_obj = load_pem_x509_certificate(cert_str.encode("utf-8"), default_backend())
        public_key = cert_obj.public_key()

        return jwt.decode(
            self.token, 
            public_key,
            algorithms=["RS256"],
            audience=self.expected_audience, 
            issuer=self.issuer
                )

    def login(self):
        """
        The page provides a link that redirects the user to the
        Microsoft Entra ID login page for authentication.

        Returns:
            Rendered login page, or redirects the user after a
            successful authentication.
        """
        return render_template(
            "auth/sign_in.html"
        )


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

            
    


    def callback(self, token):

        if not token:
            raise ValueError('No token to verify user')

