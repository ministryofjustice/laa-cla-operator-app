from playwright.sync_api import Page, expect


# Simple test to check receive-call page is loading correctly
# Once we progress, this test will be updated to check the flow
def test_receive_call_page(page: Page, base_url: str) -> None:
    page.goto("/receive-call")

    expect(
        page.get_by_role(
            "heading",
            level=1,
            name="Taking calls from clients",
            exact=True,
        )
    ).to_be_visible()

    receive_calls_link = page.get_by_role("link", name="Receive calls")
    expect(receive_calls_link).to_be_visible()
    expect(receive_calls_link).to_have_attribute("aria-current", "page")


def test_receive_call_radios_selectable(page: Page, base_url: str) -> None:
    page.goto("/receive-call")

    myself_radio = page.get_by_role("radio", name="Myself")
    another_radio = page.get_by_role("radio", name="Another person")

    expect(myself_radio).to_be_enabled()
    expect(another_radio).to_be_enabled()
    expect(myself_radio).not_to_be_checked()
    expect(another_radio).not_to_be_checked()

    myself_radio.check()
    expect(myself_radio).to_be_checked()
    expect(another_radio).not_to_be_checked()

    another_radio.check()
    expect(another_radio).to_be_checked()
    expect(myself_radio).not_to_be_checked()


def test_receive_call_continue_button_clickable(page: Page, base_url: str) -> None:
    page.goto("/receive-call")

    continue_button = page.get_by_role("button", name="Continue")
    expect(continue_button).to_be_visible()
    expect(continue_button).to_be_enabled()
    continue_button.click()
