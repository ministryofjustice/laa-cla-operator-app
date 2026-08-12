from pathlib import Path
import sys
import threading
import time
import socket
import pytest
from werkzeug.serving import make_server

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(scope="session", autouse=True)
def live_server(request):
    from app import create_app

    host = "127.0.0.1"
    port = 8030  # match setup.cfg base_url
    app = create_app()
    app.config["TESTING"] = True

    server = make_server(host, port, app)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    deadline = time.time() + 5
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.05)

    yield

    server.shutdown()
    thread.join(timeout=2)
