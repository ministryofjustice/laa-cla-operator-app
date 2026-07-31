from pathlib import Path
import sys

# Ensure local package imports (e.g. app.main) work no matter how pytest is invoked.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
