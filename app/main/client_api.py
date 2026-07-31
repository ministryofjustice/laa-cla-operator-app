import requests

from typing import Any
from flask import current_app, has_request_context, session

REQUEST_TIMEOUT_SECONDS = 5


class ClientApiError(Exception):
    """Raised when the backend client API cannot complete a request."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def _ok(data: dict[str, Any], status: int = 200) -> dict[str, Any]:
    return {
        "ok": True,
        "data": data,
        "error": None,
        "status": status,
    }


def _fail(message: str, status: int | None = None) -> dict[str, Any]:
    return {
        "ok": False,
        "data": None,
        "error": message,
        "status": status,
    }


def _build_url(path: str) -> str:
    base_url = current_app.config.get("BACKEND_BASE_URI", "")
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _resolve_auth_token() -> str:
    if not has_request_context():
        return ""
    return (session.get("entra_access_token") or "").strip()


def _request(method: str, path: str, **kwargs: Any) -> requests.Response:
    url = _build_url(path)

    auth_token = _resolve_auth_token()

    if not auth_token:
        raise ClientApiError("Missing Entra access token", status=401)

    if not auth_token.lower().startswith("bearer "):
        auth_token = f"Bearer {auth_token}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = auth_token
    kwargs["headers"] = headers
    try:
        response = requests.request(
            method, url, timeout=REQUEST_TIMEOUT_SECONDS, **kwargs
        )
    except requests.RequestException as exc:
        raise ClientApiError("Could not connect to backend service") from exc

    if response.status_code >= 400:
        current_app.logger.warning(
            "Backend request failed: %s %s returned %s",
            method,
            url,
            response.status_code,
        )
        raise ClientApiError(
            "Backend service returned an error", status=response.status_code
        )

    return response


def _parse_dates(date_str: str) -> str:
    """Parse backend date strings and return display format DD/MM/YYYY."""
    if not date_str:
        return ""
    try:
        normalized = date_str.replace("-", "/")
        year, month, day = normalized.split("/")
        return f"{day}/{month}/{year}"
    except ValueError:
        return ""


def normalize_search_response(raw: dict[str, Any]) -> dict[str, Any]:
    if "result" in raw and "pagination" in raw:
        search = raw
    else:
        results = raw.get("results", [])
        page = int(raw.get("page", 1))
        per_page = int(raw.get("per_page", len(results) or 20))
        total_records = int(raw.get("total", len(results)))
        total_pages = max(1, (total_records + per_page - 1) // per_page)
        start = ((page - 1) * per_page) + 1 if total_records else 0
        end = min(page * per_page, total_records)
        search = {
            "result": [
                {
                    "id": row.get("id"),
                    "name": row.get("full_name", ""),
                    "phone": row.get("mobile_phone", ""),
                    "postcode": row.get("postcode", ""),
                    "dob": _parse_dates(row.get("date_of_birth", "")),
                    "dob_sort": row.get("date_of_birth", ""),
                }
                for row in results
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "total_records": total_records,
                "start": start,
                "end": end,
            },
        }

    search.setdefault("result", [])
    search.setdefault(
        "pagination",
        {
            "page": 1,
            "per_page": 20,
            "total_pages": 1,
            "total_records": 0,
            "start": 0,
            "end": 0,
        },
    )
    return search


def search_clients(payload: dict[str, Any]) -> dict[str, Any]:
    search_terms = [
        payload.get("full_name"),
        payload.get("phone"),
        payload.get("postcode"),
        payload.get("date_of_birth"),
    ]

    search_value = " ".join(
        str(t).strip() for t in search_terms if t and str(t).strip()
    )

    query = {
        "search": search_value,
        "page": payload.get("page", 1),
    }

    try:
        response = _request("GET", "call_centre/api/v1/case", params=query)
        normalized = normalize_search_response(response.json())
        return _ok({"search": normalized}, response.status_code)
    except ValueError:
        return _fail("Backend returned invalid response")
    except ClientApiError as exc:
        if exc.status in (401, 403):
            return _fail("Search service unauthorized", exc.status)
        if exc.status == 404:
            return _fail("Search endpoint not found on backend", exc.status)
        return _fail("Search service unavailable", exc.status)


def create_case(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        response = _request("POST", "call_centre/api/v1/case/", json=payload)
        return _ok(response.json(), response.status_code)
    except ValueError:
        return _fail("Backend returned invalid response")
    except ClientApiError as exc:
        if exc.status in (401, 403):
            return _fail("Create case service unauthorized", exc.status)
        if exc.status == 404:
            return _fail("Create case endpoint not found on backend", exc.status)
        return _fail("Create case service unavailable", exc.status)
