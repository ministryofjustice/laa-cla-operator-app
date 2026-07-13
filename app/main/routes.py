from jinja2 import TemplateNotFound

from flask import flash, json, make_response, redirect, render_template, request, url_for
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

from app.main import bp
from app.main.forms import CookiesForm, WhosCallingForm
from app.services.search import search

@bp.route("/")
def index():
    return render_template("index.html")


@bp.route("/accessibility")
def accessibility():
    return render_template("accessibility.html")


@bp.route("/cookies", methods=["GET", "POST"])
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
        response = make_response(render_template("cookies.html", form=form))

        # Set cookies policy for one year
        response.set_cookie(
            "cookies_policy",
            json.dumps(cookies_policy),
            max_age=31557600,
            secure=True,
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
    return render_template("cookies.html", form=form)


@bp.route("/privacy")
def privacy():
    return render_template("privacy.html")

@bp.route("/receive-call", methods=["GET", "POST"])
def receive_call():
    form = WhosCallingForm()
    if form.validate_on_submit():
        # TODO: route "myself" vs "another" once the next step exists
        return redirect(url_for("main.receive_call"))
    return render_template("receive-call.html", form=form)


@bp.route("/search-client")
def search_user():

    return search.search()



@bp.route("/health")
def health():
    """Liveness probe endpoint - checks if the application is running"""
    return {"status": "healthy"}, 200


@bp.route("/ready")
def ready():
    """Readiness probe endpoint - checks if the application is ready to serve traffic"""
    # Add any checks here for dependencies (database, cache, etc.)
    # For now, if the app is running, it's ready
    return {"status": "ready"}, 200


@bp.app_errorhandler(HTTPException)
def http_exception(error):
    try:
        return render_template(f"errors/{error.code}.html"), error.code
    except TemplateNotFound:
        return render_template("errors/500.html"), error.code


@bp.app_errorhandler(CSRFError)
def csrf_error(error):
    flash("The form you were submitting has expired. Please try again.")
    return redirect(request.full_path)
