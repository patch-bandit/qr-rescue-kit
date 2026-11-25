import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inlineSrc = fs.readFileSync(path.join(__dirname, "bandit-codes.js"), "utf8");
const inlineMin = fs.readFileSync(path.join(__dirname, "bandit-codes.min.js"), "utf8");
const fetchSrc = fs.readFileSync(path.join(__dirname, "bandit-codes-fetch.js"), "utf8");
const fetchMin = fs.readFileSync(path.join(__dirname, "bandit-codes-fetch.min.js"), "utf8");

function createFakeElement(tag) {
  const attrs = new Map();
  const el = {
    tagName: tag.toUpperCase(),
    attrs,
    childNodes: [],
    parentNode: null,
    nextSibling: null,
    textContent: "",
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    appendChild(child) {
      child.parentNode = el;
      el.childNodes.push(child);
      return child;
    },
    insertBefore(child, ref) {
      child.parentNode = el;
      const idx = ref ? el.childNodes.indexOf(ref) : -1;
      if (idx === -1) el.childNodes.push(child);
      else el.childNodes.splice(idx, 0, child);
      return child;
    },
  };
  return el;
}

function runInline(source, { pageUrl, jsonText, inHead = false, delayBody = false }) {
  const u = new URL(pageUrl);
  const replaced = [];
  const head = createFakeElement("head");
  const body = createFakeElement("body");
  const listeners = new Map();
  const jsonEl = jsonText === null ? null : createFakeElement("script");
  if (jsonEl) {
    jsonEl.textContent = jsonText;
    (inHead ? head : body).appendChild(jsonEl);
  }
  const doc = {
    body: delayBody ? null : body,
    getElementById(id) { return id === "bandit-codes" ? jsonEl : null; },
    createElement: createFakeElement,
    addEventListener(ev, fn) {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(fn);
    },
  };
  const sandbox = {
    URL,
    URLSearchParams,
    location: {
      href: u.href,
      origin: u.origin,
      pathname: u.pathname,
      search: u.search,
      replace(dest) { replaced.push(dest); },
    },
    document: doc,
  };
  vm.runInNewContext(source, sandbox);
  if (delayBody) {
    doc.body = body;
    for (const fn of listeners.get("DOMContentLoaded") || []) fn();
  }
  return { replaced, head, body };
}

async function runFetch(
  source,
  { pageUrl, dataSrc, fetchPayload, fetchOk = true, fetchRedirected = false, fetchResUrl, inHead = false, delayBody = false },
) {
  const u = new URL(pageUrl);
  const replaced = [];
  const fetched = [];
  const head = createFakeElement("head");
  const body = createFakeElement("body");
  const listeners = new Map();
  const scriptEl = createFakeElement("script");
  if (dataSrc !== undefined) scriptEl.setAttribute("data-src", dataSrc);
  (inHead ? head : body).appendChild(scriptEl);
  const doc = {
    body: delayBody ? null : body,
    currentScript: scriptEl,
    createElement: createFakeElement,
    addEventListener(ev, fn) {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(fn);
    },
  };
  const sandbox = {
    URL,
    URLSearchParams,
    location: {
      href: u.href,
      origin: u.origin,
      pathname: u.pathname,
      search: u.search,
      replace(dest) { replaced.push(dest); },
    },
    document: doc,
    fetch(url, opts) {
      fetched.push({ url, opts });
      return Promise.resolve({
        ok: fetchOk,
        redirected: fetchRedirected,
        url: fetchResUrl !== undefined ? fetchResUrl : url,
        json: () => Promise.resolve(fetchPayload),
      });
    },
  };
  vm.runInNewContext(source, sandbox);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  if (delayBody) {
    doc.body = body;
    for (const fn of listeners.get("DOMContentLoaded") || []) fn();
  }
  return { replaced, fetched, head, body };
}

function collectLinks(node, out = []) {
  if (node.tagName === "A") out.push(node);
  for (const child of node.childNodes) collectLinks(child, out);
  return out;
}

test("minified loaders stay under 2 KB", () => {
  assert.ok(Buffer.byteLength(inlineMin, "utf8") < 2048, `inline loader too large: ${Buffer.byteLength(inlineMin, "utf8")}`);
  assert.ok(Buffer.byteLength(fetchMin, "utf8") < 2048, `fetch loader too large: ${Buffer.byteLength(fetchMin, "utf8")}`);
});

