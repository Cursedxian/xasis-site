"""Build sitemap.xml from the site's HTML pages.

Rules:
- Every .html page is listed unless its robots meta tag says noindex.
- 404.html is never listed. Folders in SKIP_DIRS are ignored.
- index.html maps to its folder URL (index.html -> /, blog/index.html -> /blog/).
- <lastmod> is the date of the last git commit that touched the file, so it only
  changes when the page itself changes (Google ignores lastmod that is not accurate).

Usage:
    python scripts/build_sitemap.py            # write sitemap.xml
    python scripts/build_sitemap.py --check    # exit 1 if sitemap.xml is out of date
    python scripts/build_sitemap.py --llms     # also warn about pages missing from llms.txt
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import subprocess
import sys
from pathlib import Path

SITE_URL = "https://xasis.app"
ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".github", "scripts", "assets", "media", "node_modules"}
SKIP_FILES = {"404.html"}

ROBOTS_META = re.compile(
    r"<meta\b(?=[^>]*\bname\s*=\s*[\"']?robots[\"']?)[^>]*>", re.IGNORECASE
)
CONTENT_ATTR = re.compile(r"\bcontent\s*=\s*[\"']([^\"']*)[\"']", re.IGNORECASE)


def is_noindex(html: str) -> bool:
    """True if any robots meta tag on the page contains noindex."""
    for tag in ROBOTS_META.findall(html):
        match = CONTENT_ATTR.search(tag)
        if match and "noindex" in match.group(1).lower():
            return True
    return False


def page_url(rel_path: str, site_url: str = SITE_URL) -> str:
    """Map a file path relative to the site root to its public URL."""
    rel_path = rel_path.replace("\\", "/")
    if rel_path == "index.html":
        return site_url + "/"
    if rel_path.endswith("/index.html"):
        return f"{site_url}/{rel_path[: -len('index.html')]}"
    return f"{site_url}/{rel_path}"


def html_files(root: Path) -> list[Path]:
    files = []
    for path in sorted(root.rglob("*.html")):
        rel = path.relative_to(root)
        if any(part in SKIP_DIRS for part in rel.parts[:-1]):
            continue
        if rel.as_posix() in SKIP_FILES:
            continue
        files.append(path)
    return files


def last_commit_date(root: Path, rel_path: str) -> str:
    """YYYY-MM-DD of the last commit touching the file; today if not committed yet."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", rel_path],
            cwd=root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        out = ""
    return out or dt.date.today().isoformat()


def indexable_pages(root: Path, site_url: str = SITE_URL) -> list[tuple[str, str, str]]:
    """List of (rel_path, url, lastmod) for every page that may be indexed."""
    pages = []
    for path in html_files(root):
        rel = path.relative_to(root).as_posix()
        html = path.read_text(encoding="utf-8", errors="replace")
        if is_noindex(html):
            continue
        pages.append((rel, page_url(rel, site_url), last_commit_date(root, rel)))
    # Home first, then alphabetical, so the file is stable between runs.
    pages.sort(key=lambda p: (p[1] != site_url + "/", p[1]))
    return pages


def render_sitemap(pages: list[tuple[str, str, str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for _rel, url, lastmod in pages:
        lines.append(f"  <url><loc>{url}</loc><lastmod>{lastmod}</lastmod></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def missing_from_llms(root: Path, pages: list[tuple[str, str, str]]) -> list[str]:
    llms = root / "llms.txt"
    if not llms.exists():
        return []
    text = llms.read_text(encoding="utf-8", errors="replace")
    return [url for _rel, url, _ in pages if f"({url})" not in text and f"({url}#" not in text]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="fail if sitemap.xml is out of date")
    parser.add_argument("--llms", action="store_true", help="warn about pages missing from llms.txt")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args(argv)

    pages = indexable_pages(args.root)
    if not pages:
        print("ERROR: no indexable pages found; refusing to write an empty sitemap", file=sys.stderr)
        return 1
    content = render_sitemap(pages)
    target = args.root / "sitemap.xml"
    current = target.read_text(encoding="utf-8") if target.exists() else ""

    for _rel, url, lastmod in pages:
        print(f"  {lastmod}  {url}")

    if args.llms:
        for url in missing_from_llms(args.root, pages):
            # GitHub Actions shows ::warning lines as a yellow note on the run.
            print(f"::warning::{url} is in the sitemap but not linked in llms.txt")

    if args.check:
        if current != content:
            print("sitemap.xml is out of date; run python scripts/build_sitemap.py")
            return 1
        print("sitemap.xml is up to date")
        return 0

    if current == content:
        print(f"sitemap.xml unchanged ({len(pages)} pages)")
    else:
        target.write_text(content, encoding="utf-8", newline="\n")
        print(f"sitemap.xml written ({len(pages)} pages)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
