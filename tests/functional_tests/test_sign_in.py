import re

from playwright.sync_api import Page, expect


def test_sign_in(page: Page, base_url: str) -> None:
    page.goto("/sign-in")

    # Check we're on the sign-in page
    expect(
        page.get_by_role(
            "heading",
            level=1,
            name="Assess and refer for civil legal advice",
            exact=True,
        )
    ).to_be_visible()

    # Click the Sign in button
    page.get_by_role("button", name="Sign in").click()

    # Check we've been redirected to Microsoft Entra ID
    expect(page).to_have_url(re.compile(r"https://login\.microsoftonline\.com/.*"))
