# Install Bandit Codes on Webflow

Webflow's built-in redirect settings only create fixed redirects on full page paths, not changeable `?c=menu` links. To run Bandit Codes on Webflow, paste the HTML snippet into a dedicated `/qr-codes` page using Webflow's Custom Code box. Because this uses the snippet, visitors see your `/qr-codes` page for a split second before jumping to the destination.

## What you need

- A paid Webflow **Site plan** (Webflow locks Custom Code on free Starter sites, `needs check`).
- Your `dist/snippet.html` file. Follow [Get Your Files Ready](getting-started.md) first if you do not have it yet.

## Step-by-step instructions

1. Open your project in the **Webflow Designer**.
2. In the left sidebar, click the **Pages** icon and click the **Create New Page** button (`needs check`).
3. Name the page `QR Codes` and confirm the **Slug** is `qr-codes`, so the address is `yoursite.com/qr-codes`.
4. Scroll down in the Page Settings panel to **Custom Code** (`needs check`).
5. Find the **Before `</body>` tag** box (or **Inside `<head>` tag**).
6. Open `dist/snippet.html`, copy everything from `<!-- Bandit Codes v1: start -->` to `<!-- Bandit Codes v1: end -->`, and paste it into the **Before `</body>` tag** box.
7. Click **Save**, then click **Publish** in the top right and publish to your live custom domain.

## Check it works

1. On your phone's browser, type `https://yoursite.com/qr-codes?c=menu` (replace `menu` with one of your real code IDs) and open it.
2. Confirm it jumps to the destination page or PDF after a short pause.
3. Open `https://yoursite.com/qr-codes?c=unknown-test` and confirm it opens your fallback page (your home page by default).
4. To test with your phone camera, paste `https://yoursite.com/qr-codes?c=menu` into any free static QR code maker (choose a plain URL or static code, not a tracking short link) and scan the image on screen.

## If it does not work

- **The Custom Code box is locked:** You need a paid Webflow Site plan (or Workspace plan with Custom Code enabled) to run custom scripts (`needs check`).
- **You see an error about character limits:** Webflow's Page Custom Code box has a 50,000-character limit (`needs check`), which holds roughly 300 to 400 typical codes. If you have more codes than that, ask your developer about hosting the redirects on Netlify or Cloudflare Pages on a subdomain such as `go.yoursite.com`.
- **Nothing happens when you test in Webflow Preview:** Webflow does not run Custom Code in Preview mode. You must click **Publish** and test on the live address.

## Limits on Webflow

- Requires a paid Site plan for Custom Code (`needs check`).
- Uses the HTML snippet, so visitors see a brief pause before being forwarded.
- Updating a code requires rebuilding `dist/snippet.html` (see [Get Your Files Ready](getting-started.md)), pasting it back into the `/qr-codes` page's Custom Code box, and republishing the site.

## Note for your developer

- If placed in **Inside `<head>` tag** with an empty fallback, the loader appends the link `<nav>` to `document.body` once the DOM is ready.
- Webflow's native **Site Settings > Publishing > 301 Redirects** (`needs check`) only issues HTTP 301 permanent redirects (cached permanently by mobile browsers) and does not match `?c=` query parameters.
- Webflow does not support uploading a static `/codes.json` file at the site root; use the inline `dist/snippet.html` (or place Cloudflare in front of the domain or use a subdomain on Cloudflare Pages or Netlify for edge 302s).
