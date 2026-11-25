# Install Guides: Which Guide Is Mine?

Welcome. You do not need to be a developer to set up Bandit Codes.

1. First, follow [Get Your Files Ready](getting-started.md) to download the kit and create your `dist` files (or ask your developer or AI assistant to do that part).
2. Next, pick the service where you edit your website from the table below.

## Pick your website platform

| Where you edit your website | Guide to follow | Redirect speed |
|---|---|---|
| WordPress (self-hosted or Business plan) | [WordPress](wordpress.md) | Instant (plugin) or short pause (snippet) |
| Squarespace | [Squarespace](squarespace.md) | Short pause (snippet) |
| Wix | [Wix](wix.md) | Short pause (snippet) |
| Shopify | [Shopify](shopify.md) | Short pause (snippet) |
| Webflow | [Webflow](webflow.md) | Short pause (snippet) |
| GoDaddy Website Builder | [GoDaddy Website Builder](godaddy-website-builder.md) | Limited (see guide) |
| Google Sites | [Google Sites](google-sites.md) | Cannot auto-redirect (see workaround) |
| Plain web hosting (cPanel, Shared Hosting) | [Plain Hosting / cPanel](cpanel.md) | Instant (server rules) |
| Netlify | [Netlify](netlify.md) | Instant (server rules) |
| Cloudflare Pages | [Cloudflare Pages](cloudflare-pages.md) | Short pause (direct upload) or instant (Git) |
| Vercel (developer-managed sites) | [Vercel](vercel.md) | Instant (server rules) |
| None of these (Weebly, Carrd, Duda, Ghost, or another builder) | Follow [Get Your Files Ready](getting-started.md), then ask your developer or AI helper to paste `dist/snippet.html` into your builder's custom HTML block on `/qr-codes`, or use the subdomain route in [Netlify](netlify.md) | Short pause (snippet) or instant (subdomain) |

**Not sure which one you have?** Check the company name on your monthly website bill, or look at the web address when you log in to edit your site:

- Ends in `.wixsite.com` or `manage.wix.com`: **Wix**
- Ends in `.myshopify.com` or `admin.shopify.com`: **Shopify**
- Ends in `.squarespace.com`: **Squarespace**
- Ends in `.webflow.io` or `webflow.com`: **Webflow**
- Ends in `/wp-admin` or shows a WordPress logo on the login screen: **WordPress**
- Opens a dashboard called **cPanel** or **File Manager** at your hosting company: **Plain Hosting / cPanel**

## Server rules vs. the paste-in snippet

- **Server rules (best when available):** When someone scans your QR code, your website sends their phone straight to the destination right away, with no blank page or pause.
- **Paste-in snippet (for site builders that do not support server rules):** Your website opens your `/qr-codes` page for a split second, then automatically sends the visitor on to the right link. It works without changing any server settings.

Either way, every QR code points to your own website, never to a third-party QR vendor.

## How to move 200 existing QR codes off a paid vendor

First, know which printed codes are at risk: **codes that already point directly at your own website address are safe. Only codes printed with a paid vendor's web address will stop working when you cancel that vendor.**

If you have dozens or hundreds of printed QR codes managed by a paid QR service, you do not have to reprint them overnight. Follow these five steps while your old subscription is still active:

1. **Export your list from your current QR vendor.**
   Log in to your QR vendor dashboard and look for **Export**, **Download CSV**, or **Reports**. Save the spreadsheet (`.csv`) to your computer. Make sure it has a name or ID column and the destination web address for each code. If the vendor has no export button, copy the list into a simple two-column spreadsheet with headers `id` and `to` (plus an optional `note` column saying where each code is printed, like "Lobby poster" or "Pamphlet A").

2. **Import the spreadsheet into Bandit Codes.**
   Follow [Get Your Files Ready](getting-started.md) to import your spreadsheet and build your `dist` folder (or hand the spreadsheet to your developer or AI assistant). If your vendor's export uses different column names, ask your developer or AI assistant to rename the columns to `id`, `to`, and `note` before importing. When done, ask for the list of your new short IDs (for example `pamphlet-a`, `menu`, `code1`) and full QR addresses.

3. **Install Bandit Codes on your own website.**
   Follow the guide for your platform in the table above. Test two or three links by typing `https://yoursite.com/qr-codes?c=pamphlet-a` into your phone's browser and confirming it jumps to the right page or PDF.

4. **Re-point each old vendor code to your own website while you still pay.**
   In your paid vendor's dashboard, edit each active code's destination so that instead of pointing straight at the PDF or page, it points to your own site:
   `https://yoursite.com/qr-codes?c=pamphlet-a`
   **Time-saving tip:** Doing 200 codes one by one by hand can take a few hours. Check your vendor's dashboard for a **Bulk Edit** or **CSV Upload** option first. Once updated, you manage all future changes on your own website, even for codes already out in the world.

5. **Replace printed codes gradually before canceling.**
   Be aware of one honest limit: QR codes already printed with the vendor's web address will stop working the day you cancel that vendor's account, because the vendor controls that address. As you reprint each flyer, menu, or sign, generate a fresh **static** QR code pointing directly to your own address (`https://yoursite.com/qr-codes?c=pamphlet-a`). You can use any free static QR code maker (just make sure it encodes your exact `https://yoursite.com/qr-codes?c=...` address directly, without a vendor login or tracking short link). Your developer or AI assistant can print the full reprint list for you with one command. Once the last old printed piece is retired or reprinted, you can cancel the paid vendor for good.

## Note for your developer

- Commands to import a vendor CSV, validate, build, and print the reprint list:
  ```sh
  node ./cli/bin/bandit-codes.mjs init
  node ./cli/bin/bandit-codes.mjs import your-vendor-export.csv --slugify
  node ./cli/bin/bandit-codes.mjs check
  node ./cli/bin/bandit-codes.mjs build --out dist --path /qr-codes --domain yoursite.com
  node ./cli/bin/bandit-codes.mjs list --urls --domain yoursite.com --path /qr-codes
  ```
- Every output generated by `bandit-codes build` uses temporary redirects (HTTP 302, or HTTP 307 on Vercel) rather than permanent 301 redirects, so mobile browsers re-check the destination after an edit instead of caching an old URL permanently.
- The canonical data format is Bandit Codes v1 JSON (`{"v":1,"param":"c","fallback":"/","codes":{...}}`), shared across the CLI, the inline HTML snippet, `/codes.json`, Cloudflare Pages Functions, and the WordPress plugin.
