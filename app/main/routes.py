from flask import (
    flash,
    json,
    make_response,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

from app.main.forms import CookiesForm, WhosCallingForm


def register_routes(app):
    @app.route("/", methods=["GET", "POST"])
    def receive_call():
        form = WhosCallingForm()
        if form.validate_on_submit():
            # TODO: route "myself" vs "another" once the next step exists
            return redirect(url_for("receive_call"))
        return render_template("main/index.html", form=form)

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