for (const [label, src] of [["inline source", inlineSrc], ["inline minified", inlineMin]]) {
  test(`${label}: redirects valid code via location.replace`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "/",
      codes: { menu: { to: "https://example.com/menu.pdf", note: "Table tent" } },
    });
    const res = runInline(src, { pageUrl: "https://shop.example/qr-codes?c=menu", jsonText: payload });
    assert.deepEqual(res.replaced, ["https://example.com/menu.pdf"]);
  });

  test(`${label}: redirects unknown or missing code to fallback`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "/",
      codes: { menu: { to: "https://example.com/menu.pdf" } },
    });
    const res1 = runInline(src, { pageUrl: "https://shop.example/qr-codes?c=missing", jsonText: payload });
    assert.deepEqual(res1.replaced, ["https://shop.example/"]);
    const res2 = runInline(src, { pageUrl: "https://shop.example/qr-codes", jsonText: payload });
    assert.deepEqual(res2.replaced, ["https://shop.example/"]);
  });

  test(`${label}: renders safe list when fallback is empty`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "",
      codes: {
        menu: { to: "https://example.com/menu.pdf", note: "Table tent" },
        old: { to: "https://example.com/old.pdf", retired: true, note: "Old" },
        evil: { to: "javascript:alert(1)", note: "Bad" },
      },
    });
    const res = runInline(src, { pageUrl: "https://shop.example/qr-codes", jsonText: payload });
    assert.deepEqual(res.replaced, []);
    const links = collectLinks(res.body);
    assert.equal(links.length, 1);
    assert.equal(links[0].getAttribute("href"), "https://example.com/menu.pdf");
    assert.equal(links[0].getAttribute("target"), "_blank");
    assert.equal(links[0].getAttribute("rel"), "noopener");
    assert.equal(links[0].textContent, "Table tent (menu)");
  });

  test(`${label}: refuses javascript:, data:, and protocol-relative URLs`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "//evil.example/phish",
      codes: {
        js: { to: "javascript:alert(1)" },
        data: { to: "data:text/html,<script>alert(1)</script>" },
        rel: { to: "//evil.example/x" },
      },
    });
    for (const code of ["js", "data", "rel"]) {
      const res = runInline(src, { pageUrl: `https://shop.example/qr-codes?c=${code}`, jsonText: payload });
      assert.deepEqual(res.replaced, []);
    }
  });

  test(`${label}: ignores prototype keys and invalid code ids`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "/",
      codes: { menu: { to: "https://example.com/menu.pdf" } },
    });
    for (const bad of ["constructor", "__proto__", "toString", "UPPER", "bad_id"]) {
      const res = runInline(src, { pageUrl: `https://shop.example/qr-codes?c=${bad}`, jsonText: payload });
      assert.deepEqual(res.replaced, ["https://shop.example/"]);
    }
  });

  test(`${label}: avoids redirect loop when fallback equals current page`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "/qr-codes",
      codes: { menu: { to: "https://example.com/menu.pdf", note: "Menu" } },
    });
    const res = runInline(src, { pageUrl: "https://shop.example/qr-codes", jsonText: payload });
    assert.deepEqual(res.replaced, []);
    assert.equal(collectLinks(res.body).length, 1);
  });

  test(`${label}: renders list in document.body when snippet is placed inside <head>`, () => {
    const payload = JSON.stringify({
      v: 1,
      param: "c",
      fallback: "",
      codes: { menu: { to: "https://example.com/menu.pdf", note: "Menu" } },
    });
    const res1 = runInline(src, { pageUrl: "https://shop.example/qr-codes", jsonText: payload, inHead: true });
    assert.equal(collectLinks(res1.head).length, 0);
    assert.equal(collectLinks(res1.body).length, 1);

    const res2 = runInline(src, {
      pageUrl: "https://shop.example/qr-codes",
      jsonText: payload,
      inHead: true,
      delayBody: true,
    });
    assert.equal(collectLinks(res2.head).length, 0);
    assert.equal(collectLinks(res2.body).length, 1);
  });
}

for (const [label, src] of [["fetch source", fetchSrc], ["fetch minified", fetchMin]]) {
  test(`${label}: fetches same-origin codes.json with redirect error and redirects`, async () => {
    const res = await runFetch(src, {
      pageUrl: "https://shop.example/qr-codes?c=menu",
      dataSrc: "/codes.json",
      fetchPayload: {
        v: 1,
        param: "c",
        fallback: "/",
        codes: { menu: { to: "https://example.com/menu.pdf" } },
      },
    });
    assert.equal(res.fetched.length, 1);
    assert.equal(res.fetched[0].url, "https://shop.example/codes.json");
    assert.equal(res.fetched[0].opts.credentials, "same-origin");
    assert.equal(res.fetched[0].opts.redirect, "error");
    assert.deepEqual(res.replaced, ["https://example.com/menu.pdf"]);
  });

  test(`${label}: refuses cross-origin data-src without calling fetch`, async () => {
    const res = await runFetch(src, {
      pageUrl: "https://shop.example/qr-codes?c=menu",
      dataSrc: "https://other.example/codes.json",
      fetchPayload: {
        v: 1,
        param: "c",
        fallback: "/",
        codes: { menu: { to: "https://example.com/menu.pdf" } },
      },
    });
    assert.equal(res.fetched.length, 0);
    assert.deepEqual(res.replaced, []);
  });

  test(`${label}: refuses redirected or cross-origin fetch response`, async () => {
    const payload = {
      v: 1,
      param: "c",
      fallback: "/",
      codes: { menu: { to: "https://example.com/menu.pdf" } },
    };
    const res1 = await runFetch(src, {
      pageUrl: "https://shop.example/qr-codes?c=menu",
      dataSrc: "/codes.json",
      fetchPayload: payload,
      fetchRedirected: true,
    });
    assert.deepEqual(res1.replaced, []);

    const res2 = await runFetch(src, {
      pageUrl: "https://shop.example/qr-codes?c=menu",
      dataSrc: "/codes.json",
      fetchPayload: payload,
      fetchResUrl: "https://evil.example/codes.json",
    });
    assert.deepEqual(res2.replaced, []);
  });

  test(`${label}: renders list in document.body when script is inside <head>`, async () => {
    const res = await runFetch(src, {
      pageUrl: "https://shop.example/qr-codes",
      dataSrc: "/codes.json",
      inHead: true,
      delayBody: true,
      fetchPayload: {
        v: 1,
        param: "c",
        fallback: "",
        codes: { menu: { to: "https://example.com/menu.pdf", note: "Menu" } },
      },
    });
    assert.equal(collectLinks(res.head).length, 0);
    assert.equal(collectLinks(res.body).length, 1);
  });
}
