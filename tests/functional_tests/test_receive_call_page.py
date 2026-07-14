from playwright.sync_api import Page, expect


# Simple test to check that the receive call page is rendered correctly and the buttons work as expected
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

    continue_button = page.get_by_role("button", name="Continue")
    expect(continue_button).to_be_visible()
    expect(continue_button).to_be_enabled()

def test_receive_call_error_message(page: Page, base_url: str) -> None:
    page.goto("/receive-call")

    continue_button = page.get_by_role("button", name="Continue")
    continue_button.click()

    error_summary = page.get_by_role("alert")
    expect(error_summary).to_be_visible()
    expect(error_summary).to_contain_text("You must select either 'Myself' or 'Another person'")

    error_message = page.locator("#whosCalling-error")
    expect(error_message).to_be_visible()
    expect(error_message).to_contain_text("You must select either 'Myself' or 'Another person'")