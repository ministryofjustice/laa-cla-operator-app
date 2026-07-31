from flask import Flask, session

from app.main import entra_auth
from app.main.entra_auth import EntraAuthView, build_entra_user


def _make_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = "test"
    app.add_url_rule("/sign-in", endpoint="sign_in", view_func=lambda: "sign-in")
    app.add_url_rule(
        "/receive-call", endpoint="receive_call", view_func=lambda: "receive"
    )
    app.add_url_rule(
        "/auth/entra-callback",
        endpoint="entra_callback",
        view_func=lambda: "callback",
    )
    app.add_url_rule(
        "/auth/signed-out",
        endpoint="auth_signed_out",
        view_func=lambda: "signed-out",
    )
    return app


class _DummyTokenResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_build_entra_user_normalizes_roles_and_accounts():
    claims = {
        "preferred_username": "agent@example.com",
        "APP_ROLES": "Civil Legal Advice - Helpline Operator",
        "LAA_ACCOUNTS": "B01",
    }

    user = build_entra_user(claims)

    assert user == {
        "username": "agent@example.com",
        "roles": ["Civil Legal Advice - Helpline Operator"],
        "ui_access": ["operator"],
        "is_manager": False,
        "office_codes": ["B01"],
    }


def test_scope_always_includes_required_oidc_scopes_once():
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
        ENTRA_SCOPE="api://scope/user_impersonation profile",
    )

    with app.app_context():
        scope = EntraAuthView._scope()

    assert scope == "openid profile email api://scope/user_impersonation"


def test_authenticated_rejects_stale_mock_session_when_mock_mode_disabled():
    app = _make_app()
    app.config.update(ENTRA_AUTH_MOCK_ENABLED=False, ENVIRONMENT="local")

    with app.test_request_context("/receive-call"):
        session["entra_access_token"] = "test-access-token"
        session["user"] = {"username": "functional-test@local"}

        assert EntraAuthView.authenticated() is False


def test_authenticated_accepts_mock_session_when_mock_mode_enabled_in_local():
    app = _make_app()
    app.config.update(ENTRA_AUTH_MOCK_ENABLED=True, ENVIRONMENT="local")

    with app.test_request_context("/receive-call"):
        session["entra_access_token"] = "test-access-token"
        session["user"] = {"username": "functional-test@local"}

        assert EntraAuthView.authenticated() is True


def test_route_login_redirects_to_entra_authorize_when_configured():
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
        ENTRA_SCOPE="api://scope/user_impersonation",
    )

    with app.test_request_context("/auth/login"):
        response = EntraAuthView.route_login()

        assert response.status_code == 302
        assert "oauth2/v2.0/authorize" in response.location
        assert "client_id=client-id" in response.location
        assert "state=" in response.location
        assert session.get("oauth_state")


def test_route_callback_rejects_state_mismatch():
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
    )

    with app.test_request_context("/auth/entra-callback?state=received&code=abc"):
        session["oauth_state"] = "expected"
        response = EntraAuthView.route_callback()

    assert response.status_code == 302
    assert response.location.endswith("/sign-in")


def test_route_logout_redirects_to_entra_logout_when_configured():
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
    )

    with app.test_request_context("/auth/logout"):
        session["user"] = {"username": "agent@example.com"}
        session["entra_access_token"] = "token"

        response = EntraAuthView.route_logout()

    assert response.status_code == 302
    assert "oauth2/v2.0/logout" in response.location
    assert "post_logout_redirect_uri=" in response.location
    assert "%2Fauth%2Fsigned-out" in response.location


def test_route_callback_success_stores_expected_session_payload(monkeypatch):
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
        ENTRA_SCOPE="api://scope/user_impersonation",
    )

    claims = {
        "preferred_username": "agent@example.com",
        "APP_ROLES": "Civil Legal Advice - Helpline Operator",
        "LAA_ACCOUNTS": ["B01"],
    }

    def fake_post(*args, **kwargs):
        return _DummyTokenResponse(
            {
                "id_token": "dummy-id-token",
                "access_token": "dummy-access-token",
            }
        )

    monkeypatch.setattr(entra_auth.requests, "post", fake_post)
    monkeypatch.setattr(entra_auth.EntraTokenDecoder, "decode", lambda self: claims)

    with app.test_request_context("/auth/entra-callback?state=expected&code=auth-code"):
        session["oauth_state"] = "expected"
        response = EntraAuthView.route_callback()

        assert response.status_code == 302
        assert response.location.endswith("/receive-call")
        assert session["entra_access_token"] == "dummy-access-token"
        assert session["id_token_claims"] == claims
        assert session["user"]["username"] == "agent@example.com"
        assert "oauth_state" not in session


def test_route_callback_denies_provider_only_user(monkeypatch):
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
        ENTRA_SCOPE="api://scope/user_impersonation",
    )

    provider_claims = {
        "preferred_username": "provider@example.com",
        "APP_ROLES": "Civil Legal Advice - Helpline Provider",
        "LAA_ACCOUNTS": ["P01"],
    }

    def fake_post(*args, **kwargs):
        return _DummyTokenResponse(
            {
                "id_token": "dummy-id-token",
                "access_token": "dummy-access-token",
            }
        )

    monkeypatch.setattr(entra_auth.requests, "post", fake_post)
    monkeypatch.setattr(
        entra_auth.EntraTokenDecoder,
        "decode",
        lambda self: provider_claims,
    )

    with app.test_request_context("/auth/entra-callback?state=expected&code=auth-code"):
        session["oauth_state"] = "expected"
        response = EntraAuthView.route_callback()

        assert response.status_code == 302
        assert response.location.endswith("/sign-in")
        assert "user" not in session
        assert "entra_access_token" not in session
        assert "id_token_claims" not in session


def test_route_callback_uses_access_token_app_roles_when_missing_in_id_token(
    monkeypatch,
):
    app = _make_app()
    app.config.update(
        ENTRA_TENANT_ID="tenant-id",
        ENTRA_CLIENT_ID="client-id",
        ENTRA_CLIENT_SECRET="client-secret",
        ENTRA_SCOPE="api://scope/user_impersonation",
    )

    id_token_claims_without_roles = {
        "preferred_username": "agent@example.com",
        "LAA_ACCOUNTS": ["B01"],
    }

    def fake_post(*args, **kwargs):
        return _DummyTokenResponse(
            {
                "id_token": "dummy-id-token",
                "access_token": "dummy-access-token",
            }
        )

    monkeypatch.setattr(entra_auth.requests, "post", fake_post)
    monkeypatch.setattr(
        entra_auth.EntraTokenDecoder,
        "decode",
        lambda self: id_token_claims_without_roles,
    )
    monkeypatch.setattr(
        entra_auth,
        "_extract_access_claims_for_user",
        lambda token: {
            "APP_ROLES": "Civil Legal Advice - Helpline Operator Manager",
            "LAA_ACCOUNTS": ["B01"],
        },
    )

    with app.test_request_context("/auth/entra-callback?state=expected&code=auth-code"):
        session["oauth_state"] = "expected"
        response = EntraAuthView.route_callback()

        assert response.status_code == 302
        assert response.location.endswith("/receive-call")
        assert session["user"]["roles"] == [
            "Civil Legal Advice - Helpline Operator Manager"
        ]
