from functools import wraps
import logging
import time
from flask import redirect, url_for, flash

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    force=True
)

logger = logging.getLogger(__name__)


def applogs(fallback, message):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                result = func(*args, **kwargs)

                exec_time = time.time() - start_time

                logger.info(
                    "Function '%s' executed successfully in %.4f seconds",
                    func.__name__,
                    exec_time
                )

                return result

            except Exception as e:
                exec_time = time.time() - start_time

                logger.exception(
                    "Error executing '%s' after %.4f seconds: %s",
                    func.__name__,
                    exec_time,
                    e
                )

                flash(message, "error")
                return redirect(url_for(fallback))

        return wrapper

    return decorator