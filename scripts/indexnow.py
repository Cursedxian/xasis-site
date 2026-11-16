"""Tell IndexNow search engines (Bing, Yandex, Naver, Seznam, Yep) which pages changed.

Runs in GitHub Actions after a push to main:
    python scripts/indexnow.py --before <old sha> --after <new sha>

Steps:
1. Work out which public pages changed between the two commits:
   - changed .html pages that are in the new sitemap, and
   - pages that dropped out of the sitemap (deleted or switched to noindex),
     so search engines re-check them and drop them too.
   If --before is missing or unknown (first push, force push), every sitemap page is sent.
2. Wait until GitHub Pages serves the new version (checks the key file and one changed page).
3. POST the list to api.indexnow.org, which shares it with every IndexNow engine.

Google does not use IndexNow; it re-reads sitemap.xml on its own.
Use --dry-run to print the list without waiting or sending anything.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sitemap import ROOT, SITE_URL, page_url  # noqa: E402

ENDPOINT = "https://api.indexnow.org/indexnow"
KEY_FILE = re.compile(r"^[0-9a-f]{32}\.txt$")
LOC = re.compile(r"<loc>([^<]+)</loc>")
ZERO_SHA = "0" * 40
USER_AGENT = "xasis-site-indexnow/1.0"


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout


def find_key(root: Path = ROOT) -> str:
    keys = [p.stem for p in root.iterdir() if KEY_FILE.match(p.name)]
    if len(keys) != 1:
        raise SystemExit(f"ERROR: expected exactly one IndexNow key file at the site root, found {len(keys)}")
    key = keys[0]
    content = (root / f"{key}.txt").read_text(encoding="utf-8").strip()
    if content != key:
        raise SystemExit("ERROR: IndexNow key file content does not match its file name")
    return key


def sitemap_urls(xml: str) -> list[str]:
    return LOC.findall(xml)


def select_urls(changed_files: list[str], old_urls: list[str], new_urls: list[str],
                site_url: str = SITE_URL) -> list[str]:
    """Pages to notify: changed pages still in the sitemap + pages that left the sitemap."""
    new_set = set(new_urls)
    picked = []
    for rel in changed_files:
        if rel.endswith(".html"):
            url = page_url(rel, site_url)
            if url in new_set:
                picked.append(url)
    picked.extend(u for u in old_urls if u not in new_set)
    seen, out = set(), []
    for url in picked:
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


def file_at(sha: str, path: str) -> str:
    try:
        return git("show", f"{sha}:{path}")
    except subprocess.CalledProcessError:
        return ""


def commit_exists(sha: str) -> bool:
    if not sha or sha == ZERO_SHA:
        return False
    try:
        git("cat-file", "-e", f"{sha}^{{commit}}")
        return True
    except subprocess.CalledProcessError:
        return False


def fetch(url: str) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as err:
        return err.code, b""
    except (urllib.error.URLError, TimeoutError):
        return 0, b""


def wait_until_live(checks: list[tuple[str, bytes]], timeout: int, interval: int = 20) -> bool:
    """Poll until every URL serves the expected bytes (cache-busted). True if all matched."""
    deadline = time.time() + timeout
    while True:
        pending = []
        for url, expected in checks:
            status, body = fetch(f"{url}{'&' if '?' in url else '?'}cb={int(time.time())}")
            if status != 200 or body.strip() != expected.strip():
                pending.append(url)
        if not pending:
            return True
        if time.time() >= deadline:
            print(f"::warning::still not live after {timeout}s: {', '.join(pending)}")
            return False
        print(f"waiting for GitHub Pages: {len(pending)} file(s) not live yet")
        time.sleep(interval)


def submit(urls: list[str], key: str, site_url: str = SITE_URL) -> int:
    host = site_url.split("://", 1)[1]
    payload = json.dumps({
        "host": host,
        "key": key,
        "keyLocation": f"{site_url}/{key}.txt",
        "urlList": urls,
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as err:
        print(f"IndexNow replied {err.code}: {err.read()[:300]!r}")
        return err.code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--before", default="", help="commit before the push")
    parser.add_argument("--after", default="HEAD", help="commit after the push (incl. sitemap update)")
    parser.add_argument("--timeout", type=int, default=600, help="seconds to wait for GitHub Pages")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    key = find_key()
    new_urls = sitemap_urls(file_at(args.after, "sitemap.xml"))
    if not new_urls:
        print("ERROR: sitemap.xml at the new commit has no URLs; not notifying anyone")
        return 1

    if commit_exists(args.before):
        changed = git("diff", "--name-only", args.before, args.after).split()
        old_urls = sitemap_urls(file_at(args.before, "sitemap.xml"))
        urls = select_urls(changed, old_urls, new_urls)
    else:
        print("no usable previous commit; sending every sitemap page")
        urls = list(new_urls)

    if not urls:
        print("no public page changed; nothing to send")
        return 0
    print("pages to send:")
    for url in urls:
        print(f"  {url}")
    if args.dry_run:
        print("dry run: not waiting for Pages and not sending")
        return 0

    # The key file must be live or IndexNow rejects the request (403).
    checks = [(f"{SITE_URL}/{key}.txt", key.encode())]
    first_changed_page = next(
        (rel for rel in git("diff", "--name-only", args.before, args.after).split()
         if rel.endswith(".html") and page_url(rel) in urls),
        None,
    ) if commit_exists(args.before) else None
    if first_changed_page:
        checks.append((page_url(first_changed_page), file_at(args.after, first_changed_page).encode()))
    if not wait_until_live(checks, args.timeout):
        key_status, key_body = fetch(f"{SITE_URL}/{key}.txt")
        if key_status != 200 or key_body.strip() != key.encode():
            print("ERROR: IndexNow key file is not live, so the request would be refused")
            return 1
        print("::warning::page not confirmed live yet; sending anyway (search engines will recrawl later)")

    status = submit(urls, key)
    if status in (200, 202):
        print(f"IndexNow accepted {len(urls)} URL(s) (HTTP {status})")
        return 0
    print(f"ERROR: IndexNow did not accept the request (HTTP {status})")
    return 1


if __name__ == "__main__":
    sys.exit(main())
