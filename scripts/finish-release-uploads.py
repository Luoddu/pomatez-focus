"""Finish all pending release uploads with unbounded retries.

Uploads (idempotent — skips assets already uploaded with matching size):
  - release 46 (393486000): setup.exe, portable.exe, preview.yml from dist-preview46
  - release 45 (393416797): setup.exe, portable.exe from dist-preview45c
    (preview.yml for 45 is already uploaded)

Log: artifacts/upload-worker.log  (poll this file)
Done marker: prints ALL DONE and exits 0.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

up = import_module("upload-asset-socks5")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN = os.environ["GITHUB_TOKEN"]

JOBS = [
    (
        "393486000",
        os.path.join(ROOT, "app/electron/dist-preview46/Pomatez-Focus-v0.1.0-preview.46-win-x64-setup.exe"),
        "Pomatez-Focus-v0.1.0-preview.46-win-x64-setup.exe",
    ),
    (
        "393486000",
        os.path.join(ROOT, "app/electron/dist-preview46/Pomatez-Focus-v0.1.0-preview.46-win-x64-portable.exe"),
        "Pomatez-Focus-v0.1.0-preview.46-win-x64-portable.exe",
    ),
    (
        "393486000",
        os.path.join(ROOT, "app/electron/dist-preview46/preview.yml"),
        "preview.yml",
    ),
    (
        "393416797",
        os.path.join(ROOT, "app/electron/dist-preview45c/Pomatez-Focus-v0.1.0-preview.45-win-x64-setup.exe"),
        "Pomatez-Focus-v0.1.0-preview.45-win-x64-setup.exe",
    ),
    (
        "393416797",
        os.path.join(ROOT, "app/electron/dist-preview45c/Pomatez-Focus-v0.1.0-preview.45-win-x64-portable.exe"),
        "Pomatez-Focus-v0.1.0-preview.45-win-x64-portable.exe",
    ),
]

DEADLINE = time.time() + 45 * 60


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def asset_done(release_id, name, size):
    try:
        st, body = up.api_call(
            "GET", "api.github.com",
            f"/repos/{up.REPO}/releases/{release_id}/assets", TOKEN,
        )
        if st != 200:
            return False
        import json

        return any(
            a["name"] == name and a["state"] == "uploaded" and a["size"] == size
            for a in json.loads(body)
        )
    except Exception as e:  # noqa: BLE001
        log(f"check {name}: {type(e).__name__}: {e}")
        return False


def main():
    pending = list(JOBS)
    rnd = 0
    while pending and time.time() < DEADLINE:
        rnd += 1
        still = []
        for release_id, path, name in pending:
            size = os.path.getsize(path)
            if asset_done(release_id, name, size):
                log(f"SKIP {name} (already uploaded)")
                continue
            try:
                log(f"round {rnd}: uploading {name} ({size >> 20}MB) -> release {release_id}")
                if up.drop_stale_asset(name, TOKEN, release_id, size):
                    continue
                status, body = up.upload(path, name, TOKEN, release_id)
                if status in (200, 201):
                    log(f"OK {name}")
                else:
                    log(f"HTTP {status}: {body[:150]!r}")
                    still.append((release_id, path, name))
            except Exception as e:  # noqa: BLE001
                log(f"{type(e).__name__}: {e}")
                still.append((release_id, path, name))
            time.sleep(2)
        pending = still
        if pending:
            time.sleep(5)
    if pending:
        log(f"GAVE UP, remaining: {[n for _, _, n in pending]}")
        return 1
    log("ALL DONE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
