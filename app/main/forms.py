from govuk_frontend_wtf.wtforms_widgets import GovRadioInput, GovSubmitInput
from app.main.utils.widgets import CustomRadioInput
from flask_wtf import FlaskForm
from wtforms import RadioField, StringField, SubmitField
from wtforms.validators import InputRequired

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




import random


class SearchForm:
    def __init__(self, name: str, phone_number: str, post_code: str, date_of_birth: str):
        self.name = name
        self.phone_number = phone_number
        self.post_code = post_code
        self.date_of_birth = date_of_birth

    def search(self):
        # Placeholder record shaped to match the results table.
       
        record = {
            "id": 1,
            "name": self.name,
            "phone": self.phone_number if self.phone_number else 8895957959,
            "postcode": self.post_code if self.post_code else "TA44 7YU",
            "dob": self.date_of_birth if self.date_of_birth else "27/09/2000",

        }

        found = random.choice([True, False])
        return {"result": [record] if found else []}