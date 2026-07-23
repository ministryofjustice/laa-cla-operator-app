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

from app.main.forms import CookiesForm, WhosCallingForm, ClientSearchQuery, SearchUser


def register_routes(app):
    @app.route("/", methods=["GET", "POST"])
    def receive_call():
        form = WhosCallingForm()

        if request.method == "GET":
            form.whos_calling.data = session.get("who_is_calling")

        if form.validate_on_submit():
            session["who_is_calling"] = form.whos_calling.data
            # TODO: route "myself" vs "another" once the next step exists
            return redirect(url_for("search_client"))
        return render_template("main/index.html", form=form)

    @app.route("/search-client", methods=["GET"])
    def search_client():
        form = SearchUser(request.args, meta={"csrf": False})
        submitted = request.args.get("submitted") == "true"
        who_is_calling = session.get("who_is_calling")
        is_calling_for_another = who_is_calling == "another"

        if not submitted:
            return render_template(
                "services/search.html",
                search={},
                form=form,
                who_is_calling=who_is_calling,
                is_calling_for_another=is_calling_for_another,
            )
        if not form.validate():
            return render_template(
                "services/search.html",
                search={"error": True},
                form=form,
                who_is_calling=who_is_calling,
                is_calling_for_another=is_calling_for_another,
            )

        page = request.args.get("page", 1, type=int)

        name = (form.name.data or "").strip()
        phone = (form.phone.data or "").strip()
        post_code = (form.postcode.data or "").strip()

        day = (form.date_of_birth_day.data or "").strip()
        month = (form.date_of_birth_month.data or "").strip()
        year = (form.date_of_birth_year.data or "").strip()

        date_of_birth = f"{day}/{month}/{year}" if all([day, month, year]) else None

        if not any([name, phone, post_code, day, month, year]):
            search = {"error": True}
            return render_template(
                "services/search.html",
                search=search,
                form=form,
            )

        search = ClientSearchQuery(
            name=name,
            phone_number=phone,
            post_code=post_code,
            date_of_birth=date_of_birth,
            page=page,
        )

        results = search.search()

        return render_template(
            "services/search.html",
            search=results,
            form=form,
        )

    @app.get("/sign-in")
    def sign_in():
        return render_template("auth/sign_in.html")

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
