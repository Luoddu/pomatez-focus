"""Upload a GitHub release asset through a local SOCKS5 proxy using Python ssl
(OpenSSL) instead of curl's schannel, which stalls on large POSTs here.

Usage: python scripts/upload-asset-socks5.py <file> <asset_name>
Env: GITHUB_TOKEN required.
"""
import json
import os
import socket
import ssl
import struct
import sys
import time

SOCKS = ("127.0.0.1", 7891)
HOST = "uploads.github.com"
REPO = "Luoddu/pomatez-focus"
RELEASE_ID = 393416797


def socks5_connect(host, port, timeout=30):
    s = socket.create_connection(SOCKS, timeout=timeout)
    # greeting: no auth
    s.sendall(b"\x05\x01\x00")
    resp = s.recv(2)
    if resp != b"\x05\x00":
        raise RuntimeError(f"socks5 auth failed: {resp!r}")
    hb = host.encode("idna")
    req = b"\x05\x01\x00\x03" + bytes([len(hb)]) + hb + struct.pack(">H", port)
    s.sendall(req)
    resp = s.recv(4)
    if resp[1] != 0:
        raise RuntimeError(f"socks5 connect failed: {resp!r}")
    atyp = resp[3]
    if atyp == 1:
        s.recv(4)
    elif atyp == 3:
        ln = s.recv(1)[0]
        s.recv(ln)
    else:
        s.recv(16)
    s.recv(2)
    return s


def upload(path, name, token):
    size = os.path.getsize(path)
    sock = socks5_connect(HOST, 443, timeout=60)
    sock.settimeout(180)
    ctx = ssl.create_default_context()
    tls = ctx.wrap_socket(sock, server_hostname=HOST)
    path_q = f"/repos/{REPO}/releases/{RELEASE_ID}/assets?name={name}"
    headers = (
        f"POST {path_q} HTTP/1.1\r\n"
        f"Host: {HOST}\r\n"
        f"Authorization: Bearer {token}\r\n"
        f"User-Agent: kimi-upload/1.0\r\n"
        f"Accept: application/vnd.github+json\r\n"
        f"Content-Type: application/octet-stream\r\n"
        f"Content-Length: {size}\r\n"
        f"Connection: close\r\n\r\n"
    )
    tls.sendall(headers.encode())
    sent = 0
    next_mark = 8 << 20
    t0 = time.time()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1 << 16)
            if not chunk:
                break
            tls.sendall(chunk)
            sent += len(chunk)
            if sent >= next_mark:
                print(f"  sent {sent >> 20}MB / {size >> 20}MB ({sent / max(time.time() - t0, 0.1) / 1024:.0f} KB/s)", flush=True)
                next_mark += 8 << 20
    # read response
    buf = b""
    while b"\r\n\r\n" not in buf:
        data = tls.recv(4096)
        if not data:
            break
        buf += data
    head, _, body = buf.partition(b"\r\n\r\n")
    status = int(head.split(b" ")[1])
    # read rest (content-length based)
    clen = 0
    for line in head.split(b"\r\n"):
        if line.lower().startswith(b"content-length:"):
            clen = int(line.split(b":")[1].strip())
    while len(body) < clen:
        data = tls.recv(65536)
        if not data:
            break
        body += data
    tls.close()
    return status, body


def main():
    path, name = sys.argv[1], sys.argv[2]
    token = os.environ["GITHUB_TOKEN"]
    for attempt in range(1, 9):
        try:
            status, body = upload(path, name, token)
            if status in (200, 201):
                d = json.loads(body)
                print(f"OK {name}: state={d['state']} size={d['size']} id={d['id']}")
                return 0
            print(f"attempt {attempt}: HTTP {status}: {body[:200]!r}", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"attempt {attempt}: {type(e).__name__}: {e}", flush=True)
        time.sleep(3 * attempt)
    return 1


if __name__ == "__main__":
    sys.exit(main())
