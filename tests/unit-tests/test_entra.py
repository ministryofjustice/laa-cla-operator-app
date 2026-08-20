import jwt
import pytest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta

from app.authenication.entra import EntraLogin
from app.authenication.constants import ROLES


VALID_ROLE = next(iter(ROLES))


@pytest.mark.parametrize(
    "token, decoded_token, expected",
    [
        # Empty token
        (
            "",
            None,
            None,
        ),

        # Expired token
        (
            "expired-token",
            {
                "exp": int(
                    (datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()
                ),
                "APP_ROLES": VALID_ROLE,
                "LAA_ACCOUNTS": ["123"],
                "preferred_username": "test@example.com",
            },
            "Token has expired",
        ),

        # Missing role
        (
            "token",
            {
                "LAA_ACCOUNTS": ["123"],
                "preferred_username": "test@example.com",
            },
            "Role not in scope",
        ),

        # Invalid role
        (
            "token",
            {
                "APP_ROLES": "invalid-role",
                "LAA_ACCOUNTS": ["123"],
                "preferred_username": "test@example.com",
            },
            "Role not in scope",
        ),

        # Missing office code
        (
            "token",
            {
                "APP_ROLES": VALID_ROLE,
                "LAA_ACCOUNTS": [],
                "preferred_username": "test@example.com",
            },
            "Missing office code",
        ),

        # Missing username
        (
            "token",
            {
                "APP_ROLES": VALID_ROLE,
                "LAA_ACCOUNTS": ["123"],
            },
            "Missing username",
        ),
    ],
)
def test_validate_token_invalid(token, decoded_token, expected):
    login = EntraLogin()

    if decoded_token is None:
        result = login.validate_token(token)
    else:
        with patch.object(login, "decode", return_value=decoded_token):
            result = login.validate_token(token)

    if expected is None:
        assert result is None
    else:
        assert isinstance(result, ValueError)
        assert str(result) == expected


def test_validate_token_valid():
    login = EntraLogin()

    decoded_token = {
        "APP_ROLES": VALID_ROLE,
        "LAA_ACCOUNTS": ["123", "456"],
        "preferred_username": "test@example.com",
    }

    with patch.object(login, "decode", return_value=decoded_token):
        with patch(
            "app.authenication.entra.session",
            {},
        ) as mock_session:

            result = login.validate_token("valid-token")

    assert result == {
        "username": "test@example.com",
        "roles": VALID_ROLE,
        "is_manager": ROLES[VALID_ROLE]["is_manager"],
        "office_codes": ["123", "456"],
    }

    assert mock_session["user"] == result