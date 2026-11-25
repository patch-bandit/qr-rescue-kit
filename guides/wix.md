# Install Bandit Codes on Wix

Wix's regular "Embed HTML" box runs inside a separate frame that cannot read your page's web address. Instead, use Wix's **Custom Code** tool in your site settings. Because this uses the paste-in snippet, a visitor sees a brief pause while the `/qr-codes` page loads before jumping to the destination.

## What you need

- A paid Wix plan with a **connected custom domain** (Wix only enables Custom Code on paid sites with a domain, `needs check`).
- Your `dist/snippet.html` file. Follow [Get Your Files Ready](getting-started.md) first if you do not have it yet.

## Step-by-step instructions

1. Log in to your Wix dashboard and open the Wix Editor to create the page first.
2. In the left menu, click **Pages & Menu** (`needs check`) and click **+ Add Page > Blank Page**.
3. Name the page `QR Codes`, hide it from your site menu (click the three dots next to the page and choose **Hide from menu**), and set its page URL to `qr-codes` under **SEO Basics** (`needs check`).
4. Click **Publish** so the `/qr-codes` page exists on your live site.
5. Go back to your main **Wix Dashboard** (outside the visual editor).
6. In the left menu, click **Settings**, scroll to the **Development & Integrations** section, and click **Custom Code** (`needs check`).
7. Click **+ Add Custom Code** in the top right.
8. Open `dist/snippet.html`, copy everything from `<!-- Bandit Codes v1: start -->` to `<!-- Bandit Codes v1: end -->`, and paste it into the code box.
9. Name the snippet `Bandit Codes`.
10. Under **Add Code to Pages**, select **Choose specific pages** and pick **QR Codes**.
11. Under **Place Code in**, choose **Body - start** (or **Head**).
12. Click **Apply** and make sure the toggle switch for `Bandit Codes` is turned on.

## Check it works

1. On your phone's browser, type `https://yoursite.com/qr-codes?c=menu` (replace `menu` with one of your code IDs) and open it.
2. Confirm it jumps to your destination link after a short pause.
3. Open `https://yoursite.com/qr-codes?c=unknown-test` and confirm it opens your fallback page.
4. To test with your phone camera, paste `https://yoursite.com/qr-codes?c=menu` into any free static QR code maker (choose a plain URL or static code, not a tracking short link) and scan the image on screen.

## If it does not work

- **You pasted it into an "Embed HTML" element on the page and nothing happens:** Remove it from the Embed HTML box and move it to **Settings > Custom Code** as shown above. Wix isolates Embed HTML boxes so they cannot read `?c=` from your page address.
- **Custom Code is missing or locked in Settings:** Wix requires a paid Premium plan and a connected custom domain before Custom Code becomes available (`needs check`).
- **Changes do not show up right away:** Wait a minute, open a fresh private browser tab on your phone, and verify the **QR Codes** page is published and selected under **Choose specific pages**.

## Limits on Wix

- Requires a paid Wix plan with a connected custom domain (`needs check`).
- Uses the HTML snippet, so visitors see a brief pause while the page loads before being forwarded.
- Updating codes means rebuilding `dist/snippet.html` (see [Get Your Files Ready](getting-started.md)) and replacing the text inside **Settings > Custom Code > Bandit Codes**.

## Note for your developer

- Wix's "Embed HTML" widget renders inside a sandboxed cross-origin `<iframe>` (`filesusr.com`), so `location.search` and `location.replace` cannot read or redirect the parent window. Site-level **Custom Code** injects directly into the main document.
- If placed in **Head** with an empty fallback, the loader appends the link `<nav>` to `document.body` once the DOM is ready.
- Wix's built-in **URL Redirect Manager** (`Marketing & SEO > SEO > URL Redirect Manager`, `needs check`) only supports path-based 301 redirects (not query strings and not 302 temporary redirects), so avoid it for mutable QR codes.
- Wix does not allow uploading a root `/codes.json` file, so always use the inline `dist/snippet.html`.
