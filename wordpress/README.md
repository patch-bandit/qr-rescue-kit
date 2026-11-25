# Bandit Codes WordPress Plugin

A small, self-contained WordPress plugin (GPLv2 or later) that stores your Bandit Codes list inside WordPress, gives you an editable table in the WordPress dashboard, and answers `/qr-codes?c=<id>` with a fast server HTTP 302 redirect.

## Install

1. Compress the `wordpress/bandit-codes/` folder into `bandit-codes.zip` (so `bandit-codes/bandit-codes.php` is inside the zip).
2. In your WordPress dashboard, go to **Plugins > Add New Plugin > Upload Plugin**, choose `bandit-codes.zip`, and click **Install Now**.
3. Click **Activate Plugin**.
4. Open **Bandit Codes** in the left WordPress menu to add codes, edit destinations, or paste `codes.json` from the Bandit Codes CLI to import up to hundreds of codes at once.

## How it works

- Requests to `/qr-codes?c=menu` (or whatever path and query parameter you configure) are answered directly with an HTTP 302 redirect and `Cache-Control: no-store` headers. Visitors go straight to the destination with no visible pause.
- You do not need to create a WordPress page named `qr-codes` unless you leave **Fallback address** blank and want to display a list of active links using the `[bandit_codes_list]` shortcode.
- Checking **Retired** hides a code from `[bandit_codes_list]`. Clear its Destination URL as well if you want scans to go to your fallback address instead of forwarding to the old URL.
- **Large lists (roughly 200+ codes):** PHP's default `max_input_vars` setting (1,000) limits how many fields a single HTML table form can submit (about 240 rows at 4 fields per row). The plugin checks an end-of-form sentinel field and refuses truncated saves so existing codes are never silently dropped. For lists approaching or above 200 codes, manage them in `codes.json` and use **Import JSON** (which submits one single JSON field, up to 1 MB) rather than the table form.
- Nothing in this plugin calls any external service. If you deactivate or move off WordPress later, click **Download codes.json Backup** to take your full list anywhere.

## Data and uninstall

- Deleting the plugin from WordPress intentionally keeps the two saved options (`bandit_codes_data` and `bandit_codes_path`) in `wp_options` so an accidental delete or reinstall does not wipe printed QR codes.
- If you are permanently removing Bandit Codes, click **Download codes.json Backup** first, then delete the two options with WP-CLI (`wp option delete bandit_codes_data bandit_codes_path`) or from your database admin tool.

## Security note

This plugin is written to handle untrusted visitor query strings safely:

- **Authorization and CSRF:** Every admin page render, save, import, and export requires the `manage_options` capability and checks a dedicated WordPress nonce (`check_admin_referer`).
- **No open redirects:** Redirect targets are never read from visitor input. A visitor supplies only a code ID (`[a-z0-9-]{1,64}`), which is looked up in the admin-saved WordPress option.
- **Strict URL allowlist:** Destination URLs must use `https://` or `http://`, contain no control characters, spaces, quotes, angle brackets, or credentials (`user@host`), and stay under 2,000 characters. `javascript:`, `data:`, and protocol-relative (`//evil.example`) URLs are refused on save, import, and redirect.
- **Escaped output:** All rendered values in the admin screen and `[bandit_codes_list]` shortcode pass through `esc_html()`, `esc_attr()`, or `esc_url()`. JSON exports set `Content-Type: application/json; charset=utf-8` and `X-Content-Type-Options: nosniff`.
- **No permanent caching of mutable QR targets:** Redirects send HTTP 302 with `nocache_headers()` so phones re-check the destination when you update a code.

## License

GPLv2 or later (`wordpress/bandit-codes/LICENSE`).
