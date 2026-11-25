# Install Bandit Codes on Plain Hosting (cPanel)

Plain web hosting with cPanel (such as Bluehost, SiteGround, HostGator, DreamHost, A2 Hosting, or GoDaddy Web Hosting) supports **instant server redirects** using a hidden server settings file named `.htaccess`. Visitors are sent straight to the destination with no visible pause. If your host does not allow `.htaccess`, use Method 2 (upload `codes.json` and the ready-made redirect page).

## What you need

- Your cPanel login (usually sent in your hosting welcome email).
- Your `dist/.htaccess` file (for Method 1), or `dist/codes.json` and `dist/redirect-page.html` (for Method 2). Follow [Get Your Files Ready](getting-started.md) first if you do not have them yet.

## Method 1: Server redirects with `.htaccess` (Recommended, instant)

1. Log in to **cPanel**.
2. Under **Files**, click **File Manager** (`needs check`).
3. Click **Settings** in the top right of File Manager, check **Show Hidden Files (dotfiles)**, and click **Save**.
4. Open the `public_html` folder (this is your website's main folder; some hosts call it `www` or `httpdocs`).
5. Look for a file named `.htaccess`:
   - If it exists, right-click it and choose **Copy** to save a backup named `.htaccess.backup` first.
   - If it does not exist, click **+ File** in the top left and create `.htaccess`.
6. Right-click `.htaccess` and click **Edit** (confirm UTF-8 encoding if asked).
7. Open `dist/.htaccess` on your computer, copy all of its lines, and paste them at the **very top** of your server's `.htaccess` file (above any existing lines).
8. Click **Save Changes** in the top right.

## Method 2: Upload `codes.json` and the redirect page (If `.htaccess` is disabled, short pause)

1. In cPanel **File Manager**, open `public_html`.
2. Click **Upload** and upload `dist/codes.json` straight into `public_html` (so it lives at `https://yoursite.com/codes.json`).
3. Create a folder named `qr-codes` inside `public_html`.
4. Open `public_html/qr-codes`, upload `dist/redirect-page.html`, and rename it to `index.html`.
   - *Or, if you prefer to create `index.html` by hand:* click **+ File**, name it `index.html`, click **Edit**, and paste this complete page (replacing `PASTE dist/snippet-fetch.html HERE` with the full contents of `dist/snippet-fetch.html`):
     ```html
     <!doctype html>
     <html lang="en">
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
       <title>Redirecting</title>
     </head>
     <body>
       PASTE dist/snippet-fetch.html HERE
     </body>
     </html>
     ```
5. Later, whenever a link changes, you only need to upload the updated `dist/codes.json` file.

## Check it works

1. On your phone's browser, type `https://yoursite.com/qr-codes?c=menu` (replace `menu` with one of your real code IDs) and open it.
2. Confirm it jumps immediately to the destination page or PDF.
3. Open `https://yoursite.com/qr-codes?c=unknown-test` and confirm it goes to your fallback page.
4. To test with your phone camera, paste `https://yoursite.com/qr-codes?c=menu` into any free static QR code maker (choose a plain URL or static code, not a tracking short link) and scan the image on screen.

## If it does not work

- **You see a "500 Internal Server Error" right after editing `.htaccess`:** Restore `.htaccess.backup` right away in File Manager. This usually happens if a line got wrapped during copy-paste, or if your host uses an older setting (ask your developer to check the Note at the bottom of this page).
- **The `/qr-codes` address shows "404 Not Found":** Make sure you pasted the lines at the **top** of `.htaccess` in `public_html` (not in a subfolder). If your host ignores `.htaccess` files, ask your developer to check the Note below, or use Method 2 instead.
- **Old links still load after you edit `.htaccess`:** Clear your host's cache (for example LiteSpeed Cache or Cloudflare cache) and test in a private browser tab on your phone.

## Limits on plain hosting (cPanel)

- Method 1 works on most cPanel hosts. If your host ignores `.htaccess` files, use Method 2 or ask your developer to install the server config in the Note below.
- Updating a code means rebuilding your `dist/` files (see [Get Your Files Ready](getting-started.md)) and replacing the Bandit Codes block at the top of `.htaccess` (or uploading the new `dist/codes.json` in Method 2).

## Note for your developer

- `dist/.htaccess` uses `mod_rewrite` with `RewriteCond %{REQUEST_URI}`, `RewriteCond %{QUERY_STRING}`, and `[R=302,L,QSD,NE]` (with `%` escaped as `\%` in the substitution so percent-encoded destinations like `%20` are not treated as back-references or double-escaped). Apache 2.4+ and LiteSpeed support `QSD`. On legacy Apache 2.2, replace `QSD` with a trailing `?` on targets without their own query string.
- If the server runs nginx instead of Apache, `.htaccess` is ignored; use `dist/nginx.conf` instead (put the `map $arg_<param>` block in `http {}` and the `location` block in `server {}`, run `nginx -t`, and reload). Note that when `fallback` is empty or matches the route path, `nginx.conf` falls through to `try_files $uri $uri/ =404;` (adjust if the fallback page is served from a different file such as `/qr-codes.html`).
- In Method 2, the `codes.json` loader calls `fetch(..., { redirect: "error" })`, so `/codes.json` must return HTTP `200` directly on the same origin without any redirect (even a same-origin redirect stops the loader).
