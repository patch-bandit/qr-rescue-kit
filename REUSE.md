# Reuse check (Bandit Codes kit)

Completed before building any code in this repository, on 2026-11-24, and expanded in round 2 to cover the WordPress.org plugin directory and confirm remaining license checks.

## Goal of this check

Check GitHub, npm, and the WordPress.org plugin directory for existing open-source projects covering four pieces of the Bandit Codes kit:

1. Client-side redirect lists and static URL shorteners.
2. Self-hosted dynamic QR redirect managers.
3. Self-hosted URL shorteners with custom domains.
4. WordPress redirect and QR plugins.

Rule on AGPL projects: learn concepts and landscape only; copy no AGPL code.

## Search terms used

- GitHub (`github.com`): `client-side redirect json static url shortener github pages netlify`
- GitHub (`github.com`): `self-hosted dynamic qr code redirect manager open source`
- GitHub (`github.com`): `YOURLS OR johngodley/redirection OR 10up/safe-redirect-manager license`
- GitHub (`github.com`): `"kspkr/QrForge" OR "tuxxin/qr-track" OR "giandonatoinverso/PHP-Dynamic-Qr-code" OR "qrdxinc/qrdx" license`
- GitHub (`github.com`): `"kentcdodds/netlify-shortener" OR "ccbikai/Sink" OR "zziger/url-shortener-action" license`
- GitHub (`github.com`): `"ccbikai/Sink" license` (round 2 recheck confirming `miantiao-me/Sink` is AGPL-3.0)
- npm (`npmjs.com`): `redirect generator _redirects htaccess OR qr redirect manager OR static url shortener`
- npm (`npmjs.com`): `"netlify-shortener" OR "@netlify/redirects" license`
- npm / GitHub (`npmjs.com`, `github.com`): `"zziger/url-shortener-action" license OR "next-htaccess-generator" npm license`
- WordPress.org (`wordpress.org/plugins`): `site:wordpress.org/plugins "redirection" OR "safe redirect manager" OR "qr code" redirect plugin`
- Prior GitHub README digest supplied in task inputs (`[FETCH]`): `shlinkio/shlink`, `dubinc/dub.link`, `thedevs-network/kutt`, `tutunak/awesome-url-shortener`.

## Projects checked

### 1. Client-side redirect lists and static shorteners

| Project | Source | License | Fit and why it fell short |
|---|---|---|---|
| `kentcdodds/netlify-shortener` | GitHub / npm `[SEARCH]` | MIT | Tied to Netlify `_redirects` and a git workflow for path-based short links. Does not provide an inline HTML/JSON snippet for site builders, does not support `/qr-codes?c=<id>` query-param matching, and does not output Apache, nginx, Vercel, Cloudflare, or WordPress files. |
| `@netlify/redirects` | npm `[SEARCH]` | MIT | Official parser/utility for Netlify `_redirects` syntax only. Useful reference for Netlify syntax, not a multi-host QR kit or client-side loader. |
| `zziger/url-shortener-action` | GitHub `[SEARCH]` | No license declared (default copyright) | GitHub Action that builds static HTML redirect pages for GitHub Pages. No open-source license declared and tied to GitHub Actions path-per-file output rather than a single-page pasteable snippet or multi-host CLI. |
| `ccbikai/Sink` (moved to `miantiao-me/Sink`) | GitHub `[SEARCH]` | AGPL-3.0 | Cloudflare Workers shortener. Requires Cloudflare Workers setup and is AGPL-3.0 (confirmed in round 2 search; landscape reference only, no code copied). |
| `next-htaccess-generator` | npm `[SEARCH]` | No license declared (default copyright) | Specific to Next.js static export `.htaccess` files, no declared open-source license, and not a general QR redirect list or multi-host builder. |

### 2. Self-hosted dynamic QR managers

