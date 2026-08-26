import requests
from typing import Any
from flask import current_app
from pydantic import ValidationError
from app.main.models import (
    PersonalDetails,
    SearchPagination,
    SearchResponse,
    SearchResultRow,
)

REQUEST_TIMEOUT_SECONDS = 10


class ClientApiError(Exception):
    """Raised when the backend client API cannot complete a request."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _ok(data: dict[str, Any], status_code: int = 200) -> dict[str, Any]:
    return {
        "ok": True,
        "data": data,
        "error": None,
        "status_code": status_code,
    }


def _fail(message: str, status_code: int | None = None) -> dict[str, Any]:
    return {
        "ok": False,
        "data": None,
        "error": message,
        "status_code": status_code,
    }


def _build_url(path: str) -> str:
    base_url = current_app.config.get("BACKEND_BASE_URI", "")
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _request(method: str, path: str, **kwargs: Any) -> requests.Response:
    url = _build_url(path)

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
            "Backend service returned an error", status_code=response.status_code
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


def _personal_details_from_payload(payload: dict[str, Any]) -> PersonalDetails:
    return PersonalDetails(
        full_name=str(payload.get("full_name") or "").strip(),
        phone=str(payload.get("phone") or "").strip(),
        postcode=str(payload.get("postcode") or "").strip(),
        date_of_birth=str(payload.get("date_of_birth") or "").strip(),
    )


def _json_or_value_error(response: requests.Response) -> dict[str, Any]:
    try:
        return response.json()
    except ValueError as exc:
        raise ValueError("Backend returned invalid response") from exc


def _map_api_error(
    exc: ClientApiError,
    *,
    not_found_message: str,
    unavailable_message: str,
) -> dict[str, Any]:
    if exc.status_code == 404:
        return _fail(not_found_message, exc.status_code)
    return _fail(unavailable_message, exc.status_code)


def normalize_search_response(raw: dict[str, Any]) -> dict[str, Any]:
    if "result" in raw and "pagination" in raw:
        search = SearchResponse.model_validate(raw)
    else:
        results = raw.get("results", [])
        page = int(raw.get("page", 1))
        per_page = int(raw.get("per_page", len(results) or 20))
        total_records = int(raw.get("total", len(results)))
        total_pages = max(1, (total_records + per_page - 1) // per_page)
        start = ((page - 1) * per_page) + 1 if total_records else 0
        end = min(page * per_page, total_records)
        rows = [
            SearchResultRow(
                id=row.get("id"),
                name=row.get("full_name", ""),
                phone=row.get("mobile_phone", ""),
                postcode=row.get("postcode", ""),
                dob=_parse_dates(row.get("date_of_birth", "")),
                dob_sort=row.get("date_of_birth", ""),
            )
            for row in results
        ]
        pagination = SearchPagination(
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            total_records=total_records,
            start=start,
            end=end,
        )
        search = SearchResponse(result=rows, pagination=pagination)

    return search.model_dump()


def search_clients(payload: dict[str, Any]) -> dict[str, Any]:
    personal_details = _personal_details_from_payload(payload)

    search_terms = [
        personal_details.full_name,
        personal_details.phone,
        personal_details.postcode,
        personal_details.date_of_birth,
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
        normalized = normalize_search_response(_json_or_value_error(response))
        return _ok({"search": normalized}, response.status_code)
    except (ValueError, ValidationError):
        return _fail("Backend returned invalid response")
    except ClientApiError as exc:
        return _map_api_error(
            exc,
            not_found_message="Search endpoint not found on backend",
            unavailable_message="Search service unavailable",
        )


def create_case(payload: dict[str, Any]) -> dict[str, Any]:
    personal_details = _personal_details_from_payload(payload)

    try:
        response = _request(
            "POST",
            "call_centre/api/v1/case/",
            json=personal_details.model_dump(),
        )
        return _ok(_json_or_value_error(response), response.status_code)
    except (ValueError, ValidationError):
        return _fail("Backend returned invalid response")
    except ClientApiError as exc:
        return _map_api_error(
            exc,
            not_found_message="Create case endpoint not found on backend",
            unavailable_message="Create case service unavailable",
        )
