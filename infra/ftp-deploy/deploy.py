#!/usr/bin/env python3
"""Upload apps/web/out to the FTP host. Standard library only, so it also runs on Windows.

Reads FTP_HOST, FTP_USER, FTP_PASS, FTP_REMOTE_DIR, FTP_PORT and FTP_PROTO from the
environment or infra/ftp-deploy/.env (git-ignored).

    python infra/ftp-deploy/deploy.py --dry-run    # show the plan, change nothing
    python infra/ftp-deploy/deploy.py              # upload

Files are removed only inside folders this site owns, plus RETIRED. Anything else in
the web root (.well-known, cgi-bin, host files) is left alone. .htaccess is uploaded
only when its content differs from the server's, and the old one is backed up first:
LiteSpeed re-reads .htaccess only after a restart, so a changed file needs one.
"""
import argparse
import ftplib
import os
import sys
import tempfile
from pathlib import Path, PurePosixPath

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LOCAL = ROOT / "apps" / "web" / "out"
RETIRED = {"talon", "packages"}
IMMUTABLE = "_next/static/"


def load_env() -> None:
    for path in (HERE / ".env", ROOT / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.split(" #")[0].strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def local_files() -> dict[str, int]:
    return {p.relative_to(LOCAL).as_posix(): p.stat().st_size for p in LOCAL.rglob("*") if p.is_file()}


def make_plan(local: dict[str, int], remote: dict[str, int]) -> tuple[list[str], list[str]]:
    """Return (uploads, deletes). Hashed Next assets are skipped when already present."""
    uploads = [f for f in sorted(local) if not (f.startswith(IMMUTABLE) and remote.get(f) == local[f])]
    tops = {f.split("/")[0] for f in local if "/" in f}
    deletes = [f for f in sorted(remote) if f not in local and "/" in f and f.split("/")[0] in tops | RETIRED]
    return uploads, deletes


def fetch_remote(ftp: ftplib.FTP, path: str) -> bytes | None:
    """Return a remote file's bytes, or None when it is not there."""
    chunks: list[bytes] = []
    try:
        ftp.retrbinary(f"RETR {path}", chunks.append)
    except ftplib.error_perm:
        return None
    return b"".join(chunks)


def list_remote(ftp: ftplib.FTP, base: str, top: str, found: dict[str, int]) -> None:
    try:
        entries = list(ftp.mlsd(f"{base}/{top}", facts=["type", "size"]))
    except ftplib.error_perm:
        return  # the folder does not exist yet
    for name, facts in entries:
        if name in (".", ".."):
            continue
        rel = f"{top}/{name}"
        if facts.get("type") == "dir":
            list_remote(ftp, base, rel, found)
        elif facts.get("type") == "file":
            found[rel] = int(facts.get("size", -1))


def ensure_dirs(ftp: ftplib.FTP, base: str, rel: str, made: set[str]) -> None:
    current = base
    for part in PurePosixPath(rel).parent.parts:
        current = f"{current}/{part}"
        if current in made:
            continue
        try:
            ftp.mkd(current)
        except ftplib.error_perm:
            pass  # already there
        made.add(current)


def connect() -> ftplib.FTP:
    secure = os.environ.get("FTP_PROTO", "ftp") == "ftps"
    ftp: ftplib.FTP = ftplib.FTP_TLS() if secure else ftplib.FTP()
    ftp.connect(os.environ["FTP_HOST"], int(os.environ.get("FTP_PORT", "21")), timeout=60)
    ftp.login(os.environ["FTP_USER"], os.environ["FTP_PASS"])
    if isinstance(ftp, ftplib.FTP_TLS):
        ftp.prot_p()
    return ftp


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--first-run", action="store_true", help="allow a web root without index.html")
    args = parser.parse_args()

    load_env()
    missing = [k for k in ("FTP_HOST", "FTP_USER", "FTP_PASS") if not os.environ.get(k)]
    if missing:
        print(f"missing env: {', '.join(missing)}. Fill in infra/ftp-deploy/.env first.", file=sys.stderr)
        return 1
    if not (LOCAL / "index.html").is_file():
        print(f"no build at {LOCAL}. Run the build first.", file=sys.stderr)
        return 1

    base = os.environ.get("FTP_REMOTE_DIR", "/").rstrip("/")
    ftp = connect()
    root_names = {name for name, _ in ftp.mlsd(base or "/", facts=["type"])}
    if "index.html" not in root_names and not args.first_run:
        print(f"{base or '/'} has no index.html, so it may be the wrong folder. Stopping.", file=sys.stderr)
        return 1

    local = local_files()
    remote: dict[str, int] = {}
    for top in sorted({f.split("/")[0] for f in local if "/" in f} | RETIRED):
        if top in root_names:
            list_remote(ftp, base, top, remote)
    uploads, deletes = make_plan(local, remote)

    # .htaccess goes up only when it really changed: LiteSpeed caches it until the
    # host restarts the server, so a pointless re-upload hides which deploy changed it.
    local_htaccess = (LOCAL / ".htaccess").read_bytes() if (LOCAL / ".htaccess").is_file() else None
    remote_htaccess = fetch_remote(ftp, f"{base}/.htaccess") if ".htaccess" in root_names else None
    htaccess_changed = local_htaccess is not None and local_htaccess != remote_htaccess
    if ".htaccess" in uploads and not htaccess_changed:
        uploads.remove(".htaccess")

    print(f"target: {os.environ['FTP_HOST']}:{base or '/'}")
    print(f"upload {len(uploads)} of {len(local)} files, delete {len(deletes)} stale files")
    for name in deletes:
        print(f"  delete {name}")
    print(f"  .htaccess: {'changed, uploading' if htaccess_changed else 'unchanged, left as is'}")
    if args.dry_run:
        ftp.quit()
        print("dry run: nothing changed")
        return 0

    if htaccess_changed and remote_htaccess is not None:
        backup = Path(tempfile.mkdtemp(prefix="odh-htaccess-")) / ".htaccess"
        backup.write_bytes(remote_htaccess)
        print(f"remote .htaccess saved to {backup}")

    made: set[str] = set()
    for index, rel in enumerate(uploads, 1):
        ensure_dirs(ftp, base, rel, made)
        with (LOCAL / rel).open("rb") as handle:
            ftp.storbinary(f"STOR {base}/{rel}", handle)
        if index % 50 == 0:
            print(f"  {index}/{len(uploads)}")
    for rel in deletes:
        ftp.delete(f"{base}/{rel}")
    # Empty folders left by deletes, deepest first. Non-empty ones refuse, which is fine.
    parents = {str(p) for rel in deletes for p in PurePosixPath(rel).parents if str(p) != "."}
    for folder in sorted(parents, key=len, reverse=True):
        try:
            ftp.rmd(f"{base}/{folder}")
        except ftplib.error_perm:
            pass
    ftp.quit()
    print("deploy complete")
    if htaccess_changed:
        print("! .htaccess changed. Ask the host to restart LiteSpeed, or it keeps serving the old rules.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
