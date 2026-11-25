export const CODE_ID_RE = /^[a-z0-9-]{1,64}$/;
export const PARAM_RE = /^[a-zA-Z0-9_]{1,32}$/;
export const MAX_URL_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 200;

export function safeTerm(value) {
  return JSON.stringify(String(value)).replace(
    /[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

const RESERVED_IDS = new Set([
  "constructor",
  "prototype",
  "__proto__",
  "tostring",
  "valueof",
  "hasownproperty",
]);

const BAD_CHARS =
  /[\u0000-\u001f\u007f-\u00a0\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff\\ "'<>]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

function checkHost(host) {
  if (!host) return "The address has no host.";
  if (!/^[A-Za-z0-9.-]+$/.test(host)) {
    return "The host must use plain ASCII letters, digits, dots, and hyphens (use punycode xn-- for international domains).";
  }
  const clean = host.endsWith(".") ? host.slice(0, -1) : host;
  const labels = clean.split(".");
  if (labels.some((l) => l === "")) return "The host has an empty part.";
  if (labels.some((l) => l.length > 63)) return "A host label exceeds 63 characters.";
  return null;
}

export function checkCodeId(input) {
  if (typeof input !== "string" || !CODE_ID_RE.test(input)) {
    return {
      ok: false,
      reason: "Code ID must be 1 to 64 characters using only lowercase letters, digits, and hyphens.",
    };
  }
  if (RESERVED_IDS.has(input)) {
    return { ok: false, reason: `Code ID ${safeTerm(input)} is reserved.` };
  }
  return { ok: true, id: input };
}

export function slugifyCodeId(raw) {
  return String(raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

export function checkUrl(input) {
  if (typeof input !== "string" || !input) {
    return { ok: false, reason: "Destination URL is required." };
  }
  if (input.length > MAX_URL_LENGTH) {
    return { ok: false, reason: `Destination URL exceeds ${MAX_URL_LENGTH} characters.` };
  }
  if (BAD_CHARS.test(input)) {
    return {
      ok: false,
      reason: "Destination URL cannot contain spaces, quotes, backslashes, angle brackets, or control characters.",
    };
  }
  const m = /^https?:\/\/([^/?#]*)([\s\S]*)$/i.exec(input);
  if (!m) {
    return { ok: false, reason: "Destination URL must start with https:// or http://." };
  }
  const authority = m[1];
  if (authority.includes("@")) {
    return { ok: false, reason: "Destination URL cannot include a username before @." };
  }
  if (authority.startsWith("[")) {
    return { ok: false, reason: "IPv6 literal hosts are not accepted." };
  }
  const colon = authority.indexOf(":");
  const host = colon === -1 ? authority : authority.slice(0, colon);
  if (colon !== -1) {
    const port = authority.slice(colon + 1);
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
      return { ok: false, reason: "Port must be between 1 and 65535." };
    }
  }
  const hostErr = checkHost(host);
  if (hostErr) return { ok: false, reason: hostErr };
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, reason: "Only https:// and http:// destinations are allowed." };
    }
    const parsedHostErr = checkHost(parsed.hostname);
    if (parsedHostErr) return { ok: false, reason: parsedHostErr };
  } catch {
    return { ok: false, reason: "Destination URL is not a valid web address." };
  }
  return { ok: true, url: input };
}

export function checkFallback(input) {
  if (input === "" || input === undefined) return { ok: true, fallback: "" };
  if (typeof input !== "string") {
    return { ok: false, reason: "Fallback must be a string." };
  }
  if (input.startsWith("/")) {
    if (input.startsWith("//") || input.startsWith("/\\") || BAD_CHARS.test(input)) {
      return { ok: false, reason: "Relative fallback path must start with a single / and contain no spaces or unsafe characters." };
    }
    if (input.length > MAX_URL_LENGTH) {
      return { ok: false, reason: `Fallback exceeds ${MAX_URL_LENGTH} characters.` };
    }
    return { ok: true, fallback: input };
  }
  const urlCheck = checkUrl(input);
  if (!urlCheck.ok) {
    return { ok: false, reason: `Fallback must be empty, a path starting with /, or an http(s) URL. ${urlCheck.reason}` };
  }
  return { ok: true, fallback: urlCheck.url };
}

export function checkParam(input) {
  if (typeof input !== "string" || !PARAM_RE.test(input)) {
    return { ok: false, reason: "Query parameter name must be 1 to 32 letters, digits, or underscores." };
  }
  return { ok: true, param: input };
}

export function checkRoutePath(input) {
  if (typeof input !== "string" || !input.startsWith("/")) {
    return { ok: false, reason: "Route path must start with / (for example /qr-codes)." };
  }
  if (/[?#]/.test(input) || BAD_CHARS.test(input)) {
    return { ok: false, reason: "Route path cannot contain spaces, query strings, fragments, or unsafe characters." };
  }
  if (input.includes("//")) {
    return { ok: false, reason: "Route path cannot contain consecutive slashes." };
  }
  const normalized = input.length > 1 && input.endsWith("/") ? input.slice(0, -1) : input;
  if (normalized === "/") {
    return { ok: false, reason: "Route path needs a page path such as /qr-codes, not the site root /." };
  }
  if (!/^[A-Za-z0-9._~/-]+$/.test(normalized)) {
    return { ok: false, reason: "Route path may contain only letters, digits, and . _ ~ - /." };
  }
  if (normalized.split("/").some((s) => s === "." || s === "..")) {
    return { ok: false, reason: "Route path cannot contain . or .. segments." };
  }
  return { ok: true, path: normalized };
}

export function checkDomain(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { ok: false, reason: "Domain is required." };
  }
  const stripped = input.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  const hostErr = checkHost(stripped);
  if (hostErr) return { ok: false, reason: hostErr };
  return { ok: true, domain: stripped.toLowerCase() };
}

export function checkNote(input) {
  if (input === undefined || input === "") return { ok: true, note: "" };
  if (typeof input !== "string") return { ok: false, reason: "Note must be text." };
  if (input.length > MAX_NOTE_LENGTH) {
    return { ok: false, reason: `Note exceeds ${MAX_NOTE_LENGTH} characters.` };
  }
  if (/[\u0000-\u001f\u007f]/.test(input)) {
    return { ok: false, reason: "Note cannot contain control characters or line breaks." };
  }
  return { ok: true, note: input };
}

export function validateStore(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["File must contain a JSON object."] };
  }
  if (data.v !== 1) {
    errors.push("Field 'v' must be 1.");
  }
  const paramRes = checkParam(data.param === undefined ? "c" : data.param);
  if (!paramRes.ok) errors.push(`param: ${paramRes.reason}`);
  const fbRes = checkFallback(data.fallback === undefined ? "/" : data.fallback);
  if (!fbRes.ok) errors.push(`fallback: ${fbRes.reason}`);
  if (!data.codes || typeof data.codes !== "object" || Array.isArray(data.codes)) {
    errors.push("Field 'codes' must be an object mapping code IDs to entries.");
    return { ok: false, errors };
  }
  const cleanCodes = {};
  for (const [id, entry] of Object.entries(data.codes)) {
    const label = safeTerm(id);
    const idRes = checkCodeId(id);
    if (!idRes.ok) {
      errors.push(`code ${label}: ${idRes.reason}`);
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`code ${label}: entry must be an object.`);
      continue;
    }
    const retired = entry.retired === true;
    if (entry.retired !== undefined && typeof entry.retired !== "boolean") {
      errors.push(`code ${label}: 'retired' must be true or false.`);
    }
    const hasTo = entry.to !== undefined && entry.to !== "";
    if (!retired && !hasTo) {
      errors.push(`code ${label}: active code requires a destination URL in 'to'.`);
    } else if (hasTo) {
      const urlRes = checkUrl(entry.to);
      if (!urlRes.ok) errors.push(`code ${label}: ${urlRes.reason}`);
    }
    const noteRes = checkNote(entry.note);
    if (!noteRes.ok) errors.push(`code ${label}: ${noteRes.reason}`);

    const cleanEntry = {};
    if (hasTo && typeof entry.to === "string") cleanEntry.to = entry.to;
    if (noteRes.ok && noteRes.note) cleanEntry.note = noteRes.note;
    if (retired) cleanEntry.retired = true;
    cleanCodes[id] = cleanEntry;
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      v: 1,
      param: paramRes.param,
      fallback: fbRes.fallback,
      codes: cleanCodes,
    },
  };
}
