"""Tests for build_sitemap.py and indexnow.py. Run: python scripts/test_seo_scripts.py"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_sitemap as bs  # noqa: E402
import indexnow as ix  # noqa: E402

INDEX = '<html><head><meta name="robots" content="index,follow"></head></html>'
NOINDEX = '<html><head><meta name="robots" content="noindex"></head></html>'
NOINDEX_SWAPPED = "<html><head><meta content='noindex, follow' name=robots></head></html>"
NO_TAG = "<html><head><title>x</title></head></html>"


def make_site(files: dict[str, str]) -> Path:
    root = Path(tempfile.mkdtemp())
    for rel, html in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "x",
         "--date=2026-01-02T10:00:00+08:00"],
        cwd=root, check=True,
        env={**__import__("os").environ, "GIT_COMMITTER_DATE": "2026-01-02T10:00:00+08:00"},
    )
    return root


class SitemapTests(unittest.TestCase):
    def test_noindex_detection(self):
        self.assertTrue(bs.is_noindex(NOINDEX))
        self.assertTrue(bs.is_noindex(NOINDEX_SWAPPED))
        self.assertFalse(bs.is_noindex(INDEX))
        self.assertFalse(bs.is_noindex(NO_TAG))

    def test_page_urls(self):
        self.assertEqual(bs.page_url("index.html"), "https://xasis.app/")
        self.assertEqual(bs.page_url("blog/index.html"), "https://xasis.app/blog/")
        self.assertEqual(bs.page_url("blog/post-1.html"), "https://xasis.app/blog/post-1.html")

    def test_only_indexable_pages_are_listed(self):
        root = make_site({
            "index.html": INDEX,
            "about.html": NO_TAG,
            "team.html": NOINDEX,  # negative control: old "Moved" page
            "404.html": INDEX,  # never listed
            "blog/first-post.html": INDEX,
            "assets/demo.html": INDEX,  # skipped folder
        })
        urls = [url for _rel, url, _ in bs.indexable_pages(root)]
        self.assertEqual(urls, [
            "https://xasis.app/",
            "https://xasis.app/about.html",
            "https://xasis.app/blog/first-post.html",
        ])
        self.assertNotIn("https://xasis.app/team.html", urls)

    def test_lastmod_comes_from_git(self):
        root = make_site({"index.html": INDEX})
        self.assertEqual(bs.indexable_pages(root)[0][2], "2026-01-02")

    def test_empty_site_refuses_to_write(self):
        root = make_site({"team.html": NOINDEX})
        self.assertEqual(bs.main(["--root", str(root)]), 1)
        self.assertFalse((root / "sitemap.xml").exists())

    def test_check_mode(self):
        root = make_site({"index.html": INDEX})
        self.assertEqual(bs.main(["--root", str(root), "--check"]), 1)  # no sitemap yet
        self.assertEqual(bs.main(["--root", str(root)]), 0)
        self.assertEqual(bs.main(["--root", str(root), "--check"]), 0)

    def test_llms_warning(self):
        root = make_site({"index.html": INDEX, "about.html": INDEX})
        (root / "llms.txt").write_text("- [Home](https://xasis.app/)\n", encoding="utf-8")
        pages = bs.indexable_pages(root)
        self.assertEqual(bs.missing_from_llms(root, pages), ["https://xasis.app/about.html"])

    def test_real_site_matches_live_page_set(self):
        urls = [url for _rel, url, _ in bs.indexable_pages(bs.ROOT)]
        self.assertEqual(sorted(urls), sorted([
            "https://xasis.app/",
            "https://xasis.app/about.html",
            "https://xasis.app/contact.html",
            "https://xasis.app/privacy.html",
            "https://xasis.app/services.html",
            "https://xasis.app/work.html",
        ]))


class IndexNowTests(unittest.TestCase):
    OLD = ["https://xasis.app/", "https://xasis.app/team.html", "https://xasis.app/work.html"]
    NEW = ["https://xasis.app/", "https://xasis.app/work.html", "https://xasis.app/blog/a.html"]

    def test_changed_public_pages_only(self):
        urls = ix.select_urls(["work.html", "styles.css", "login.html"], self.NEW, self.NEW)
        self.assertEqual(urls, ["https://xasis.app/work.html"])

    def test_pages_leaving_sitemap_are_sent(self):
        urls = ix.select_urls(["blog/a.html"], self.OLD, self.NEW)
        self.assertEqual(urls, ["https://xasis.app/blog/a.html", "https://xasis.app/team.html"])

    def test_asset_only_change_sends_nothing(self):
        self.assertEqual(ix.select_urls(["styles.css", "media/x.mp4"], self.NEW, self.NEW), [])

    def test_no_duplicates(self):
        urls = ix.select_urls(["index.html", "index.html"], self.NEW, self.NEW)
        self.assertEqual(urls, ["https://xasis.app/"])

    def test_key_file_is_valid(self):
        key = ix.find_key()
        self.assertRegex(key, r"^[0-9a-f]{32}$")


if __name__ == "__main__":
    unittest.main(verbosity=2)
