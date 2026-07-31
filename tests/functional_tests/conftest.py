import re

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def authenticated_page(page: Page, base_url: str) -> Page:
    """Sign in through the UI and assert we land on receive-call in local mock mode."""
    page.goto("/sign-in")

    sign_in_button = page.get_by_role("button", name="Sign in")
    expect(sign_in_button).to_be_visible()
    sign_in_button.click()

    expect(page).to_have_url(re.compile(r".*/receive-call/?$"))
    expect(
        page.get_by_role(
            "heading",
            level=1,
            name="Taking calls from clients",
            exact=True,
        )
    ).to_be_visible()

    return page
