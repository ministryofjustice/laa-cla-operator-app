import pytest
from flask import Flask

from app.main import client_api


class DummyResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def test_search_clients_success_builds_query_and_normalizes(monkeypatch):
    captured = {}

    def fake_request(method, path, **kwargs):
        captured["method"] = method
        captured["path"] = path
        captured["kwargs"] = kwargs
        return DummyResponse(
            {
                "results": [
                    {
                        "id": 7,
                        "full_name": "Jane Doe",
                        "phone": "07000000000",
                        "postcode": "SW1A 1AA",
                        "date_of_birth": "1990/01/31",
                    }
                ],
                "page": 2,
                "per_page": 20,
                "total": 25,
            },
            status_code=200,
        )

    monkeypatch.setattr(client_api, "_request", fake_request)

    result = client_api.search_clients(
        {
            "full_name": "Jane Doe",
            "phone": "07000000000",
            "postcode": "SW1A 1AA",
            "date_of_birth": "1990/01/31",
            "page": 2,
        }
    )

    assert result["ok"] is True
    assert result["status"] == 200
    assert captured["method"] == "GET"
    assert captured["path"] == "call_centre/api/v1/case"
    assert captured["kwargs"]["params"]["page"] == 2
    assert (
        captured["kwargs"]["params"]["search"]
        == "Jane Doe 07000000000 SW1A 1AA 1990/01/31"
    )

    search = result["data"]["search"]
    assert search["result"][0]["name"] == "Jane Doe"
    assert search["result"][0]["dob"] == "31/01/1990"
    assert search["pagination"]["total_pages"] == 2


def test_search_clients_maps_401_to_unavailable(monkeypatch):
    def fake_request(method, path, **kwargs):
        raise client_api.ClientApiError("backend error", status=401)

    monkeypatch.setattr(client_api, "_request", fake_request)

    result = client_api.search_clients({"full_name": "Jane"})

    assert result == {
        "ok": False,
        "data": None,
        "error": "Search service unavailable",
        "status": 401,
    }


def test_search_clients_maps_generic_error(monkeypatch):
    def fake_request(method, path, **kwargs):
        raise client_api.ClientApiError("backend error", status=500)

    monkeypatch.setattr(client_api, "_request", fake_request)

    result = client_api.search_clients({"full_name": "Jane"})

    assert result == {
        "ok": False,
        "data": None,
        "error": "Search service unavailable",
        "status": 500,
    }


def test_create_case_success(monkeypatch):
    def fake_request(method, path, **kwargs):
        assert method == "POST"
        assert path == "call_centre/api/v1/case/"
        assert kwargs["json"]["date_of_birth"] == "1990/01/31"
        return DummyResponse({"reference": "CASE-123"}, status_code=201)

    monkeypatch.setattr(client_api, "_request", fake_request)

    result = client_api.create_case(
        {
            "full_name": "Jane Doe",
            "phone": "07000000000",
            "postcode": "SW1A 1AA",
            "date_of_birth": "1990/01/31",
        }
    )

    assert result == {
        "ok": True,
        "data": {"reference": "CASE-123"},
        "error": None,
        "status": 201,
    }


@pytest.mark.parametrize(
    "status, message",
    [
        (403, "Create case service unavailable"),
        (404, "Create case endpoint not found on backend"),
        (500, "Create case service unavailable"),
    ],
)
def test_create_case_error_mapping(monkeypatch, status, message):
    def fake_request(method, path, **kwargs):
        raise client_api.ClientApiError("backend error", status=status)

    monkeypatch.setattr(client_api, "_request", fake_request)

    result = client_api.create_case({"full_name": "Jane Doe"})

    assert result == {
        "ok": False,
        "data": None,
        "error": message,
        "status": status,
    }


@pytest.mark.parametrize(
    "raw_date, expected",
    [
        ("1990-01-31", "31/01/1990"),
        ("1990/01/31", "31/01/1990"),
        ("", ""),
        ("invalid", ""),
    ],
)
def test_parse_dates_supports_backend_formats(raw_date, expected):
    assert client_api._parse_dates(raw_date) == expected


def test_request_does_not_inject_authorization_header(monkeypatch):
    captured = {}

    def fake_requests_request(method, url, timeout=None, **kwargs):
        captured["method"] = method
        captured["url"] = url
        captured["headers"] = kwargs.get("headers", {})
        return DummyResponse({}, status_code=200)

    app = Flask(__name__)
    app.config["BACKEND_BASE_URI"] = "http://127.0.0.1:8010"
    app.secret_key = "test"

    monkeypatch.setattr(client_api.requests, "request", fake_requests_request)

    with app.test_request_context("/search"):
        client_api._request("GET", "call_centre/api/v1/case")

    assert "Authorization" not in captured["headers"]
