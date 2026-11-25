(function () {
  var el = document.getElementById("bandit-codes");
  if (!el) return;
  var data;
  try { data = JSON.parse(el.textContent || ""); } catch (e) { return; }
  if (!data || data.v !== 1 || !data.codes || typeof data.codes !== "object") return;
  var param = typeof data.param === "string" && data.param ? data.param : "c";
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
  function showList() {
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
      var parent = el.parentNode;
      if (parent && parent.tagName !== "HEAD") parent.insertBefore(nav, el.nextSibling);
      else if (document.body) document.body.appendChild(nav);
      else if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () {
          if (document.body) document.body.appendChild(nav);
        });
      }
    }
  }
  var raw = new URLSearchParams(location.search).get(param);
  if (raw && idRe.test(raw) && Object.prototype.hasOwnProperty.call(data.codes, raw)) {
    var item = data.codes[raw];
    var target = item && typeof item === "object" ? safeHttp(item.to) : "";
    if (target) { location.replace(target); return; }
  }
  var fb = safeFallback(data.fallback);
  if (fb && !samePage(fb)) { location.replace(fb); return; }
  showList();
})();
