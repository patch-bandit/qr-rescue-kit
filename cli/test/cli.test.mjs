import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runCli } from "../lib/run.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(__dirname, "../bin/bandit-codes.mjs");

function createMemFs() {
  const files = new Map();
  const norm = (p) => path.resolve(p);
  return {
    files,
    existsSync(p) {
      return files.has(norm(p));
    },
    readFileSync(p) {
      const k = norm(p);
      if (!files.has(k)) throw new Error(`ENOENT: ${k}`);
      return files.get(k);
    },
    writeFileSync(p, content) {
      files.set(norm(p), String(content));
    },
    mkdirSync() {},
  };
}

function invoke(args, cwd, memFs) {
  const stdout = [];
  const stderr = [];
  const code = runCli(args, {
    cwd,
    fs: memFs,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

test("init, add, set, retire, list, and check lifecycle", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  assert.equal(invoke(["init"], dir, memFs).code, 0);
  assert.equal(invoke(["init"], dir, memFs).code, 1, "refuses overwrite without --force");

  const added = invoke(["add", "menu", "https://example.com/menu.pdf", "--note", "Table tent"], dir, memFs);
  assert.equal(added.code, 0);
  assert.equal(invoke(["add", "menu", "https://example.com/other.pdf"], dir, memFs).code, 1, "refuses duplicate id");

  const updated = invoke(["set", "menu", "https://example.com/menu-v2.pdf"], dir, memFs);
  assert.equal(updated.code, 0);

  const listed = invoke(["list"], dir, memFs);
  assert.equal(listed.code, 0);
  assert.match(listed.stdout, /menu\t\[active\]\thttps:\/\/example\.com\/menu-v2\.pdf\s+# Table tent/);

  assert.equal(invoke(["add", "promo", "https://example.com/spring"], dir, memFs).code, 0);
  assert.equal(invoke(["retire", "promo"], dir, memFs).code, 0);
  const retiredList = invoke(["list", "--retired"], dir, memFs);
  assert.match(retiredList.stdout, /promo\t\[retired\]\t\(fallback\)/);

  const checked = invoke(["check"], dir, memFs);
  assert.equal(checked.code, 0);
  assert.match(checked.stdout, /2 codes checked \(1 active, 1 retired\)/);
});

test("rejects unsafe URLs and bad code IDs", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  assert.equal(invoke(["init"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "bad", "javascript:alert(1)"], dir, memFs).code, 1);
  assert.equal(invoke(["add", "bad", "data:text/html,hi"], dir, memFs).code, 1);
  assert.equal(invoke(["add", "BadUpper", "https://example.com/a"], dir, memFs).code, 1);
  assert.equal(invoke(["add", "has_underscore", "https://example.com/a"], dir, memFs).code, 1);
  assert.equal(invoke(["add", "constructor", "https://example.com/a"], dir, memFs).code, 1);
  assert.equal(invoke(["add", "a".repeat(65), "https://example.com/a"], dir, memFs).code, 1);

  memFs.writeFileSync(
    path.join(dir, "bandit-codes.json"),
    JSON.stringify({ v: 1, param: "c", fallback: "//evil.com", codes: { ok: { to: "javascript:void(0)" } } }),
  );
  const res = invoke(["check"], dir, memFs);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /ERROR:/);
});

test("build writes snippet, codes.json, and all server rule files", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  assert.equal(invoke(["init"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "menu", "https://example.com/menu.pdf", "--note", "Table tent"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "wifi", "https://example.com/guest?a=1&b=2#top", "--note", "Lobby"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "old", "https://example.com/old"], dir, memFs).code, 0);
  assert.equal(invoke(["retire", "old"], dir, memFs).code, 0);

  const built = invoke(["build", "--out", "dist", "--path", "/qr-codes", "--domain", "shop.example"], dir, memFs);
  assert.equal(built.code, 0);
  assert.match(built.stdout, /Built 11 files/);
  assert.match(built.stdout, /cloudflare-redirects\.csv uses path-style addresses/);

  const dist = path.join(dir, "dist");
  const snippet = memFs.readFileSync(path.join(dist, "snippet.html"));
  assert.match(snippet, /^<!-- Bandit Codes v1: start -->/);
  assert.match(snippet, /<script type="application\/json" id="bandit-codes">/);
  assert.match(snippet, /<noscript>[\s\S]*Table tent \(menu\)[\s\S]*<\/noscript>/);
  assert.match(snippet, /target="_blank" rel="noopener"/);
  assert.doesNotMatch(snippet, /"old":/);

  const fetchSnippet = memFs.readFileSync(path.join(dist, "snippet-fetch.html"));
  assert.match(fetchSnippet, /data-src="\/codes\.json"/);

  const redirectPage = memFs.readFileSync(path.join(dist, "redirect-page.html"));
  assert.match(redirectPage, /<!doctype html>/i);
  assert.match(redirectPage, /data-src="\/codes\.json"/);

  const codesJson = JSON.parse(memFs.readFileSync(path.join(dist, "codes.json")));
  assert.equal(codesJson.v, 1);
  assert.equal(codesJson.codes.menu.to, "https://example.com/menu.pdf");
  assert.equal(codesJson.codes.old, undefined);

  const netlify = memFs.readFileSync(path.join(dist, "_redirects"));
  assert.match(netlify, /\/qr-codes\s+c=menu\s+https:\/\/example\.com\/menu\.pdf\s+302/);

  const htaccess = memFs.readFileSync(path.join(dist, ".htaccess"));
  assert.match(htaccess, /RewriteCond %\{QUERY_STRING\} \(\^\|&\)c=menu\(&\|\$\)/);
  assert.match(htaccess, /\[R=302,L,QSD,NE\]/);

  const nginx = memFs.readFileSync(path.join(dist, "nginx.conf"));
  assert.match(nginx, /map \$arg_c \$bandit_code_target/);
  assert.match(nginx, /"menu" "https:\/\/example\.com\/menu\.pdf";/);

  const vercel = JSON.parse(memFs.readFileSync(path.join(dist, "vercel.json")));
  assert.equal(vercel.redirects[0].source, "/qr-codes");
  assert.equal(vercel.redirects[0].has[0].value, "menu");
  assert.equal(vercel.redirects[0].permanent, false);

  const cfCsv = memFs.readFileSync(path.join(dist, "cloudflare-redirects.csv"));
  assert.match(cfCsv, /shop\.example\/qr-codes\/menu,https:\/\/example\.com\/menu\.pdf,302/);

  const cfFn = memFs.readFileSync(path.join(dist, "cloudflare-function.js"));
  assert.match(cfFn, /export function onRequestGet/);

  const wpCsv = memFs.readFileSync(path.join(dist, "wordpress-redirection.csv"));
  assert.match(wpCsv, /"\/qr-codes\?c=menu","https:\/\/example\.com\/menu\.pdf","0","302"/);
});

