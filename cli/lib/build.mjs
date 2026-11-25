import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csvCell } from "./csv.mjs";
import { checkDomain, checkRoutePath, validateStore } from "./validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loaderDir = path.resolve(__dirname, "../../loader");

function readMinLoader(filename) {
  return fs.readFileSync(path.join(loaderDir, filename), "utf8").trim();
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function serverSafe(url) {
  return url
    .replace(/%(?![0-9A-Fa-f]{2})/g, "%25")
    .replace(/\$/g, "%24")
    .replace(/;/g, "%3B")
    .replace(/\{/g, "%7B")
    .replace(/\}/g, "%7D")
    .replace(/"/g, "%22");
}

function apacheSafe(url) {
  return serverSafe(url).replace(/%/g, "\\%");
}

function netlifySafe(url) {
  const i = url.indexOf("://");
  const head = i === -1 ? "" : url.slice(0, i + 3);
  const tail = i === -1 ? url : url.slice(i + 3);
  return head + tail.replace(/\*/g, "%2A").replace(/\/:/g, "/%3A");
}

function vercelSafe(url) {
  return netlifySafe(url);
}

function stripFragment(url) {
  const idx = url.indexOf("#");
  return idx === -1 ? { url, cut: false } : { url: url.slice(0, idx), cut: true };
}

function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildPublicStore(store) {
  const codes = {};
  for (const [id, entry] of Object.entries(store.codes)) {
    if (!entry.to) continue;
    const out = { to: entry.to };
    if (entry.note) out.note = entry.note;
    if (entry.retired) out.retired = true;
    codes[id] = out;
  }
  return {
    v: 1,
    param: store.param,
    fallback: store.fallback,
    codes,
  };
}

function renderNoscript(store) {
  const items = [];
  for (const [id, entry] of Object.entries(store.codes)) {
    if (entry.retired || !entry.to) continue;
    const label = entry.note ? `${entry.note} (${id})` : id;
    items.push(`<li><a href="${escapeHtml(entry.to)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></li>`);
  }
  if (items.length === 0) {
    return "<noscript><p>No active links are listed yet.</p></noscript>";
  }
  return `<noscript><nav aria-label="QR code links"><ul>${items.join("")}</ul></nav></noscript>`;
}

export function buildSnippet(store) {
  const pub = buildPublicStore(store);
  const loaderJs = readMinLoader("bandit-codes.min.js");
  return [
    "<!-- Bandit Codes v1: start -->",
    `<script type="application/json" id="bandit-codes">${escapeJsonForScript(pub)}</script>`,
    `<script>${loaderJs}</script>`,
    renderNoscript(store),
    "<!-- Bandit Codes v1: end -->",
    "",
  ].join("\n");
}

export function buildFetchSnippet(store, jsonPath = "/codes.json") {
  const loaderJs = readMinLoader("bandit-codes-fetch.min.js");
  return [
    "<!-- Bandit Codes v1 (codes.json): start -->",
    `<script data-src="${escapeHtml(jsonPath)}">${loaderJs}</script>`,
    renderNoscript(store),
    "<!-- Bandit Codes v1 (codes.json): end -->",
    "",
  ].join("\n");
}

export function buildRedirectPage(store, jsonPath = "/codes.json") {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    "  <title>Redirecting</title>",
    "</head>",
    "<body>",
    buildFetchSnippet(store, jsonPath).trimEnd(),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function activeRedirectRows(store) {
  const rows = [];
  const notes = [];
  for (const [id, entry] of Object.entries(store.codes)) {
    if (!entry.to) continue;
    const { url, cut } = stripFragment(entry.to);
    if (cut) {
      notes.push(`Code "${id}": #fragment removed from server rules (browsers do not send fragments to servers; the HTML snippet preserves it).`);
    }
    rows.push({ id, target: url, fullTarget: entry.to });
  }
  return { rows, notes };
}

export function buildNetlifyRedirects(store, routePath) {
  const { rows } = activeRedirectRows(store);
  const lines = [
    `# Bandit Codes v1 Netlify _redirects rules for ${routePath}?${store.param}=<id>`,
    "# Uses HTTP 302 (temporary) redirects so phones check for updated destinations.",
  ];
  for (const r of rows) {
    lines.push(`${routePath}  ${store.param}=${r.id}  ${netlifySafe(r.target)}  302`);
  }
  if (store.fallback && store.fallback !== routePath) {
    lines.push(`${routePath}  ${netlifySafe(store.fallback)}  302`);
  }
  return `${lines.join("\n")}\n`;
}

export function buildApacheHtaccess(store, routePath) {
  const { rows } = activeRedirectRows(store);
  const escPath = escRegex(routePath);
  const escParam = escRegex(store.param);
  const lines = [
    `# Bandit Codes v1 Apache .htaccess rules for ${routePath}?${store.param}=<id>`,
    "# Place near the top of .htaccess, above WordPress or framework rewrite rules.",
    "RewriteEngine On",
  ];
  for (const r of rows) {
    lines.push(`RewriteCond %{REQUEST_URI} ^${escPath}/?$`);
    lines.push(`RewriteCond %{QUERY_STRING} (^|&)${escParam}=${escRegex(r.id)}(&|$)`);
    lines.push(`RewriteRule ^ ${apacheSafe(r.target)} [R=302,L,QSD,NE]`);
  }
  if (store.fallback && store.fallback !== routePath) {
    lines.push(`RewriteCond %{REQUEST_URI} ^${escPath}/?$`);
    lines.push(`RewriteRule ^ ${apacheSafe(store.fallback)} [R=302,L,QSD,NE]`);
  }
  return `${lines.join("\n")}\n`;
}

export function buildNginxConfig(store, routePath) {
  const { rows } = activeRedirectRows(store);
  const escPath = escRegex(routePath);
  const lines = [
    `# Bandit Codes v1 nginx rules for ${routePath}?${store.param}=<id>`,
    "# Put the map block inside http { } and the location block inside server { }.",
    "",
    `map $arg_${store.param} $bandit_code_target {`,
    '    default "";',
  ];
  for (const r of rows) {
    lines.push(`    "${r.id}" "${serverSafe(r.target)}";`);
  }
  lines.push("}");
  lines.push("");
  lines.push("# Inside your server { } block:");
  lines.push(`location ~ ^${escPath}/?$ {`);
  lines.push('    add_header Cache-Control "no-store";');
  lines.push('    if ($bandit_code_target != "") {');
  lines.push("        return 302 $bandit_code_target;");
  lines.push("    }");
  if (store.fallback && store.fallback !== routePath) {
    lines.push(`    return 302 "${serverSafe(store.fallback)}";`);
  } else {
    lines.push("    # Adjust if your fallback page is served from a different file (for example /qr-codes.html).");
    lines.push("    try_files $uri $uri/ =404;");
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

export function buildVercelConfig(store, routePath) {
  const { rows } = activeRedirectRows(store);
  const redirects = rows.map((r) => ({
    source: routePath,
    has: [{ type: "query", key: store.param, value: r.id }],
    destination: vercelSafe(r.target),
    permanent: false,
  }));
  if (store.fallback && store.fallback !== routePath) {
    redirects.push({
      source: routePath,
      destination: vercelSafe(store.fallback),
      permanent: false,
    });
  }
  return `${JSON.stringify({ redirects }, null, 2)}\n`;
}

export function buildCloudflareBulkCsv(store, routePath, domain) {
  const { rows } = activeRedirectRows(store);
  const lines = rows.map((r) => {
    const src = `${domain}${routePath}/${r.id}`;
    return [src, r.target, "302"].map((v) => {
      const q = csvCell(v);
      return /[",]/.test(v) || q !== `"${v}"` ? q : v;
    }).join(",");
  });
  return lines.length ? `${lines.join("\n")}\n` : "";
}

export function buildCloudflareFunction(store) {
  const pub = buildPublicStore(store);
  return [
    "// Bandit Codes v1 Cloudflare Pages Function",
    "// Save as functions/qr-codes.js (matching your route path) in your Pages project.",
    `const CONFIG = ${JSON.stringify(pub, null, 2)};`,
    "",
    "const ID_RE = /^[a-z0-9-]{1,64}$/;",
    "",
    "function safeHttp(u) {",
    '  if (typeof u !== "string" || !u) return "";',
    "  try {",
    "    const p = new URL(u);",
    '    return p.protocol === "https:" || p.protocol === "http:" ? p.href : "";',
    '  } catch { return ""; }',
    "}",
    "",
    "export function onRequestGet(context) {",
    "  const reqUrl = new URL(context.request.url);",
    "  const id = reqUrl.searchParams.get(CONFIG.param || \"c\");",
    "  if (id && ID_RE.test(id) && Object.prototype.hasOwnProperty.call(CONFIG.codes, id)) {",
    "    const target = safeHttp(CONFIG.codes[id].to);",
    "    if (target) {",
    '      return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });',
    "    }",
    "  }",
    "  const fb = CONFIG.fallback || \"\";",
    "  if (fb) {",
    "    const dest = fb.startsWith(\"/\") && !fb.startsWith(\"//\") ? new URL(fb, reqUrl.origin).href : safeHttp(fb);",
    "    if (dest && dest !== reqUrl.href) {",
    '      return new Response(null, { status: 302, headers: { Location: dest, "Cache-Control": "no-store" } });',
    "    }",
    "  }",
    "  return context.next();",
    "}",
    "",
  ].join("\n");
}

export function buildWordPressRedirectionCsv(store, routePath) {
  const { rows } = activeRedirectRows(store);
  const header = ["source", "target", "regex", "code"].map(csvCell).join(",");
  const body = rows.map((r) =>
    [`${routePath}?${store.param}=${r.id}`, r.target, "0", "302"].map(csvCell).join(","),
  );
  return `${[header, ...body].join("\n")}\n`;
}

export function writeBuildOutputs(rawStore, { outDir, routePath = "/qr-codes", domain = "example.com", fsImpl = fs }) {
  const checked = validateStore(rawStore);
  if (!checked.ok) {
    throw new Error(`Invalid codes file:\n${checked.errors.join("\n")}`);
  }
  const pathCheck = checkRoutePath(routePath);
  if (!pathCheck.ok) throw new Error(pathCheck.reason);
  const domainCheck = checkDomain(domain);
  if (!domainCheck.ok) throw new Error(domainCheck.reason);

  const store = checked.data;
  const { notes } = activeRedirectRows(store);
  notes.push(
    `cloudflare-redirects.csv uses path-style addresses (${domainCheck.domain}${pathCheck.path}/<id>) for Cloudflare Bulk Redirects, not ?${store.param}=<id> links. Use cloudflare-function.js for ?${store.param}=<id> redirects.`,
  );
  fsImpl.mkdirSync(outDir, { recursive: true });

  const files = [
    ["snippet.html", buildSnippet(store)],
    ["snippet-fetch.html", buildFetchSnippet(store)],
    ["redirect-page.html", buildRedirectPage(store)],
    ["codes.json", `${JSON.stringify(buildPublicStore(store), null, 2)}\n`],
    ["_redirects", buildNetlifyRedirects(store, pathCheck.path)],
    [".htaccess", buildApacheHtaccess(store, pathCheck.path)],
    ["nginx.conf", buildNginxConfig(store, pathCheck.path)],
    ["vercel.json", buildVercelConfig(store, pathCheck.path)],
    ["cloudflare-redirects.csv", buildCloudflareBulkCsv(store, pathCheck.path, domainCheck.domain)],
    ["cloudflare-function.js", buildCloudflareFunction(store)],
    ["wordpress-redirection.csv", buildWordPressRedirectionCsv(store, pathCheck.path)],
  ];

  const written = [];
  for (const [name, content] of files) {
    const dest = path.join(outDir, name);
    fsImpl.writeFileSync(dest, content, "utf8");
    written.push(name);
  }
  return { written, notes };
}
