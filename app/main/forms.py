from govuk_frontend_wtf.wtforms_widgets import (
    GovRadioInput,
    GovSubmitInput,
    GovTextInput,
)
from app.main.utils.widgets import CustomRadioInput
from flask_wtf import FlaskForm
from wtforms import RadioField, StringField, SubmitField
from datetime import datetime
from wtforms.validators import Optional, Regexp, InputRequired


class CookiesForm(FlaskForm):
    functional = RadioField(
        "Do you want to accept functional cookies?",
        widget=GovRadioInput(),
        validators=[
            InputRequired(message="Select yes if you want to accept functional cookies")
        ],
        choices=[("no", "No"), ("yes", "Yes")],
        default="no",
    )
    analytics = RadioField(
        "Do you want to accept analytics cookies?",
        widget=GovRadioInput(),
        validators=[
            InputRequired(message="Select yes if you want to accept analytics cookies")
        ],
        choices=[("no", "No"), ("yes", "Yes")],
        default="no",
    )
    save = SubmitField("Save cookie settings", widget=GovSubmitInput())


class WhosCallingForm(FlaskForm):
    whos_calling = RadioField(
        "Are you calling on behalf of yourself or another person?",
        widget=CustomRadioInput(heading_class="govuk-fieldset__legend--s"),
        validators=[
            InputRequired(message="You must select either 'Myself' or 'Another person'")
        ],
        choices=[("myself", "Myself"), ("another", "Another person")],
    )
    submit = SubmitField("Continue", widget=GovSubmitInput())


class SearchUser(FlaskForm):
    full_name = StringField(
        "What's your name?",
        widget=GovTextInput(),
        validators=[Optional()],
    )

    phone = StringField(
        "What's your phone number?",
        widget=GovTextInput(),
        validators=[
            Optional(),
            Regexp(r"^[0-9+\-\s()]{10,20}$", message="Enter a valid phone number"),
        ],
    )

    postcode = StringField(
        "What's your postcode?",
        widget=GovTextInput(),
        validators=[
            Optional(),
            Regexp(
                r"^(?:[A-Za-z]{1,2}\d[A-Za-z\d]?)(?:\s?\d[A-Za-z]{2})?$",
                message="Enter a valid UK postcode",
            ),
        ],
    )

    date_of_birth_day = StringField(
        "Day",
        validators=[
            Optional(),
            Regexp(r"^(0?[1-9]|[12][0-9]|3[01])$", message="Enter a valid day"),
        ],
    )
    date_of_birth_month = StringField(
        "Month",
        validators=[
            Optional(),
            Regexp(r"^(0?[1-9]|1[0-2])$", message="Enter a valid month"),
        ],
    )
    date_of_birth_year = StringField(
        "Year",
        validators=[
            Optional(),
            Regexp(r"^\d{4}$", message="Enter a valid year"),
        ],
    )
    submit = SubmitField("Continue", widget=GovSubmitInput())

    def validate(self, extra_validators=None):
        # Run standard per-field validation first
        if not super().validate(extra_validators=extra_validators):
            return False

        day = self.date_of_birth_day.data
        month = self.date_of_birth_month.data
        year = self.date_of_birth_year.data

        if not any([day, month, year]):
            return True  # no DOB entered — fine

        if not all([day, month, year]):
            self.date_of_birth_year.errors.append("Enter a complete date of birth")
            return False

        try:
            datetime(int(year), int(month), int(day))
        except ValueError:
            self.date_of_birth_year.errors.append("Enter a valid date of birth")
            return False

        return True
