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

    # Click the Sign in button
    page.get_by_role("button", name="Sign in").click()

    # Check we've been redirected to the home page
    expect(page).to_have_url(f"{base_url}/")
    expect(
        page.get_by_role(
            "heading",
            level=1,
            name="Taking calls from clients",
            exact=True,
        )
    ).to_be_visible()