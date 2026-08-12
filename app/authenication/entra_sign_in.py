from flask import render_template


ENTRA_TENANT_ID = ""
ENTRA_CLIENT_ID = ""
ENTRA_ISSUER_URL = ""
ENTRA_KEYS_URL= ""

class EntraDecodeToken:

    def __init__(self, token):
        token = self.token
        self.tenant_id = ENTRA_TENANT_ID
        self.expected_audience = ENTRA_CLIENT_ID
        self.issuer = ENTRA_ISSUER_URL
        self.discovery_url = ENTRA_KEYS_URL
        self.token = token


    def _decode_token():
        public_key = self.get_public_key()
        if not public_key:
            logger.error("Entra authentication - Could not retrieve public key for token")
            return None
        cert_str = "-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----" % public_key
        cert_obj = load_pem_x509_certificate(cert_str.encode("utf-8"), default_backend())
        public_key = cert_obj.public_key()
        try:
            return jwt.decode(
                self.token, public_key, algorithms=["RS256"], audience=self.expected_audience, issuer=self.issuer
            )
        except Exception as e:
            logger.error(e)
            return None


    def _public_key():
        pass 


    







def sign_in_entra():
    """
    Handles the sign In request for Silas 
    1. Display the correct Error
    
    """

    return  render_template("auth/sign_in.html")