| Project | Source | License | Fit and why it fell short |
|---|---|---|---|
| `kspkr/QrForge` | GitHub `[SEARCH]` | MIT | Full web platform requiring Docker Compose and a hosted server. Too heavy for a non-technical site owner who only has Squarespace, Wix, Shopify, Webflow, or shared hosting. |
| `tuxxin/qr-track` | GitHub `[SEARCH]` | MIT | Lightweight PHP + SQLite web app with dashboard and API. Still requires running and maintaining a dedicated PHP server app rather than pasting a snippet or uploading static rules to an existing website. |
| `giandonatoinverso/PHP-Dynamic-Qr-code` | GitHub `[SEARCH]` | MIT | PHP + MySQL/MariaDB AdminLTE web app. Requires database hosting and server administration; not usable on site builders or static hosts. |
| `qrdxinc/qrdx` | GitHub `[SEARCH]` | AGPL-3.0 (web app), MIT (libs/CLI/plugins), Commercial (`ee/`) | Full hosted/self-hosted platform. Web app is AGPL-3.0 (landscape reference only; no code copied) and far heavier than a static drop-in kit. |

### 3. Self-hosted URL shorteners

| Project | Source | License | Fit and why it fell short |
|---|---|---|---|
| `shlinkio/shlink` | GitHub `[FETCH]` | MIT | Mature PHP shortener with SQLite/DB, CLI, and REST API. Requires running a dedicated backend service (Docker or PHP server). |
| `thedevs-network/kutt` | GitHub `[FETCH]` | MIT | Node 20 + SQLite + Docker shortener. Requires running a Node server and database; no drop-in snippet or vendor spreadsheet migration kit. |
| `dubinc/dub.link` | GitHub `[FETCH]` | AGPLv3 core, Commercial `/ee` | Heavy Next.js stack depending on multiple hosted services. AGPLv3 core (landscape reference only; no code copied). |
| `YOURLS/YOURLS` | GitHub `[SEARCH]` | MIT | Classic PHP + MySQL URL shortener. Requires database and server setup; does not serve a serverless pasteable snippet or generate rules for static hosts and site builders. |

### 4. WordPress redirect and QR plugins (GitHub and WordPress.org directory)

| Project | Source | License | Fit and why it fell short |
|---|---|---|---|
| `johngodley/redirection` (Redirection) | GitHub / WordPress.org `[SEARCH]` | GPL-3.0 | Widely used WordPress redirect manager with CSV import (`source,target,regex,code`) and query-parameter matching. **Pick for interop:** our CLI outputs a Redirection-compatible CSV (`wordpress-redirection.csv`), and `guides/wordpress.md` documents it as an option for sites that already run Redirection. However, it does not import or export the Bandit Codes v1 JSON format directly or focus solely on an editable QR code table. |
| `10up/safe-redirect-manager` (Safe Redirect Manager) | GitHub / WordPress.org `[SEARCH]` | GPL-2.0+ | Clean, minimal WordPress redirect manager storing redirects as a custom post type. Focuses on general path redirects rather than `/qr-codes?c=<id>` table editing and Bandit Codes v1 JSON import/export. |
| QR Redirector | WordPress.org `[SEARCH]` | GPLv2+ (WordPress.org directory plugin) | Stores each redirect as a custom post type with a generated local permalink rather than `/qr-codes?c=<id>` query links or the portable Bandit Codes v1 JSON format. |
| Dynamic QR Code | WordPress.org `[SEARCH]` | GPLv2+ (WordPress.org directory plugin) | Focuses on generating and tracking QR images inside WordPress rather than providing a lightweight table synced with the Bandit Codes v1 JSON format and offline CLI. |

## Decision

No existing open-source project covers the core job of Bandit Codes: a dependency-free, single-block HTML/JSON drop-in snippet (format v1) paired with a local offline CLI that imports vendor spreadsheets and emits both the snippet and native server rules across major hosts, plus a focused GPLv2 WordPress plugin and plain-language platform guides.

What we build from scratch (with no runtime dependencies and no AGPL code):

- `loader/`: tiny, plain JavaScript inline loader and same-origin `codes.json` fetch loader matching the Bandit Codes v1 snippet format.
- `cli/`: offline Node.js CLI (`bandit-codes`) for managing `bandit-codes.json`, importing spreadsheets or existing snippets, validating URLs and IDs, printing full reprint URL lists, and building the snippet plus multi-host server rules (including a CSV that interoperates with WordPress `johngodley/redirection`).
- `wordpress/`: minimal GPLv2-or-later WordPress plugin with an editable table, Bandit Codes v1 JSON import/export, and server 302 responses for `/qr-codes?c=<id>`.
- `skill/` and `guides/`: agent update skill and plain-language install guides for 11 platforms plus a getting-started guide.
