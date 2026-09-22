"""Upload a GitHub release asset through a local SOCKS5 proxy using Python ssl
(OpenSSL) instead of curl's schannel, which stalls on large POSTs here.

Usage: python scripts/upload-asset-socks5.py <file> <asset_name> [release_id]
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


def upload(path, name, token, release_id):
    size = os.path.getsize(path)
    sock = socks5_connect(HOST, 443, timeout=60)
    sock.settimeout(180)
    ctx = ssl.create_default_context()
    tls = ctx.wrap_socket(sock, server_hostname=HOST)
    path_q = f"/repos/{REPO}/releases/{release_id}/assets?name={name}"
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
    # read response (until close; GitHub 成功响应是 chunked 编码)
    buf = b""
    while b"\r\n\r\n" not in buf:
        data = tls.recv(4096)
        if not data:
            break
        buf += data
    head, _, body = buf.partition(b"\r\n\r\n")
    status = int(head.split(b" ")[1])
    while True:
        try:
            data = tls.recv(65536)
        except (ssl.SSLError, OSError):
            break
        if not data:
            break
        body += data
    tls.close()
    # 解 chunked 帧；非 chunked 则原样返回
    if b"transfer-encoding: chunked" in head.lower():
        out = b""
        i = 0
        while i < len(body):
            j = body.find(b"\r\n", i)
            if j < 0:
                break
            try:
                n = int(body[i:j].split(b";")[0], 16)
            except ValueError:
                break
            if n == 0:
                break
            out += body[j + 2 : j + 2 + n]
            i = j + 2 + n + 2
        body = out
    return status, body


def api_call(method, host, path, token, timeout=60):
    """Small API call over the same SOCKS5+TLS channel."""
    sock = socks5_connect(host, 443, timeout=30)
    sock.settimeout(timeout)
    tls = ssl.create_default_context().wrap_socket(sock, server_hostname=host)
    tls.sendall(
        (
            f"{method} {path} HTTP/1.1\r\nHost: {host}\r\n"
            f"Authorization: Bearer {token}\r\nUser-Agent: kimi-upload/1.0\r\n"
            f"Accept: application/vnd.github+json\r\nConnection: close\r\n\r\n"
        ).encode()
    )
    resp = b""
    while True:
        d = tls.recv(65536)
        if not d:
            break
        resp += d
    tls.close()
    head, _, body = resp.partition(b"\r\n\r\n")
    return int(head.split(b" ")[1]), body


def drop_stale_asset(name, token, release_id, size):
    """清理同名残留资产；已完整上传（uploaded 且大小一致）则直接视为成功。"""
    st, body = api_call(
        "GET", "api.github.com",
        f"/repos/{REPO}/releases/{release_id}/assets", token,
    )
    if st != 200:
        return False
    for a in json.loads(body):
        if a["name"] != name:
            continue
        if a["state"] == "uploaded" and a["size"] == size:
            print(f"already uploaded: id={a['id']} size={a['size']}", flush=True)
            return True
        api_call(
            "DELETE", "api.github.com",
            f"/repos/{REPO}/releases/assets/{a['id']}", token,
        )
        print(f"dropped stale asset {a['id']} ({a['state']})", flush=True)
    return False


def main():
    path, name = sys.argv[1], sys.argv[2]
    release_id = sys.argv[3] if len(sys.argv) > 3 else "393416797"
    token = os.environ["GITHUB_TOKEN"]
    size = os.path.getsize(path)
    for attempt in range(1, 9):
        try:
            if drop_stale_asset(name, token, release_id, size):
                return 0
            status, body = upload(path, name, token, release_id)
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