test("import reads an existing HTML snippet and a vendor CSV", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  const snippetPath = path.join(dir, "existing.html");
  memFs.writeFileSync(
    snippetPath,
    [
      "<!-- Bandit Codes v1: start -->",
      '<script type="application/json" id="bandit-codes">{"v":1,"param":"c","fallback":"/","codes":{"menu":{"to":"https://example.com/menu.pdf","note":"Table tent"}}}</script>',
      "<script></script>",
      "<!-- Bandit Codes v1: end -->",
    ].join("\n"),
  );
  const imp1 = invoke(["import", snippetPath], dir, memFs);
  assert.equal(imp1.code, 0);
  assert.match(imp1.stdout, /1 added, 0 updated, 0 skipped/);

  const csvPath = path.join(dir, "vendor-export.csv");
  memFs.writeFileSync(
    csvPath,
    [
      "Name,Target URL,Description",
      "Spring Menu,https://example.com/spring.pdf,Patio cards",
      "Lobby WiFi,https://example.com/wifi,Front desk sign",
    ].join("\n"),
  );
  const imp2 = invoke(["import", csvPath, "--slugify"], dir, memFs);
  assert.equal(imp2.code, 0);
  assert.match(imp2.stdout, /2 added, 0 updated, 0 skipped/);

  const data = JSON.parse(memFs.readFileSync(path.join(dir, "bandit-codes.json")));
  assert.equal(data.codes.menu.to, "https://example.com/menu.pdf");
  assert.equal(data.codes["spring-menu"].to, "https://example.com/spring.pdf");
  assert.equal(data.codes["lobby-wifi"].note, "Front desk sign");

  const imp3 = invoke(["import", csvPath, "--slugify"], dir, memFs);
  assert.equal(imp3.code, 0);
  assert.match(imp3.stdout, /0 added, 0 updated, 2 skipped/);
});

test("snippet escapes </script> in notes to prevent HTML breakout", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  assert.equal(invoke(["init"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "xss", "https://example.com/safe", "--note", "</script><script>alert(1)</script>"], dir, memFs).code, 0);
  assert.equal(invoke(["build"], dir, memFs).code, 0);
  const snippet = memFs.readFileSync(path.join(dir, "dist/snippet.html"));
  assert.doesNotMatch(snippet, /<\/script><script>alert/);
  assert.match(snippet, /\\u003c\/script\\u003e/);
});

