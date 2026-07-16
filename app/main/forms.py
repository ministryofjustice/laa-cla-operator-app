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




class SearchForm(FlaskForm):

    name = StringField(
        "Name",
        validators=[
            InputRequired(message="Please enter at least 1 character for the name")
        ],
    )

    phone_number = StringField(
        "Phone number",
        validators=[
            InputRequired(message="Please enter at least 1 character for the phone number")
        ],
    )

    post_code = StringField(
        "Post code",
        validators=[
            InputRequired(message="Please enter at least 1 character for the post code")
        ],
    )

    date_of_birth = StringField(
        "Date of birth",
        validators=[
            InputRequired(message="Please enter at least 1 character for the date of birth")
        ],
    )

    submit = SubmitField("Continue", widget=GovSubmitInput())