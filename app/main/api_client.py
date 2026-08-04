from datetime import date
from typing import Any

import requests
from flask import current_app, has_request_context, session

DEFAULT_REQUEST_TIMEOUT_SECONDS = 5

SEARCH_CASES_PATH = "call_centre/api/v1/case"
CREATE_CASE_PATH = "call_centre/api/v1/case/"


class ClaBackendError(Exception):
    """Raised when a request to CLA Backend cannot be completed."""

    def __init__(self, *args: object):
        super().__init__(*args)
        self.status = args[1] if len(args) > 1 and isinstance(args[1], int) else None


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
    base_url = current_app.config.get("BACKEND_BASE_URI", "").strip()

    if not base_url:
        raise ClaBackendError("CLA Backend base URI is not configured")

    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _resolve_auth_token() -> str:
    if not has_request_context():
        return ""

    return str(session.get("entra_access_token") or "").strip()


def _request(method: str, path: str, **kwargs: Any) -> requests.Response:
    url = _build_url(path)
    auth_token = _resolve_auth_token()

    if not auth_token:
        raise ClaBackendError("Missing Entra access token", 401)

    if not auth_token.lower().startswith("bearer "):
        auth_token = f"Bearer {auth_token}"

    headers = dict(kwargs.pop("headers", {}) or {})
    headers["Authorization"] = auth_token

    timeout = current_app.config.get(
        "BACKEND_REQUEST_TIMEOUT_SECONDS",
        DEFAULT_REQUEST_TIMEOUT_SECONDS,
    )

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            timeout=timeout,
            **kwargs,
        )
    except requests.RequestException as exc:
        current_app.logger.exception(
            "Could not connect to CLA Backend: %s %s",
            method,
            url,
        )
        raise ClaBackendError("Could not connect to CLA Backend") from exc

    if response.status_code >= 400:
        current_app.logger.warning(
            "CLA Backend request failed: %s %s returned %s",
            method,
            url,
            response.status_code,
        )
        raise ClaBackendError(
            "CLA Backend returned an error",
            response.status_code,
        )

    return response


def _parse_date(date_string: str) -> str:
    """Convert an ISO date to DD/MM/YYYY for display."""

    if not date_string:
        return ""

    try:
        parsed_date = date.fromisoformat(date_string)
    except (TypeError, ValueError):
        return ""

    return parsed_date.strftime("%d/%m/%Y")


def _safe_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_search_response(raw: dict[str, Any]) -> dict[str, Any]:
    if "result" in raw and "pagination" in raw:
        search = {
            "result": raw.get("result", []),
            "pagination": raw.get("pagination", {}),
        }
    else:
        results = raw.get("results", [])

        if not isinstance(results, list):
            results = []

        page = max(1, _safe_int(raw.get("page"), 1))
        per_page = max(
            1,
            _safe_int(raw.get("per_page"), len(results) or 20),
        )
        total_records = max(
            0,
            _safe_int(raw.get("total"), len(results)),
        )

        total_pages = max(
            1,
            (total_records + per_page - 1) // per_page,
        )
        start = ((page - 1) * per_page) + 1 if total_records else 0
        end = min(page * per_page, total_records)

        search = {
            "result": [
                {
                    "id": row.get("id"),
                    "name": row.get("full_name", ""),
                    "phone": row.get("mobile_phone", ""),
                    "postcode": row.get("postcode", ""),
                    "dob": _parse_date(row.get("date_of_birth", "")),
                    "dob_sort": row.get("date_of_birth", ""),
                }
                for row in results
                if isinstance(row, dict)
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
        str(term).strip() for term in search_terms if term and str(term).strip()
    )

    query = {
        "search": search_value,
        "page": payload.get("page", 1),
    }

    try:
        response = _request(
            "GET",
            SEARCH_CASES_PATH,
            params=query,
        )
        normalized = _normalize_search_response(response.json())

        return _ok(
            {"search": normalized},
            response.status_code,
        )
    except requests.JSONDecodeError:
        return _fail("CLA Backend returned an invalid response")
    except ClaBackendError as exc:
        if exc.status in (401, 403):
            return _fail("Search service unauthorised", exc.status)

        if exc.status == 404:
            return _fail(
                "Search endpoint was not found on CLA Backend",
                exc.status,
            )

        return _fail("Search service is unavailable", exc.status)


def create_case(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        response = _request(
            "POST",
            CREATE_CASE_PATH,
            json=payload,
        )

        return _ok(
            response.json(),
            response.status_code,
        )
    except requests.JSONDecodeError:
        return _fail("CLA Backend returned an invalid response")
    except ClaBackendError as exc:
        if exc.status in (401, 403):
            return _fail("Create case service unauthorised", exc.status)

        if exc.status == 404:
            return _fail(
                "Create case endpoint was not found on CLA Backend",
                exc.status,
            )

        return _fail("Create case service is unavailable", exc.status)