test("server rules escape percent sequences in Apache, path tokens in Vercel, and reject hyphenated params", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  assert.equal(invoke(["init", "--param", "qr-id"], dir, memFs).code, 1, "hyphenated param breaks nginx $arg_");
  assert.equal(invoke(["init", "--param", "qr_id"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "space-pdf", "https://example.com/spring%20menu.pdf"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "pct-one", "https://example.com/doc%10.pdf"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "raw-pct", "https://example.com/a%1z"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "colon-seg", "https://example.com/items/:id/view"], dir, memFs).code, 0);

  const built = invoke(["build", "--out", "dist", "--path", "/qr-codes", "--domain", "shop.example"], dir, memFs);
  assert.equal(built.code, 0);

  const htaccess = memFs.readFileSync(path.join(dir, "dist/.htaccess"));
  assert.match(htaccess, /RewriteRule \^ https:\/\/example\.com\/spring\\%20menu\.pdf \[R=302,L,QSD,NE\]/);
  assert.match(htaccess, /RewriteRule \^ https:\/\/example\.com\/doc\\%10\.pdf \[R=302,L,QSD,NE\]/);
  assert.match(htaccess, /RewriteRule \^ https:\/\/example\.com\/a\\%251z \[R=302,L,QSD,NE\]/);

  const vercel = JSON.parse(memFs.readFileSync(path.join(dir, "dist/vercel.json")));
  const colonRule = vercel.redirects.find((r) => r.has && r.has[0].value === "colon-seg");
  assert.equal(colonRule.destination, "https://example.com/items/%3Aid/view");

  const nginx = memFs.readFileSync(path.join(dir, "dist/nginx.conf"));
  assert.match(nginx, /map \$arg_qr_id \$bandit_code_target/);
});

test("terminal error output escapes control characters from untrusted CSV and JSON inputs", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  const csvPath = path.join(dir, "evil.csv");
  memFs.writeFileSync(csvPath, "id,to\n\x1b[31mFAKE\x1b[0m,https://example.com/a\n");
  const imp = invoke(["import", csvPath], dir, memFs);
  assert.equal(imp.code, 1);
  assert.doesNotMatch(imp.stderr, /\x1b/);
  assert.match(imp.stderr, /\\u001b/);

  memFs.writeFileSync(
    path.join(dir, "bandit-codes.json"),
    JSON.stringify({ v: 1, param: "c", fallback: "/", codes: { "\x1b[31mBAD": { to: "https://example.com/a" } } }),
  );
  const chk = invoke(["check"], dir, memFs);
  assert.equal(chk.code, 1);
  assert.doesNotMatch(chk.stderr, /\x1b/);
  assert.match(chk.stderr, /\\u001b/);

  // Security N2: Unicode bidi direction controls are also escaped in terminal output
  const bidiFs = createMemFs();
  const bidiCsv = path.join(dir, "bidi.csv");
  bidiFs.writeFileSync(bidiCsv, "id,to\n\u202eSPOOF\u2066TEST\u2069,https://example.com/a\n");
  const bidiImp = invoke(["import", bidiCsv], dir, bidiFs);
  assert.equal(bidiImp.code, 1);
  assert.doesNotMatch(bidiImp.stderr, /[\u202a-\u202e\u2066-\u2069]/);
  assert.match(bidiImp.stderr, /\\u202e/);
  assert.match(bidiImp.stderr, /\\u2066/);
  assert.match(bidiImp.stderr, /\\u2069/);

  bidiFs.writeFileSync(
    path.join(dir, "bandit-codes.json"),
    JSON.stringify({ v: 1, param: "c", fallback: "/", codes: { "\u202eBAD\u2066": { to: "https://example.com/a" } } }),
  );
  const bidiChk = invoke(["check"], dir, bidiFs);
  assert.equal(bidiChk.code, 1);
  assert.doesNotMatch(bidiChk.stderr, /[\u202a-\u202e\u2066-\u2069]/);
  assert.match(bidiChk.stderr, /\\u202e/);
  assert.match(bidiChk.stderr, /\\u2066/);
});

test("list --urls prints full printable QR addresses for reprinting", () => {
  const dir = "/virtual/project";
  const memFs = createMemFs();

  assert.equal(invoke(["init"], dir, memFs).code, 0);
  assert.equal(invoke(["add", "menu", "https://example.com/menu.pdf", "--note", "Table tent"], dir, memFs).code, 0);

  const plain = invoke(["list", "--urls", "--domain", "shop.example", "--path", "/qr-codes"], dir, memFs);
  assert.equal(plain.code, 0);
  assert.match(plain.stdout, /^https:\/\/shop\.example\/qr-codes\?c=menu\t\[active\]\thttps:\/\/example\.com\/menu\.pdf/);

  const asJson = invoke(["list", "--urls", "--json", "--domain", "shop.example", "--path", "/qr-codes"], dir, memFs);
  assert.equal(asJson.code, 0);
  const parsed = JSON.parse(asJson.stdout);
  assert.equal(parsed.menu.qrUrl, "https://shop.example/qr-codes?c=menu");
});

test("CLI binary runs via node subprocess", () => {
  const out = execFileSync(process.execPath, [binPath, "--help"], { encoding: "utf8" });
  assert.match(out, /bandit-codes init/);
});
