from govuk_frontend_wtf.wtforms_widgets import GovRadioInput, GovSubmitInput,GovTextInput
from app.main.utils.widgets import CustomRadioInput
from flask_wtf import FlaskForm
from wtforms import RadioField, StringField, SubmitField
import random
from datetime import date, timedelta, datetime
from wtforms.validators import Optional, Regexp, Length, ValidationError, InputRequired


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
    name = StringField(
        "What's your name?",
        widget=GovTextInput(),
        validators=[
            Optional(),
            Length(min=2, max=100, message="Name must be between 2 and 100 characters"),
        ],
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
                r"^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$",
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

class ClientSearchQuery:
    def __init__(self, name: str, phone_number: str, post_code: str, date_of_birth: str, page: int = 1):
        self.name = name
        self.phone_number = phone_number
        self.post_code = post_code
        self.date_of_birth = date_of_birth
        self.page = page

    def search(self):
        last_names = [
            "Smith", "Jones", "Taylor", "Brown", "Williams",
            "Wilson", "Johnson", "Davies", "Robinson", "Wright",
            "Thompson", "Evans", "Walker", "White", "Roberts",
        ]
        postcode_areas = ["TA44", "SW1A", "M1", "B33", "LS1", "EH1", "CF10", "NE1", "G1"]
        postcode_letters = "ABDEFGHJLNPQRSTUWXYZ"

        has_last_name = bool(getattr(self, "last_name", None))
        today = date.today()

        # Fixed dataset size: always 50 results, 10 per page
        total_records = 50
        per_page = 20

        # Guard: coerce page to a valid int, default to 1 if missing/invalid
        try:
            page = int(self.page)
        except (TypeError, ValueError):
            page = 1

        total_pages = max(1, (total_records + per_page - 1) // per_page)
        page = max(1, min(page, total_pages))  # clamp to valid range

        start_index = (page - 1) * per_page
        end_index = min(start_index + per_page, total_records)
        records_on_page = end_index - start_index

        record = []
        for i in range(1, records_on_page + 1):
            # name
            if has_last_name:
                full_name = self.name
            else:
                full_name = f"{self.name} {random.choice(last_names)}"

            # phone
            if self.phone_number:
                phone = self.phone_number
            else:
                phone = "07" + "".join(str(random.randint(0, 9)) for _ in range(9))

            # postcode
            if self.post_code:
                postcode = self.post_code
            else:
                area = random.choice(postcode_areas)
                letters = "".join(random.choice(postcode_letters) for _ in range(2))
                postcode = f"{area} {random.randint(1, 9)}{letters}"

            # dob
            if self.date_of_birth:
                dob = self.date_of_birth
            else:
                age_days = random.randint(18 * 365, 80 * 365)
                dob = (today - timedelta(days=age_days)).strftime("%d/%m/%Y")

            record.append({
                "id": start_index + i,
                "name": full_name,
                "phone": phone,
                "postcode": postcode,
                "dob": dob,
            })

        return {
            "result": record,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "total_records": total_records,
                "start": start_index + 1,
                "end": end_index,
            },
        }