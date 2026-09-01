import threading
import time
import re

import pytest
import requests
from unittest.mock import patch
from playwright.sync_api import Page, expect
from app import create_app
from app.authenication.entra import EntraLogin

BASE_URL = "http://127.0.0.1:8000"

SEARCH_CLIENTS_PATCH_TARGET = "app.main.routes.search_clients"


def _fake_search_results(count=20, page=1, total_pages=1):
    return {
        "ok": True,
        "result": [
            {
                "name": f"John Smith {i}",
                "phone": f"0123456{i:03d}",
                "postcode": "B1 1AA",
                "dob": "01/01/1990",
                "dob_sort": "19900101",
            }
            for i in range(count)
        ],
        "pagination": {
            "page": page,
            "per_page": 20,
            "total_pages": total_pages,
            "total_records": count,
            "start": 1,
            "end": count,
        },
    }


@pytest.fixture(scope="session")
def flask_server():
    app = create_app()

    thread = threading.Thread(
        target=lambda: app.run(port=8000, use_reloader=False),
        daemon=True,
    )
    thread.start()

    for _ in range(20):
        try:
            requests.get(BASE_URL)
            break
        except requests.ConnectionError:
            time.sleep(0.5)

    yield


@pytest.fixture
def search_page(flask_server, page: Page):
    decoded_token = {
        "exp": 9999999999,
        "APP_ROLES": "Civil Legal Advice - Helpline Operator Manager",
        "LAA_ACCOUNTS": "123",
        "preferred_username": "test.user@example.com",
    }
    patcher = patch.object(EntraLogin, "decode", return_value=decoded_token)
    patcher.start()

    page.context.add_cookies(
        [
            {
                "name": "token",
                "value": "fake-token-value",
                "url": BASE_URL,
            }
        ]
    )
    page.goto(f"{BASE_URL}/search-client")

    yield page

    patcher.stop()


@pytest.fixture
def mock_search_backend():
    """Mocks the backend search call so UI tests don't depend on real seeded data."""
    with patch(
        SEARCH_CLIENTS_PATCH_TARGET,
        return_value=_fake_search_results(),
    ) as mocked:
        yield mocked


def test_search_page_loads(search_page: Page):
    page = search_page
    expect(page).to_have_url("http://127.0.0.1:8000/search-client")

    expect(
        page.get_by_role("heading", name="Search client's details", level=1)
    ).to_be_visible()

    expect(page.locator("#full_name")).to_be_visible()
    expect(page.locator("#phone")).to_be_visible()
    expect(page.locator("#postcode")).to_be_visible()
    expect(page.locator("#date_of_birth-day")).to_be_visible()
    expect(page.locator("#date_of_birth-month")).to_be_visible()
    expect(page.locator("#date_of_birth-year")).to_be_visible()

    expect(page.get_by_role("button", name="Search")).to_be_visible()


def test_empty_search_shows_error(search_page: Page):
    page = search_page

    page.get_by_role("button", name="Search").click()

    expect(page.get_by_text("There is a problem")).to_be_visible()

    expect(
        page.get_by_text("You must complete at least one search field")
    ).to_be_visible()


def test_user_can_search_by_name(search_page: Page):
    page = search_page

    page.locator("#full_name").fill("John Smith")

    page.get_by_role("button", name="Search").click()

    expect(page).to_have_url(re.compile(r"full_name=John\+Smith"))


def test_search_results_are_displayed(search_page: Page, mock_search_backend):
    page = search_page

    page.locator("#full_name").fill("John")

    page.get_by_role("button", name="Search").click()

    results_table = page.locator(".govuk-table")

    expect(results_table).to_be_visible()
    expect(page.get_by_text("search result")).to_be_visible()


def test_results_table_contains_expected_columns(
    search_page: Page, mock_search_backend
):
    page = search_page

    page.locator("#full_name").fill("John")

    page.get_by_role("button", name="Search").click()

    expect(page.get_by_role("columnheader", name="Name")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Phone number")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Post code")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Date of birth")).to_be_visible()


def test_pagination_next_button(search_page: Page):
    page = search_page

    with patch(
        SEARCH_CLIENTS_PATCH_TARGET,
        return_value=_fake_search_results(count=20, page=1, total_pages=2),
    ):
        page.locator("#full_name").fill("John")
        page.get_by_role("button", name="Search").click()

        next_button = page.get_by_role("link", name="Next")
        expect(next_button).to_be_visible()
        next_button.click()

        expect(page.locator(".moj-pagination")).to_be_visible()


def test_clear_all_link_clears_fields(search_page: Page):
    page = search_page

    page.locator("#full_name").fill("John Smith")
    page.locator("#phone").fill("0123456789")
    page.locator("#postcode").fill("B1 1AA")
    page.locator("#date_of_birth-day").fill("17")
    page.locator("#date_of_birth-month").fill("05")
    page.locator("#date_of_birth-year").fill("2024")

    page.locator("#clear-all-link").click()

    expect(page.locator("#full_name")).to_have_value("")
    expect(page.locator("#phone")).to_have_value("")
    expect(page.locator("#postcode")).to_have_value("")
    expect(page.locator("#date_of_birth-day")).to_have_value("")
    expect(page.locator("#date_of_birth-month")).to_have_value("")
    expect(page.locator("#date_of_birth-year")).to_have_value("")


def test_back_link_navigates_to_receive_calls(search_page: Page):
    page = search_page

    page.locator("a.govuk-back-link").click()

    expect(page).to_have_url(re.compile(r"/"))  # back to the home page for now


def test_search_results_return_20_results_per_page(
    search_page: Page, mock_search_backend
):
    page = search_page

    page.locator("#full_name").fill("John")

    page.get_by_role("button", name="Search").click()

    results_table = page.locator(".govuk-table")
    expect(results_table).to_be_visible()

    result_rows = results_table.locator("tbody tr")
    expect(result_rows).to_have_count(20)
