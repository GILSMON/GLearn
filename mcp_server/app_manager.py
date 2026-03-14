"""Manages starting and stopping the FastAPI backend and Vite frontend."""
import os
import signal
import socket
import subprocess
from pathlib import Path

BASE = Path(__file__).parent.parent
BACKEND_DIR = BASE / "backend"
FRONTEND_DIR = BASE / "frontend"

BACKEND_PORT = 8005
FRONTEND_PORT = 5176

# stdin=subprocess.DEVNULL is critical — without it child processes inherit
# the MCP server's stdin, corrupting the stdio transport.
_POPEN_BASE = dict(
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    stdin=subprocess.DEVNULL,
    close_fds=True,
)


def _pids_on_port(port: int) -> list[int]:
    result = subprocess.run(
        ["lsof", "-ti", f":{port}"],
        capture_output=True, text=True
    )
    return [int(p) for p in result.stdout.split() if p.strip()]


def _kill_port(port: int) -> bool:
    pids = _pids_on_port(port)
    if not pids:
        return False
    for pid in pids:
        try:
            pgid = os.getpgid(pid)
            os.killpg(pgid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    return True


def _port_in_use(port: int) -> bool:
    return bool(_pids_on_port(port))


def _local_ip() -> str:
    """Return the machine's LAN IP (e.g. 192.168.x.x)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "localhost"


def start_app() -> str:
    msgs = []
    ip = _local_ip()

    if _port_in_use(BACKEND_PORT):
        msgs.append(
            f"Backend already running\n"
            f"  Local:   http://localhost:{BACKEND_PORT}\n"
            f"  Network: http://{ip}:{BACKEND_PORT}"
        )
    else:
        subprocess.Popen(
            [
                str(BACKEND_DIR / ".venv" / "bin" / "uvicorn"),
                "main:app",
                "--host", "0.0.0.0",
                "--port", str(BACKEND_PORT),
                "--reload",
            ],
            cwd=str(BACKEND_DIR),
            **_POPEN_BASE,
        )
        msgs.append(
            f"Backend started\n"
            f"  Local:   http://localhost:{BACKEND_PORT}\n"
            f"  Network: http://{ip}:{BACKEND_PORT}"
        )

    if _port_in_use(FRONTEND_PORT):
        msgs.append(
            f"Frontend already running\n"
            f"  Local:   http://localhost:{FRONTEND_PORT}\n"
            f"  Network: http://{ip}:{FRONTEND_PORT}"
        )
    else:
        subprocess.Popen(
            ["npm", "run", "dev", "--", "--host", "0.0.0.0"],
            cwd=str(FRONTEND_DIR),
            **_POPEN_BASE,
        )
        msgs.append(
            f"Frontend started\n"
            f"  Local:   http://localhost:{FRONTEND_PORT}\n"
            f"  Network: http://{ip}:{FRONTEND_PORT}"
        )

    return "\n".join(msgs)


def stop_app() -> str:
    msgs = []

    if _kill_port(BACKEND_PORT):
        msgs.append(f"Backend stopped (port {BACKEND_PORT}).")
    else:
        msgs.append(f"Backend was not running (port {BACKEND_PORT}).")

    if _kill_port(FRONTEND_PORT):
        msgs.append(f"Frontend stopped (port {FRONTEND_PORT}).")
    else:
        msgs.append(f"Frontend was not running (port {FRONTEND_PORT}).")

    return "\n".join(msgs)


def app_status() -> str:
    ip = _local_ip()
    be = _port_in_use(BACKEND_PORT)
    fe = _port_in_use(FRONTEND_PORT)
    lines = [
        f"Backend  (:{BACKEND_PORT}): {'running' if be else 'stopped'}"
        + (f"\n  Local:   http://localhost:{BACKEND_PORT}\n  Network: http://{ip}:{BACKEND_PORT}" if be else ""),
        f"Frontend (:{FRONTEND_PORT}): {'running' if fe else 'stopped'}"
        + (f"\n  Local:   http://localhost:{FRONTEND_PORT}\n  Network: http://{ip}:{FRONTEND_PORT}" if fe else ""),
    ]
    return "\n".join(lines)
