import re
import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def search_page(page: Page):
    page.goto("/search-client")
    return page


def test_search_page_loads(search_page: Page):
    page = search_page

    expect(
        page.get_by_role("heading", name="Search client's details")
    ).to_be_visible()

    expect(page.locator("#name")).to_be_visible()
    expect(page.locator("#phone")).to_be_visible()
    expect(page.locator("#postcode")).to_be_visible()
    expect(page.locator("#date_of_birth-issued-month")).to_be_visible()
    expect(page.locator("#date_of_birth-issued-year")).to_be_visible()
    expect(page.locator("#date_of_birth-issued-day")).to_be_visible()

    expect(
        page.get_by_role("button", name="Search")
    ).to_be_visible()


def test_empty_search_shows_error(search_page: Page):
    page = search_page

    page.get_by_role("button", name="Search").click()

    expect(
        page.get_by_text("There is a problem")
    ).to_be_visible()

    expect(
        page.get_by_text("You must complete at least one search field")
    ).to_be_visible()


def test_user_can_search_by_name(search_page: Page):
    page = search_page

    page.locator("#name").fill("John Smith")

    page.get_by_role("button", name="Search").click()

    expect(page).to_have_url(
        re.compile(r"submitted=true")
    )


def test_search_results_are_displayed(search_page: Page):
    page = search_page

    page.locator("#name").fill("John")

    page.get_by_role("button", name="Search").click()

    expect(
        page.locator(".govuk-table")
    ).to_be_visible()

    expect(
        page.get_by_text("Client search results")
    ).to_be_visible()


def test_results_table_contains_expected_columns(search_page: Page):
    page = search_page

    page.locator("#name").fill("John")

    page.get_by_role("button", name="Search").click()

    expect(
        page.get_by_role("columnheader", name="Name")
    ).to_be_visible()

    expect(
        page.get_by_role("columnheader", name="Phone number")
    ).to_be_visible()

    expect(
        page.get_by_role("columnheader", name="Post code")
    ).to_be_visible()

    expect(
        page.get_by_role("columnheader", name="Date of birth")
    ).to_be_visible()


def test_pagination_next_button(search_page: Page):
    page = search_page

    page.locator("#name").fill("John")

    page.get_by_role("button", name="Search").click()

    next_button = page.get_by_role(
        "link",
        name="Next"
    )

    if next_button.is_visible():
        next_button.click()

        expect(
            page.locator(".moj-pagination")
        ).to_be_visible()


def test_clear_all_link_clears_fields(search_page: Page):
    page = search_page

    page.locator("#name").fill("John Smith")
    page.locator("#phone").fill("0123456789")
    page.locator("#postcode").fill("B1 1AA")
    page.locator("#date_of_birth-issued-day").fill("17/05/2024") 
    page.locator("#date_of_birth-issued-month").fill("17/05/2024")
    page.locator("#date_of_birth-issued-year").fill("17/05/2024")

    page.locator("#clear-all-link").click()

    expect(
        page.locator("#name")
    ).to_have_value("")

    expect(
        page.locator("#phone")
    ).to_have_value("")

    expect(
        page.locator("#postcode")
    ).to_have_value("")

    expect(
        page.locator("#date_of_birth-issued-day")
    ).to_have_value("")
    expect(
        page.locator("#date_of_birth-issued-month")
    ).to_have_value("")
    expect(
        page.locator("#date_of_birth-issued-year")
    ).to_have_value("")


def test_back_link_navigates_to_receive_calls(search_page: Page):
    page = search_page

    page.locator("a.govuk-back-link").click()

    expect(page).to_have_url(
        re.compile(r"/") # back to the home page for now 
    )


def test_search_results_return_20_results_per_page(search_page: Page):
    page = search_page

    page.locator("#name").fill("John")

    page.get_by_role("button", name="Search").click()

    results_table = page.locator(".govuk-table")

    expect(results_table).to_be_visible()

    result_rows = results_table.locator("tbody tr")

    expect(result_rows).to_have_count(20)