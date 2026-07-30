import secrets
import time
import base64
import json
from dataclasses import dataclass
from urllib.parse import urlencode

import jwt
import requests
from flask import current_app, flash, redirect, request, session, url_for


ENTRA_REQUEST_TIMEOUT_SECONDS = 10
ENTRA_KEYS_CACHE_TTL_SECONDS = 86400

ROLES = {
    "Civil Legal Advice - Helpline Operator Manager": {
        "ui": "operator",
        "is_manager": True,
    },
    "Civil Legal Advice - Helpline Operator": {
        "ui": "operator",
        "is_manager": False,
    },
    "Civil Legal Advice - Helpline Provider": {
        "ui": "provider",
        "is_manager": False,
    },
}

ALLOWED_OPERATOR_ROLES = {
    "Civil Legal Advice - Helpline Operator Manager",
    "Civil Legal Advice - Helpline Operator",
}


@dataclass(frozen=True)
class EntraSettings:
    tenant_id: str
    client_id: str
    client_secret: str
    scope: str

    @property
    def authority(self) -> str:
        return f"https://login.microsoftonline.com/{self.tenant_id}"

    @property
    def issuer(self) -> str:
        return f"{self.authority}/v2.0"

    @property
    def jwks_url(self) -> str:
        return f"{self.authority}/discovery/v2.0/keys"


