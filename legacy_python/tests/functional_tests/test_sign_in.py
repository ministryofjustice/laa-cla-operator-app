from playwright.sync_api import Page, expect

BASE_URL = "http://127.0.0.1:8030"


def test_sign_in_page_loads(page: Page):
    page.goto(f"{BASE_URL}/sign-in")

    expect(
        page.get_by_role(
            "heading", name="Assess and refer for civil legal advice", level=1
        )
    ).to_be_visible()

    expect(page.get_by_role("button", name="Sign in")).to_be_visible()


def test_sign_in_redirects_to_microsoft(page: Page):
    page.goto(f"{BASE_URL}/sign-in")

    sign_in_button = page.get_by_role("button", name="Sign in")
    expect(sign_in_button).to_be_visible()

    intercepted = {}

    def handle_route(route):
        intercepted["url"] = route.request.url
        route.fulfill(status=200, body="intercepted")

    page.route("**login.microsoftonline.com**", handle_route)

    sign_in_button.click()

    page.wait_for_timeout(500)

    assert "url" in intercepted
    assert "login.microsoftonline.com" in intercepted["url"]
    assert "client_id=" in intercepted["url"]
    assert "response_type=code" in intercepted["url"]
