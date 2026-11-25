# Bandit Codes

Move your printed QR codes off paid QR vendors and onto your own website, with no lock-in and no third-party dependency. Once your codes point to your own site, they are yours forever.

## The no-hostage promise

- Nothing in this kit ever points at Patch Bandit or any other third-party server.
- Nothing in the loader, command-line tool, or WordPress plugin phones home or makes outside network calls.
- Your code list lives in a plain file you own (`bandit-codes.json` and `codes.json`).
- If Patch Bandit disappears tomorrow, every one of your QR codes keeps working.

## Why Bandit Codes exists

Many businesses print hundreds of QR codes on menus, flyers, pamphlets, packaging, and signs using a paid "dynamic QR" service. Those codes point at the vendor's web address. If the vendor raises prices, shuts down, or you cancel your subscription, every printed code goes dark.

Sometimes a printed code needs to keep working even when the file behind it changes, such as a seasonal menu PDF or an updated product sheet. With Bandit Codes, it does. Your printed QR codes point to your own website (for example, `https://yoursite.com/qr-codes?c=menu`), and your site sends the visitor straight to the current PDF or page. When the file changes, you update one line on your site and never reprint a single code.

## Server redirects vs. HTML snippet

Whenever your web host allows server redirects, use them first:

- **Server redirects (fastest, no pause):** Your website host sends the phone straight to the destination before any page loads. Supported by our WordPress plugin, plain web hosting (cPanel), Netlify, Vercel, Cloudflare Pages, common web servers, and the WordPress Redirection plugin.
- **HTML snippet (for site builders without redirect rules):** One block of HTML pasted into a page on your site (such as `/qr-codes`). The page loads briefly first (a short pause), then the inline script sends the visitor on to the destination. Works on Squarespace, Wix, Shopify, Webflow, and similar site builders.

## Start here (no developer required)

Open [guides/README.md](guides/README.md) to pick the plain-language guide for your website platform, or start with [guides/getting-started.md](guides/getting-started.md) to download the kit and prepare your files.

## What is in this repository

- `guides/`: Plain-language installation guides for 11 website platforms, a "Get Your Files Ready" guide, and a step-by-step plan for moving 200 existing codes off a paid vendor.
- `loader/`: Plain JavaScript redirect loader (under 2 KB minified, no dependencies) and a same-origin `codes.json` fetch variant, with unit tests.
- `cli/`: Offline Node.js command (`bandit-codes`) to manage your codes, import vendor spreadsheets or existing snippets, validate IDs and web addresses, print a reprint list, and build the HTML snippet, `codes.json`, and server redirect files for major hosts.
- `wordpress/`: Small GPLv2-or-later WordPress plugin with an editable admin table, JSON import and export, and instant server redirects for `/qr-codes?c=<id>`.
- `skill/SKILL.md`: Ready-to-use agent skill so an AI assistant can update your codes, run checks and rebuild, show you the diff, and leave publishing to you.
- `REUSE.md`: Open-source reuse check completed before building this kit.

## Quick start (for developers)

Requirements: Node.js 18 or newer (for the CLI and tests).

1. Create your code list (run directly with `node`, or run `npm link` once to use the shorter `bandit-codes` command):
   ```sh
   node ./cli/bin/bandit-codes.mjs init
   node ./cli/bin/bandit-codes.mjs add menu https://example.com/menu.pdf --note "Table tent"
   ```
2. Check your list and build all outputs:
   ```sh
   node ./cli/bin/bandit-codes.mjs check
   node ./cli/bin/bandit-codes.mjs build --out dist --path /qr-codes --domain yoursite.com
   ```
3. Print a reprint list with full QR addresses anytime:
   ```sh
   node ./cli/bin/bandit-codes.mjs list --urls --domain yoursite.com --path /qr-codes
   ```
4. Open `guides/README.md` to pick the guide for your website platform and install either the server rules or `dist/snippet.html`.

Run the automated test suite from the repository root:

```sh
npm test
```

## Bandit Codes v1 snippet format

```html
<!-- Bandit Codes v1: start -->
<script type="application/json" id="bandit-codes">{"v":1,"param":"c","fallback":"/","codes":{"menu":{"to":"https://example.com/menu.pdf","note":"Table tent"}}}</script>
<script>/* minified inline loader, no network calls */</script>
<noscript><nav aria-label="QR code links"><ul><li><a href="https://example.com/menu.pdf" target="_blank" rel="noopener">Table tent (menu)</a></li></ul></nav></noscript>
<!-- Bandit Codes v1: end -->
```

- Code IDs use lowercase letters, digits, and hyphens, 1 to 64 characters (`menu`, `brochure-2026`, `code1`). Reserved JavaScript property names (`constructor`, `prototype`, `__proto__`, `tostring`, `valueof`, `hasownproperty`) are refused by the CLI and plugin for safety.
- Query parameter names use letters, digits, and underscores (1 to 32 characters; no hyphens, so nginx `$arg_` variables always work).
- Destinations must start with `https://` or `http://`. All other schemes (such as `javascript:` or `data:`) are refused.
- Unknown or missing codes go to `fallback` (for example `/`), or show a plain list of active links if `fallback` is empty.

## License

- Everything outside `wordpress/`: MIT License (`LICENSE`), Copyright (c) 2026 Patch Bandit.
- `wordpress/`: GPLv2 or later (`wordpress/bandit-codes/LICENSE`), as required for WordPress plugins.