class EntraTokenDecoder:
    _jwks_cache: dict[str, tuple[float, list[dict]]] = {}

    def __init__(self, token: str, settings: EntraSettings):
        self.token = token
        self.settings = settings

    def decode(self) -> dict | None:
        public_key = self._get_public_key()
        if public_key is None:
            current_app.logger.error(
                "Entra authentication - Could not retrieve public key for token"
            )
            return None

        try:
            return jwt.decode(
                self.token,
                key=public_key,
                algorithms=["RS256"],
                audience=self.settings.client_id,
                issuer=self.settings.issuer,
            )
        except Exception:
            current_app.logger.exception("Entra authentication - Token decode failed")
            return None

    def _public_keys(self) -> list[dict]:
        now = time.time()
        cached = self._jwks_cache.get(self.settings.jwks_url)
        if cached and cached[0] > now:
            return cached[1]

        response = requests.get(
            self.settings.jwks_url, timeout=ENTRA_REQUEST_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        keys = response.json().get("keys", [])
        self._jwks_cache[self.settings.jwks_url] = (
            now + ENTRA_KEYS_CACHE_TTL_SECONDS,
            keys,
        )
        return keys

    def _get_public_key(self, retry: bool = True):
        try:
            header = jwt.get_unverified_header(self.token)
        except Exception:
            current_app.logger.exception(
                "Entra authentication - Could not parse token header"
            )
            return None

        kid = header.get("kid")
        key_data = next((k for k in self._public_keys() if k.get("kid") == kid), None)

        if key_data is None and retry:
            self._jwks_cache.pop(self.settings.jwks_url, None)
            return self._get_public_key(retry=False)

        if key_data is None:
            current_app.logger.error(
                "Entra authentication - No public key found for kid=%s", kid
            )
            return None

        try:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
        except Exception:
            current_app.logger.exception(
                "Entra authentication - Could not construct RSA key from JWK"
            )
            return None


def build_entra_user(claims: dict) -> dict:
    raw_roles = claims.get("APP_ROLES", [])
    if not isinstance(raw_roles, list):
        raw_roles = [raw_roles]
    roles = [role for role in raw_roles if role in ROLES]

    raw_accounts = claims.get("LAA_ACCOUNTS", [])
    if not isinstance(raw_accounts, list):
        raw_accounts = [raw_accounts]

    return {
        "username": claims.get("preferred_username", ""),
        "roles": roles,
        "ui_access": [ROLES[role]["ui"] for role in roles],
        "is_manager": any(ROLES[role]["is_manager"] for role in roles),
        "office_codes": raw_accounts,
    }


def _is_authorized_operator(user: dict) -> bool:
    roles = user.get("roles", [])
    return any(role in ALLOWED_OPERATOR_ROLES for role in roles)


def _merge_user_claims_from_access_hints(
    id_claims: dict, access_claim_hints: dict
) -> dict:
    merged = dict(id_claims)

    if merged.get("APP_ROLES") in (None, "", []):
        merged["APP_ROLES"] = access_claim_hints.get("APP_ROLES", [])

    if merged.get("LAA_ACCOUNTS") in (None, "", []):
        merged["LAA_ACCOUNTS"] = access_claim_hints.get("LAA_ACCOUNTS", [])

    return merged


def _extract_access_claims_for_user(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {"APP_ROLES": [], "LAA_ACCOUNTS": []}
        payload = parts[1]
        padding = "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding)
        claims = json.loads(decoded)
        return {
            "APP_ROLES": claims.get("APP_ROLES"),
            "LAA_ACCOUNTS": claims.get("LAA_ACCOUNTS"),
        }
    except Exception:
        return {"APP_ROLES": [], "LAA_ACCOUNTS": []}


class EntraAuthView:
    @classmethod
    def _settings(cls) -> EntraSettings:
        return EntraSettings(
            tenant_id=(current_app.config.get("ENTRA_TENANT_ID", "") or "").strip(),
            client_id=(current_app.config.get("ENTRA_CLIENT_ID", "") or "").strip(),
            client_secret=(
                current_app.config.get("ENTRA_CLIENT_SECRET", "") or ""
            ).strip(),
            scope=(current_app.config.get("ENTRA_SCOPE", "") or "").strip(),
        )

    @classmethod
    def configured(cls) -> bool:
        settings = cls._settings()
        return bool(
            settings.tenant_id and settings.client_id and settings.client_secret
        )

    @classmethod
    def authenticated(cls) -> bool:
        user = session.get("user") or {}
        token = (session.get("entra_access_token") or "").strip()
        if not user or not token:
            return False

        # Prevent stale functional-test sessions from bypassing auth when
        # mock mode is disabled.
        if token == "test-access-token":
            mock_auth_enabled = (
                current_app.config.get("ENTRA_AUTH_MOCK_ENABLED")
                and current_app.config.get("ENVIRONMENT") == "local"
            )
            return bool(
                mock_auth_enabled and user.get("username") == "functional-test@local"
            )

        return True

    @classmethod
    def _scope(cls) -> str:
        configured_scope = cls._settings().scope
        configured_parts = [
            part.strip() for part in configured_scope.split() if part.strip()
        ]

        required_oidc = ["openid", "profile", "email"]
        ordered_scope = list(required_oidc)

        for part in configured_parts:
            if part not in ordered_scope:
                ordered_scope.append(part)

        return " ".join(ordered_scope)

    @classmethod
    def _redirect_path(cls) -> str:
        configured = (current_app.config.get("ENTRA_REDIRECT_PATH", "") or "").strip()
        path = configured or "/auth/entra-callback"
        if not path.startswith("/"):
            path = f"/{path}"
        return path

    @classmethod
    def _redirect_uri(cls) -> str:
        return f"{request.url_root.rstrip('/')}{cls._redirect_path()}"

    @classmethod
    def build_entra_auth_url(cls, state: str) -> str:
        settings = cls._settings()
        params = {
            "client_id": settings.client_id,
            "response_type": "code",
            "redirect_uri": cls._redirect_uri(),
            "response_mode": "query",
            "scope": cls._scope(),
            "state": state,
        }
        return f"{settings.authority}/oauth2/v2.0/authorize?{urlencode(params)}"

    @classmethod
    def route_login(cls):
        if not cls.configured():
            flash("Sign-in is not configured.")
            return redirect(url_for("sign_in"))

        # Start a fresh auth flow each time login is initiated.
        session.pop("oauth_state", None)
        session.pop("entra_access_token", None)
        session.pop("user", None)

        state = secrets.token_urlsafe(32)
        session["oauth_state"] = state
        return redirect(cls.build_entra_auth_url(state))

    @classmethod
    def route_logout(cls):
        session.clear()
        return redirect(url_for("sign_in"))

    @classmethod
    def route_callback(cls):
        if not cls.configured():
            current_app.logger.warning("Entra callback hit but Entra is not configured")
            flash("Sign-in is not configured.")
            return redirect(url_for("sign_in"))

        state = request.args.get("state", "").strip()
        if not state or state != session.get("oauth_state"):
            current_app.logger.warning(
                "Entra authentication - State mismatch; expected=%s received=%s",
                bool(session.get("oauth_state")),
                bool(state),
            )
            flash("Sign-in failed. Please try again.")
            return redirect(url_for("sign_in"))

        code = request.args.get("code", "").strip()
        if not code:
            current_app.logger.warning("Entra authentication - No code provided")
            flash("Sign-in failed. Please try again.")
            return redirect(url_for("sign_in"))

        settings = cls._settings()

        try:
            token_response = requests.post(
                f"{settings.authority}/oauth2/v2.0/token",
                data={
                    "client_id": settings.client_id,
                    "client_secret": settings.client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": cls._redirect_uri(),
                    "scope": cls._scope(),
                },
                timeout=ENTRA_REQUEST_TIMEOUT_SECONDS,
            )
            token_response.raise_for_status()
            tokens = token_response.json()
        except requests.RequestException:
            current_app.logger.exception("Entra authentication - Token exchange failed")
            flash("Sign-in service is unavailable. Please try again.")
            return redirect(url_for("sign_in"))

        id_token = tokens.get("id_token")
        access_token = tokens.get("access_token")
        if not id_token or not access_token:
            current_app.logger.error(
                "Entra authentication - Token response missing id/access token"
            )
            flash("Sign-in failed. Please try again.")
            return redirect(url_for("sign_in"))

        access_claim_hints = _extract_access_claims_for_user(access_token)

        claims = EntraTokenDecoder(id_token, settings).decode()
        if claims is None:
            flash("Sign-in token validation failed.")
            return redirect(url_for("sign_in"))

        claims = _merge_user_claims_from_access_hints(claims, access_claim_hints)

        user = build_entra_user(claims)
        if not _is_authorized_operator(user):
            current_app.logger.warning(
                "Entra sign-in denied for non-operator user=%s roles=%s",
                claims.get("preferred_username", ""),
                user.get("roles", []),
            )
            flash("You do not have access to this service.")
            session.pop("entra_access_token", None)
            session.pop("id_token_claims", None)
            session.pop("user", None)
            session.pop("oauth_state", None)
            return redirect(url_for("sign_in"))

        session["entra_access_token"] = access_token
        session["id_token_claims"] = claims
        session["user"] = user
        session.pop("oauth_state", None)

        current_app.logger.info(
            "Entra sign-in successful for user=%s",
            claims.get("preferred_username", ""),
        )
        return redirect(url_for("receive_call"))
