(function () {
  var scriptEl = document.currentScript;
  var src = (scriptEl && scriptEl.getAttribute("data-src")) || "/codes.json";
  var srcUrl;
  try { srcUrl = new URL(src, location.href); } catch (e) { return; }
  if (srcUrl.origin !== location.origin) return;
  if (srcUrl.protocol !== "https:" && srcUrl.protocol !== "http:") return;
  var idRe = /^[a-z0-9-]{1,64}$/;
  var badRe = /[\x00-\x20\x7f"'<>\\]/;
  function safeHttp(u) {
    if (typeof u !== "string" || !u || badRe.test(u)) return "";
    try {
      var p = new URL(u);
      return p.protocol === "https:" || p.protocol === "http:" ? p.href : "";
    } catch (e) { return ""; }
  }
  function safeFallback(u) {
    if (typeof u !== "string" || !u) return "";
    if (u.charAt(0) === "/" && u.charAt(1) !== "/" && u.charAt(1) !== "\\" && !badRe.test(u)) {
      try {
        var r = new URL(u, location.origin);
        return r.origin === location.origin ? r.href : "";
      } catch (e) { return ""; }
    }
    return safeHttp(u);
  }
  function samePage(href) {
    try {
      var a = new URL(href, location.href), b = new URL(location.href);
      return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
    } catch (e) { return false; }
  }
  function showList(data) {
    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "QR code links");
    var ul = document.createElement("ul");
    var keys = Object.keys(data.codes);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], entry = data.codes[k];
      if (!idRe.test(k) || !entry || typeof entry !== "object" || entry.retired) continue;
      var href = safeHttp(entry.to);
      if (!href) continue;
      var li = document.createElement("li"), a = document.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.textContent = typeof entry.note === "string" && entry.note ? entry.note + " (" + k + ")" : k;
      li.appendChild(a);
      ul.appendChild(li);
    }
    if (ul.childNodes.length) {
      nav.appendChild(ul);
      var parent = scriptEl && scriptEl.parentNode;
      if (parent && parent.tagName !== "HEAD") parent.insertBefore(nav, scriptEl.nextSibling);
      else if (document.body) document.body.appendChild(nav);
      else if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () {
          if (document.body) document.body.appendChild(nav);
        });
      }
    }
  }
  fetch(srcUrl.href, { credentials: "same-origin", redirect: "error" })
    .then(function (res) {
      if (!res || !res.ok || res.redirected) return null;
      if (res.url) {
        try {
          if (new URL(res.url).origin !== location.origin) return null;
        } catch (e) { return null; }
      }
      return res.json();
    })
    .then(function (data) {
      if (!data || data.v !== 1 || !data.codes || typeof data.codes !== "object") return;
      var param = typeof data.param === "string" && data.param ? data.param : "c";
      var raw = new URLSearchParams(location.search).get(param);
      if (raw && idRe.test(raw) && Object.prototype.hasOwnProperty.call(data.codes, raw)) {
        var item = data.codes[raw];
        var target = item && typeof item === "object" ? safeHttp(item.to) : "";
        if (target) { location.replace(target); return; }
      }
      var fb = safeFallback(data.fallback);
      if (fb && !samePage(fb)) { location.replace(fb); return; }
      showList(data);
    })
    .catch(function () {});
})();
