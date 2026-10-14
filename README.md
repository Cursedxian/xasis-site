# XASIS: Midnight Studio website

Public prospect website and clearly labelled interactive workspace demo, built from ZX's selected Midnight Studio design boards. Uses plain HTML, CSS and JavaScript with locally hosted fonts and original generated PNGs.

## Official hosting

- Website: https://xasis.app/
- Publish repository: https://github.com/Cursedxian/xasis-site
- GitHub Pages serves that repository's main branch at its root. Keep CNAME and .nojekyll.
- Team HQ source: shared/website-codex/. Keep the new page, script, stylesheet and asset files aligned with the publish repository.
- The older Next.js source in shared/website/ is a separate draft. Publishing it over this repository would replace the Midnight Studio implementation.

## Pages

| File | Purpose |
| --- | --- |
| index.html | Public homepage with ribbon background, device cards and four-step process |
| builders.html | Builder page with laptop artwork and capability cards |
| brief.html | Guided project brief with local text download |
| builder-introduction.html | Validated builder introduction, editable preview and download |
| team.html | Existing public information about ZX, Ryan and Ziren |
| login.html | Entry to the sample workspace with supplied, read-only demo credentials |
| workspace.html | Demo overview, next step, activity and sample documents |
| project.html | Demo checklist, scope, files and local messages |

The retained workflow simulator remains at /workflow-simulator/ in the publish repository. Its original Next.js export is preserved. The added legacy-navigation.js routes its homepage, brief and team links to the current static pages instead of its cached old homepage.

## Run locally

From this repository:

```powershell
python -m http.server 3110 --bind 127.0.0.1
```

This checkout includes the retained workflow simulator and its existing static assets.

## Design contract

The reference boards and original production assets are in zx/website-design-kit/2026-10-13/03-midnight-studio/.

The ribbon is an edge-to-edge background behind the headline and buttons. Device images sit inside compact service cards. The laptop fills the right side of the builder hero. Login reuses the ribbon. Mobile follows the stacked reference composition. The supplied faceted symbol and violet orbit replace the generic X in the original board.

Space Grotesk and Inter are served locally under SIL Open Font License. [Asset provenance](assets/README.md) records native dimensions and usage.

## Functional limits

Project briefs and builder profiles are prepared locally and downloaded as text. They are not submitted automatically. Visitors are told to email the saved file to hello@xasis.app.

The workspace uses sample data. Demo credentials cannot be edited. Checklist, review, settings and message controls change the demo only. Messages stay on the page until reload; the brief-review flag is stored in sessionStorage when available. No real sign-in, uploads, live messages or client database is connected.

## Verification

Completed local checks on 13–14 October 2026:

- All eight pages: HTTP 200, one h1, unique IDs, valid local file references and cross-page anchors.
- All eight pages at 1280, 768, 390 and 360 CSS pixels: 32 checks, no horizontal overflow.
- Main and demo JavaScript syntax checks passed.
- Original PNG checksums and dimensions preserved in both source and publish copies.
- Menu open/close and Escape; planner selection, progression, Back/reset controls and downloaded brief; builder validation, preview, editing and downloaded profile.
- Demo login, password display, review modal, Escape dismissal, keyboard tabs, checklist, local message rendering and reset; sample scope downloaded.
- Simulator return links lead to the new homepage, project brief and team page.

See the design kit's website-verification/ folder for responsive results and deployment screenshots.
