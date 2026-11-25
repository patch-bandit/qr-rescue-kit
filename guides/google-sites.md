# Bandit Codes on Google Sites

**Plain answer: as far as we know (`needs check`), Google Sites cannot run the automatic Bandit Codes redirect snippet or server redirect rules.**

We would rather tell you that up front than waste your time. Google Sites puts every custom HTML box inside a locked safety frame (`needs check`), so a script pasted into Google Sites cannot read `?c=menu` from your page address and cannot automatically send a visitor's phone to another website. Google Sites also does not let you upload a `/codes.json` file or add server redirect rules.

You have two good options that still keep you free of paid QR vendors:

## Option 1: Use a subdomain on your own domain (Recommended, automatic instant redirects)

If you already connected your own domain name (like `yoursite.com`) to Google Sites, you can keep your main website on Google Sites and point a second address on your same domain (like `go.yoursite.com`) to a separate free website host you pick (such as **Netlify** or **Cloudflare Pages**). Because you keep full ownership of your domain name, you can move that subdomain to any other host later without reprinting a single code. (If you have never edited domain settings before, you may want a developer or AI assistant to help with the domain step.)

### What you need

- Access to the company where you bought your domain name (for example Namecheap, Squarespace Domains, GoDaddy, or Cloudflare).
- A free account on **Netlify** (easiest, drag-and-drop) or **Cloudflare Pages**.
- Your `dist/` folder. Follow [Get Your Files Ready](getting-started.md) first if you do not have it yet.

### Step-by-step instructions

1. Follow the **"Starting from scratch for a subdomain"** steps in the [Netlify](netlify.md) guide (easiest, no developer tools needed) or Method 1 of the [Cloudflare Pages](cloudflare-pages.md) guide.
2. In that host's settings, add a custom domain such as `go.yoursite.com`.
3. Log in to the company where you bought your domain name, open **DNS Settings** (`needs check`), and add the one record the host gives you for `go`.
4. Print your QR codes pointing to `https://go.yoursite.com/qr-codes?c=menu`. Your main site stays untouched on Google Sites, and every QR code stays on your own domain forever.

## Option 2: Plain clickable link page on Google Sites (No automatic jump)

If you do not own a custom domain and only have a `sites.google.com/view/...` address:

1. Open your Google Site, click **Pages** in the right sidebar, and click **+** to create a page called `QR Codes` (`needs check`).
2. Add a clean list of clickable links on the page (for example, "Lunch Menu (PDF)", "Event Schedule", "Contact Us") using regular Google Sites text links or buttons.
3. Click **Publish**.
4. Point your QR code to that Google Sites page. Note that every printed QR code pointing to this page lands on the same shared list of links, so it cannot send each code straight to a different destination. Visitors tap the link they need, and you can update the links on that page anytime without reprinting the QR code.

## Check it works

- **For Option 1:** Type `https://go.yoursite.com/qr-codes?c=menu` (replace `menu` with one of your code IDs) into your phone's browser and confirm it jumps immediately to your destination. To test with your phone camera, paste that exact address into any free static QR code maker (choose a plain URL or static code, not a tracking short link) and scan the image on screen.
- **For Option 2:** Open your Google Sites `QR Codes` page on your phone (or make a free static QR code pointing to that page and scan it) and tap each link to confirm it opens.

## If it does not work

- **You tried pasting `dist/snippet.html` into Google Sites' "Embed Code" box and nothing happened:** That is expected because of Google Sites' locked frame (`needs check`). Use Option 1 or Option 2 above instead.
- **Your new `go.yoursite.com` address shows an error right after setup:** Domain changes and free HTTPS security certificates can take 10 to 30 minutes to finish activating. Wait a few minutes and test again on your phone.

## Limits on Google Sites

- As far as we know (`needs check`), Google Sites cannot run automatic redirects from an Embed Code box, cannot read `?c=<id>` links inside embedded HTML, and cannot serve `/codes.json` or server redirect rules.
- Option 2 still uses a `sites.google.com` web address owned by Google, and every QR code pointing to it opens the same shared link list. For full ownership on your own domain with individual per-code redirects, use Option 1.

## Note for your developer

- Google Sites renders **Embed > Embed code** blocks inside nested cross-origin sandboxed iframes (`googleusercontent.com`, `needs check`). The embedded script has neither access to `window.top.location.search` nor permission to perform a top-level redirect without a user click.
- Delegating a dedicated subdomain (`go.<domain>`) via a CNAME record to Netlify (`_redirects`), Cloudflare Pages (`functions/qr-codes.js`), or Vercel (`vercel.json`) provides clean HTTP 302/307 redirects under the owner's domain at no hosting cost while leaving the apex/www site on Google Sites.
