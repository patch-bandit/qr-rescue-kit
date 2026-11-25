import { parseCsv } from "./csv.mjs";
import { checkCodeId, checkNote, checkUrl, safeTerm, slugifyCodeId, validateStore } from "./validate.mjs";

const ID_HEADERS = ["id", "code", "code_id", "slug", "short_code", "shortcode", "name", "key"];
const URL_HEADERS = ["to", "url", "destination", "target", "target_url", "redirect_url", "link"];
const NOTE_HEADERS = ["note", "notes", "label", "title", "description"];

export function extractFromSnippet(html) {
  const m = /<script\b[^>]*\bid=["']bandit-codes["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) {
    return { ok: false, errors: ['No <script type="application/json" id="bandit-codes"> block found.'] };
  }
  let parsed;
  try {
    parsed = JSON.parse(m[1].trim());
  } catch (err) {
    return { ok: false, errors: [`Invalid JSON inside snippet: ${err.message}`] };
  }
  const checked = validateStore(parsed);
  if (!checked.ok) return checked;
  return { ok: true, store: checked.data };
}

export function extractFromJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { ok: false, errors: [`Invalid JSON: ${err.message}`] };
  }
  const checked = validateStore(parsed);
  if (!checked.ok) return checked;
  return { ok: true, store: checked.data };
}

function idFromSourceCell(raw, param) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s, "https://placeholder.invalid");
    const q = u.searchParams.get(param);
    if (q) return q;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  } catch {
    return "";
  }
}

export function extractFromCsv(csvText, { slugify = false, param = "c" } = {}) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, errors: ["CSV needs a header row and at least one code row."] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const findCol = (names) => {
    for (const n of names) {
      const idx = header.indexOf(n);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const iId = findCol(ID_HEADERS);
  const iSource = header.indexOf("source");
  const iUrl = findCol(URL_HEADERS);
  const iNote = findCol(NOTE_HEADERS);

  if (iId === -1 && iSource === -1) {
    return {
      ok: false,
      errors: [`CSV header needs an ID column (such as ${ID_HEADERS.slice(0, 4).join(", ")}) or a "source" column.`],
    };
  }
  if (iUrl === -1) {
    return {
      ok: false,
      errors: [`CSV header needs a destination URL column (such as ${URL_HEADERS.slice(0, 4).join(", ")}).`],
    };
  }

  const codes = {};
  const errors = [];
  for (let r = 1; r < rows.length; r++) {
    const line = r + 1;
    const row = rows[r];
    let rawId = iId !== -1 ? (row[iId] || "").trim() : idFromSourceCell(row[iSource], param);
    if (slugify) rawId = slugifyCodeId(rawId);
    const rawUrl = (row[iUrl] || "").trim();
    const rawNote = iNote !== -1 ? (row[iNote] || "").trim() : "";

    const idRes = checkCodeId(rawId);
    if (!idRes.ok) {
      errors.push(`Row ${line}: ${idRes.reason} (got ${safeTerm(rawId)})`);
      continue;
    }
    const urlRes = checkUrl(rawUrl);
    if (!urlRes.ok) {
      errors.push(`Row ${line} (${idRes.id}): ${urlRes.reason}`);
      continue;
    }
    const noteRes = checkNote(rawNote);
    if (!noteRes.ok) {
      errors.push(`Row ${line} (${idRes.id}): ${noteRes.reason}`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(codes, idRes.id)) {
      errors.push(`Row ${line}: duplicate code ID "${idRes.id}" in CSV.`);
      continue;
    }
    const entry = { to: urlRes.url };
    if (noteRes.note) entry.note = noteRes.note;
    codes[idRes.id] = entry;
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    store: { v: 1, param, fallback: "/", codes },
  };
}

export function detectAndImport(content, filename = "", opts = {}) {
  const format = opts.format || "";
  const lower = filename.toLowerCase();
  if (format === "snippet" || (!format && (lower.endsWith(".html") || lower.endsWith(".htm") || /id=["']bandit-codes["']/i.test(content)))) {
    return extractFromSnippet(content);
  }
  if (format === "json" || (!format && lower.endsWith(".json"))) {
    return extractFromJson(content);
  }
  if (format === "csv" || (!format && lower.endsWith(".csv"))) {
    return extractFromCsv(content, opts);
  }
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return extractFromJson(content);
  if (trimmed.startsWith("<")) return extractFromSnippet(content);
  return extractFromCsv(content, opts);
}
