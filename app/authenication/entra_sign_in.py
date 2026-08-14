from flask import render_template
import json,os 
import logging
import jwt
import requests
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend
from helpers.applogging import applogging

@applogging
def _env():
    return {
        "ENTRA_TENANT_ID": os.getenv("ENTRA_TENANT_ID"),
        "ENTRA_CLIENT_ID": os.getenv("ENTRA_CLIENT_ID"),
        "ENTRA_ISSUER_URL": os.getenv("ENTRA_ISSUER_URL"),
        "ENTRA_KEYS_URL": os.getenv("ENTRA_KEYS_URL"),
    }


class EntraLogin:

    def __init__(self, token):
        env = _env()
        self.tenant_id = env["ENTRA_TENANT_ID"]
        self.expected_audience = env["ENTRA_CLIENT_ID"]
        self.issuer = env["ENTRA_ISSUER_URL"]
        self.discovery_url = env["ENTRA_KEYS_URL"]
        self.token = token



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

    def login():
        """
        Login via Silas
        """

        



class EntraLogOut:

    def __init__(self):
        pass