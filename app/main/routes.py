from flask import (
    flash,
    json,
    make_response,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

from app.main.client_api import create_case
from app.main.client_api import search_clients
from app.main.entra_auth import EntraAuthView
from app.main.forms import CookiesForm, StartCaseForm, WhosCallingForm, SearchUser


def _build_backend_date(year: str, month: str, day: str) -> str | None:
    if not all([year, month, day]):
        return None
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def register_routes(app):
    mock_auth_enabled = app.config.get("ENTRA_AUTH_MOCK_ENABLED") and app.config.get("ENVIRONMENT") == "local"

    def _seed_mock_entra_session() -> None:
        session["entra_access_token"] = "test-access-token"
        session["id_token_claims"] = {
            "preferred_username": "functional-test@local",
            "APP_ROLES": ["Civil Legal Advice - Helpline Operator Manager"],
            "LAA_ACCOUNTS": ["TEST"],
        }
        session["user"] = {
            "username": "functional-test@local",
            "roles": ["Civil Legal Advice - Helpline Operator Manager"],
            "ui_access": ["operator"],
            "is_manager": True,
            "office_codes": ["TEST"],
        }

    @app.before_request
    def require_authentication():
    # ==========================
    # This is a Basic Entra auth to connect A&R with backend seamlessly.
    # ==========================
        if not EntraAuthView.configured():
            return None

        if mock_auth_enabled and not EntraAuthView.authenticated():
            _seed_mock_entra_session()

        if EntraAuthView.authenticated():
            return None

        public_endpoints = {
            "sign_in",
            "signed_out",
            "auth_login",
            "entra_callback",
            "auth_logout",
            "status",
            "static",
        }
        if request.endpoint in public_endpoints:
            return None

        if request.path.startswith("/assets/"):
            return None

        return redirect(url_for("sign_in"))

    @app.get("/auth/login")
    def auth_login():
        if mock_auth_enabled:
            _seed_mock_entra_session()
            return redirect(url_for("receive_call"))
        return EntraAuthView.route_login()

    def entra_callback():
        return EntraAuthView.route_callback()

    callback_path = (
        app.config.get("ENTRA_REDIRECT_PATH", "") or ""
    ).strip() or "/auth/entra-callback"
    if not callback_path.startswith("/"):
        callback_path = f"/{callback_path}"
    app.add_url_rule(
        callback_path,
        endpoint="entra_callback",
        view_func=entra_callback,
        methods=["GET"],
    )

    @app.get("/auth/logout")
    def auth_logout():
        return EntraAuthView.route_logout()

    @app.route("/", methods=["GET", "POST"])
    @app.route("/receive-call", methods=["GET", "POST"])
    def receive_call():
        form = WhosCallingForm()
        if form.validate_on_submit():
            session["call_context"] = {"whos_calling": form.whos_calling.data}
            return redirect(url_for("search_client"))
        return render_template("main/index.html", form=form)


    @app.route("/search-client", methods=["GET"])
    def search_client():
        form = SearchUser(request.args, meta={"csrf": False})
        start_case_form = StartCaseForm()

        submitted = request.args.get("submitted") == "true"

        if not submitted:
            return render_template(
                "services/search.html",
                search={},
                form=form,
                start_case_form=start_case_form,
            )
        if not form.validate():
            return render_template(
                "services/search.html",
                search={"error": True},
                form=form,
                start_case_form=start_case_form,
            )

        page = request.args.get("page", 1, type=int)

        full_name = (form.full_name.data or "").strip()
        phone = (form.phone.data or "").strip()
        post_code = (form.postcode.data or "").strip()

        day = (form.date_of_birth_day.data or "").strip()
        month = (form.date_of_birth_month.data or "").strip()
        year = (form.date_of_birth_year.data or "").strip()

        date_of_birth = _build_backend_date(year, month, day)
        print(f"Date of birth: {date_of_birth}")

        if not any([full_name, phone, post_code, day, month, year]):
            search = {"error": True}
            return render_template(
                "services/search.html",
                search=search,
                form=form,
                start_case_form=start_case_form,
            )

        payload = {
            "full_name": full_name,
            "phone": phone,
            "postcode": post_code,
            "date_of_birth": date_of_birth,
            "page": page,
            "call_context": session.get("call_context", {}),
        }
        api_response = search_clients(payload)

        if not api_response["ok"]:
            return render_template(
                "services/search.html",
                search={
                    "error": True,
                    "error_api": True,
                    "error_message": api_response["error"],
                    "result": [],
                    "pagination": {
                        "page": 1,
                        "per_page": 20,
                        "total_pages": 1,
                        "total_records": 0,
                        "start": 0,
                        "end": 0,
                    },
                },
                form=form,
                start_case_form=start_case_form,
            )

        return render_template(
            "services/search.html",
            search=api_response["data"]["search"],
            form=form,
            start_case_form=start_case_form,
        )

    @app.get("/sign-in")
    def sign_in():
        if EntraAuthView.configured():
            sign_in_href = url_for("auth_login")
        else:
            sign_in_href = url_for("receive_call")
        return render_template("auth/sign_in.html", sign_in_href=sign_in_href)

    @app.get("/status")
    def status():
        return "OK"

    @app.get("/help")
    def help():
        return render_template("pages/help.html")

    @app.get("/feedback")
    def feedback():
        return render_template("pages/feedback.html")

    @app.get("/updates")
    def updates():
        return render_template("pages/updates.html")

    @app.get("/accessibility")
    def accessibility():
        return render_template("pages/accessibility.html")

    @app.route("/cookies", methods=["GET", "POST"])
    def cookies():
        form = CookiesForm()
        # Default cookies policy to reject all categories of cookie
        cookies_policy = {"functional": "no", "analytics": "no"}

        if form.validate_on_submit():
            # Update cookies policy consent from form data
            cookies_policy["functional"] = form.functional.data
            cookies_policy["analytics"] = form.analytics.data

            # Create flash message confirmation before rendering template
            flash("You’ve set your cookie preferences.", "success")

            # Create the response so we can set the cookie before returning
            response = make_response(render_template("main/cookies.html", form=form))

            # Set cookies policy for one year
            response.set_cookie(
                "cookies_policy",
                json.dumps(cookies_policy),
                max_age=31557600,
                secure=True,
                samesite="Strict",
            )
            return response
        elif request.method == "GET":
            if request.cookies.get("cookies_policy"):
                # Set cookie consent radios to current consent
                cookies_policy = json.loads(request.cookies.get("cookies_policy"))
                form.functional.data = cookies_policy["functional"]
                form.analytics.data = cookies_policy["analytics"]
            else:
                # If consent not previously set, use default "no" policy
                form.functional.data = cookies_policy["functional"]
                form.analytics.data = cookies_policy["analytics"]
        return render_template("main/cookies.html", form=form)

    @app.get("/privacy")
    def privacy():
        return render_template("main/privacy.html")

    @app.errorhandler(HTTPException)
    def http_exception(error):
        return render_template(f"errors/{error.code}.html"), error.code

    @app.errorhandler(CSRFError)
    def csrf_error(error):
        flash("The form you were submitting has expired. Please try again.")
        return redirect(request.full_path)

    @app.post("/start-case")
    def start_case():
        form = StartCaseForm()

        if not form.validate_on_submit():
            return redirect(url_for("search_client"))

        day = (form.date_of_birth_day.data or "").strip()
        month = (form.date_of_birth_month.data or "").strip()
        year = (form.date_of_birth_year.data or "").strip()

        payload = {
            "full_name": (form.full_name.data or "").strip(),
            "phone": (form.phone.data or "").strip(),
            "postcode": (form.postcode.data or "").strip(),
            "date_of_birth": _build_backend_date(year, month, day) or "",
        }

        api_response = create_case(payload)

        if not api_response["ok"]:
            flash(api_response["error"] or "Create case service unavailable")
            return redirect(url_for("search_client"))

        # keep only non-PII identifiers in session if needed
        case_ref = (api_response.get("data") or {}).get("reference")
        if case_ref:
            session["case_reference"] = case_ref

        created = api_response.get("data") or {}

        prefill = {
            "full_name": created.get("full_name")
            or (form.full_name.data or "").strip(),
            "phone": created.get("phone") or (form.phone.data or "").strip(),
            "postcode": created.get("postcode") or (form.postcode.data or "").strip(),
            "date_of_birth": created.get("date_of_birth")
            or (_build_backend_date(year, month, day) or ""),
        }
        return render_template(
            "services/add_client.html",
            case_reference=case_ref,
            prefill=prefill,
        )
