import re

from playwright.sync_api import Page, expect


def test_sign_in(page: Page, base_url: str) -> None:
    page.goto("/sign-in")

    # Check we're on the sign-in page (target only the main H1)
    expect(
        page.get_by_role(
            "heading",
            level=1,
            name="Assess and refer for civil legal advice",
            exact=True,
        )
    ).to_be_visible()

    sign_in_link = page.get_by_role("button", name="Sign in")
    sign_in_href = sign_in_link.get_attribute("href") or ""

    # In local no-auth mode, the sign-in button goes straight into the app.
    if sign_in_href.endswith("/receive-call"):
        sign_in_link.click()
        expect(page).to_have_url(re.compile(r".*/(receive-call)?$"))
        expect(
            page.get_by_role(
                "heading",
                level=1,
                name="Taking calls from clients",
                exact=True,
            )
        ).to_be_visible()
        return

    # In Entra mode, the sign-in button starts the OAuth redirect flow.
    sign_in_link.click()
    expect(page).to_have_url(
        re.compile(
            r"(login\.microsoftonline\.com|/auth/login|/sign-in|/receive-call|/$)"
        )
    )
