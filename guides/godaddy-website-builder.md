# Install Bandit Codes on GoDaddy Website Builder

Read this first: GoDaddy sells two very different products.

- If you have **GoDaddy Web Hosting (cPanel)**, stop here and follow the [Plain Hosting / cPanel](cpanel.md) guide instead. It gives you instant server redirects with no limits.
- If you have **GoDaddy Website Builder (Websites + Marketing)**, keep reading. Many GoDaddy Website Builder pages place custom HTML boxes inside a locked frame that cannot read `?c=menu` from your page address. Try the steps below and test right away. If the frame blocks automatic redirects on your template, use the free subdomain workaround at the bottom of this page.

## What you need

- A login to your GoDaddy **Websites + Marketing** editor.
- Your `dist/snippet.html` file. Follow [Get Your Files Ready](getting-started.md) first if you do not have it yet.

## Step-by-step instructions

1. Log in to your GoDaddy account, open **My Products**, and click **Manage** next to your website, then click **Edit Website** (`needs check`).
2. In the right sidebar under **Site Navigation**, click the **+** button to add a new page (`needs check`).
3. Name the page `QR Codes`, turn **Show in Navigation** off (so it stays hidden from your main menu), and click **Create Page**.
4. Open the page's settings and confirm its web address ends in `/qr-codes`.
5. On the blank `QR Codes` page, click **Add Section**, search for **HTML**, and click **Add** (`needs check`).
6. Open `dist/snippet.html`, copy everything from `<!-- Bandit Codes v1: start -->` to `<!-- Bandit Codes v1: end -->`, and paste it into the **Custom Code** box.
7. Click **Done**, then click **Publish** in the top right.

## Check it works

1. On your phone's browser, type `https://yoursite.com/qr-codes?c=menu` (replace `menu` with one of your code IDs) and open it.
2. Watch what happens:
   - **If your phone jumps straight to the destination:** your template allows the snippet. Also test `https://yoursite.com/qr-codes?c=unknown-test` to confirm the fallback works.
   - **If your phone stays on the `/qr-codes` page (or redirects only inside a tiny box):** GoDaddy's HTML section is wrapping the code in a locked frame. Use the reliable workaround below.
3. To test with your phone camera, paste `https://yoursite.com/qr-codes?c=menu` into any free static QR code maker (choose a plain URL or static code, not a tracking short link) and scan the image on screen.

## If it does not work (Reliable Subdomain Workaround)

Because you already own your domain name at GoDaddy, you can keep your main website on GoDaddy Website Builder and point a clean subdomain (such as `go.yoursite.com`) to a separate free static host you choose (such as **Netlify** or **Cloudflare Pages**). Because you keep full ownership of your domain name, you can switch hosts anytime without reprinting a single code. (If you have never edited domain settings before, you may want a developer or AI assistant to help with Step 2.)

1. Follow the **"Starting from scratch for a subdomain"** steps in the [Netlify](netlify.md) guide (easiest, drag-and-drop only, no developer tools needed) or Method 1 of the [Cloudflare Pages](cloudflare-pages.md) guide.
2. In GoDaddy, open **My Products > DNS** (`needs check`) for your domain and add the one custom subdomain record (for example `go.yoursite.com`) that Netlify or Cloudflare gives you.
3. Point your printed QR codes to `https://go.yoursite.com/qr-codes?c=menu`. Your main site stays untouched, you pay nothing extra, and your redirects are instant server redirects.

## Limits on GoDaddy Website Builder

- GoDaddy Website Builder has no server redirect rules file and often places HTML sections inside a locked frame that blocks reading `?c=` links (`needs check`).
- GoDaddy Website Builder does not let you upload a `/codes.json` file to your site root.
- Using a subdomain (`go.yoursite.com`) pointed to Netlify or Cloudflare Pages removes every Website Builder limit while keeping all of your codes on your own domain.

## Note for your developer

- GoDaddy Websites + Marketing isolates HTML sections in a cross-origin or sandboxed `<iframe>` on most themes, preventing `window.location.search` from reading parent query parameters and blocking top-level navigation.
- A CNAME record in GoDaddy DNS pointing `go.<domain>` to Netlify (with `dist/_redirects`) or Cloudflare Pages (with `dist/cloudflare-function.js`) delivers true HTTP 302 responses under the owner's own domain at no extra hosting cost.
