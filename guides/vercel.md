# Install Bandit Codes on Vercel

**Heads up: Vercel is built for developer workflows and usually updates from Git.** If you do not manage your website with Git, hand `dist/vercel.json` to your developer or AI assistant and ask them to apply it for you.

Vercel supports **instant server redirects** for `/qr-codes?c=menu` links right inside a single settings file named `vercel.json`. Visitors go straight to the destination with no blank page or pause.

## What you need

- A Vercel account hosting your website (connected to GitHub, GitLab, Bitbucket, or deployed with Vercel's developer tool).
- Your `dist/vercel.json` file. Follow [Get Your Files Ready](getting-started.md) first if you do not have it yet.

## Step-by-step instructions (for sites kept in Git)

1. Open your website project folder and check whether a `vercel.json` file already exists at the top level:
   - **If you do not have a `vercel.json` yet:** copy `dist/vercel.json` straight into the top level of your project folder.
   - **If you already have a `vercel.json`:** ask your developer (or AI assistant) to merge the redirect entries from `dist/vercel.json` into your existing `vercel.json` file.
2. Commit and push your changes (or deploy with your normal Vercel workflow).
3. Open your **Vercel Dashboard > Deployments** (`needs check`) and wait until the latest deployment shows **Ready**.

## Check it works

1. On your phone's browser, type `https://yoursite.com/qr-codes?c=menu` (replace `menu` with one of your real code IDs) and open it.
2. Confirm it jumps immediately to the destination page or PDF.
3. Open `https://yoursite.com/qr-codes?c=unknown-test` and confirm it goes to your fallback page.
4. To test with your phone camera, paste `https://yoursite.com/qr-codes?c=menu` into any free static QR code maker (choose a plain URL or static code, not a tracking short link) and scan the image on screen.

## If it does not work

- **Vercel says your deployment failed because of a formatting error in `vercel.json`:** This usually happens when merging into an existing `vercel.json` file (such as a missing or extra comma). Ask your developer to check the file.
- **The `/qr-codes` page opens instead of redirecting:** Check that `vercel.json` is in the main folder your Vercel project deploys from (in **Project Settings > General**, `needs check`).
- **A destination link with `#section` at the end drops the `#section` part:** Server redirects cannot keep `#section` jump targets on the server side. If a link needs `#section` preserved, ask your developer to use `dist/snippet.html` on `/qr-codes` instead.

## Limits on Vercel

- Vercel requires a Git push or developer deploy to update `vercel.json`, so there is no browser drag-and-drop path.
- Vercel caps the number of redirect entries allowed in `vercel.json` (ask your developer to check the Note below if you have many hundreds of codes).

## Note for your developer

- `dist/vercel.json` uses Vercel's `redirects` array with `has: [{ "type": "query", "key": "c", "value": "<id>" }]` and `"permanent": false`, which returns temporary HTTP 307 redirects so mobile browsers do not cache mutable QR targets permanently. Path tokens (`/:name` and `*`) in destination URLs are percent-encoded (`%3A` and `%2A`) by `bandit-codes build`; confirm on a live Vercel deploy that Vercel passes `%3A` and `%2A` through untouched (`needs check`).
- Check on a live deploy whether Vercel forwards incoming `?c=<id>` query parameters onto external destinations (`needs check`); if a target rejects unexpected query parameters, verify it on a preview deploy.
- Vercel limits `vercel.json` redirect rules (1,024 rules on most plans, `needs check`). For larger lists, serve `dist/codes.json` from `public/codes.json` with `dist/redirect-page.html` or route `/qr-codes` through Vercel Middleware.
- Browsers never send `#fragment` identifiers to servers, so `#` anchors are stripped in `vercel.json` (and preserved only in `dist/snippet.html` / `dist/codes.json`).
