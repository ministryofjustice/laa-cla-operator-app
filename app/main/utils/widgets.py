from govuk_frontend_wtf.wtforms_widgets import GovRadioInput


class CustomRadioInput(GovRadioInput):
    """
    Adds additional functionality to the GovUK Input widgets, allowing these to be set on a form by form basis,
    rather being required to be passed in to the widget when it is loaded via the template.
    """

    def __init__(self, heading_class: str = None, **kwargs):
        super().__init__(**kwargs)
        self.heading_class = heading_class

    def map_gov_params(self, field, **kwargs):
        params = super().map_gov_params(field, **kwargs)
        if self.heading_class:
            params["fieldset"]["legend"]["classes"] = self.heading_class
        return params
