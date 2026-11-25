import fs from "node:fs";
import path from "node:path";
import { writeBuildOutputs } from "./build.mjs";
import { detectAndImport } from "./importer.mjs";
import {
  checkCodeId,
  checkDomain,
  checkFallback,
  checkNote,
  checkParam,
  checkRoutePath,
  checkUrl,
  validateStore,
} from "./validate.mjs";

const DEFAULT_FILE = "bandit-codes.json";

const HELP_TEXT = `bandit-codes - manage self-owned QR code redirects offline

Usage:
  bandit-codes init [--file bandit-codes.json] [--param c] [--fallback /] [--force]
  bandit-codes add <id> <url> [--note "Table tent"] [--file bandit-codes.json]
  bandit-codes set <id> <url> [--note "Updated"] [--file bandit-codes.json]
  bandit-codes retire <id> [--to <replacement-url>] [--note "Ended"] [--file bandit-codes.json]
  bandit-codes list [--active | --retired] [--urls] [--path /qr-codes] [--domain example.com] [--json] [--file bandit-codes.json]
  bandit-codes check [--file bandit-codes.json]
  bandit-codes build [--out dist] [--path /qr-codes] [--domain example.com] [--file bandit-codes.json]
  bandit-codes import <source-file> [--format snippet|csv|json] [--slugify] [--overwrite] [--dry-run] [--file bandit-codes.json]
`;

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      if (eq !== -1) {
        flags[tok.slice(2, eq)] = tok.slice(eq + 1);
      } else {
        const key = tok.slice(2);
        const next = argv[i + 1];
        if (
          key === "force" ||
          key === "json" ||
          key === "urls" ||
          key === "active" ||
          key === "retired" ||
          key === "slugify" ||
          key === "overwrite" ||
          key === "dry-run" ||
          key === "help" ||
          next === undefined ||
          next.startsWith("--")
        ) {
          flags[key] = true;
        } else {
          flags[key] = next;
          i++;
        }
      }
    } else if (tok === "-h") {
      flags.help = true;
    } else {
      positionals.push(tok);
    }
  }
  return { positionals, flags };
}

function resolveFile(flags, cwd) {
  const rel = typeof flags.file === "string" ? flags.file : DEFAULT_FILE;
  return path.resolve(cwd, rel);
}

function loadStore(filePath, fsImpl) {
  if (!fsImpl.existsSync(filePath)) {
    throw new Error(`Codes file not found: ${filePath}. Run "bandit-codes init" first.`);
  }
  const raw = fsImpl.readFileSync(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not parse JSON in ${filePath}: ${err.message}`);
  }
  const checked = validateStore(parsed);
  if (!checked.ok) {
    throw new Error(`Invalid codes file:\n${checked.errors.join("\n")}`);
  }
  return checked.data;
}

function saveStore(filePath, store, fsImpl) {
  fsImpl.mkdirSync(path.dirname(filePath), { recursive: true });
  fsImpl.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function runCli(argv, io = {}) {
  const cwd = io.cwd || process.cwd();
  const fsImpl = io.fs || fs;
  const out = io.stdout || ((s) => process.stdout.write(`${s}\n`));
  const err = io.stderr || ((s) => process.stderr.write(`${s}\n`));

  const { positionals, flags } = parseArgs(argv);
  const cmd = positionals[0];

  if (!cmd || flags.help || cmd === "help") {
    out(HELP_TEXT.trimEnd());
    return 0;
  }

  const filePath = resolveFile(flags, cwd);

  try {
    if (cmd === "init") {
      if (fsImpl.existsSync(filePath) && !flags.force) {
        err(`File already exists: ${filePath}. Pass --force to overwrite.`);
        return 1;
      }
      const paramRes = checkParam(typeof flags.param === "string" ? flags.param : "c");
      if (!paramRes.ok) {
        err(paramRes.reason);
        return 1;
      }
      const fbRes = checkFallback(typeof flags.fallback === "string" ? flags.fallback : "/");
      if (!fbRes.ok) {
        err(fbRes.reason);
        return 1;
      }
      const store = { v: 1, param: paramRes.param, fallback: fbRes.fallback, codes: {} };
      saveStore(filePath, store, fsImpl);
      out(`Created ${filePath}`);
      return 0;
    }

    if (cmd === "add") {
      const id = positionals[1];
      const url = positionals[2];
      if (!id || !url) {
        err("Usage: bandit-codes add <id> <url> [--note <text>]");
        return 1;
      }
      const idRes = checkCodeId(id);
      if (!idRes.ok) { err(idRes.reason); return 1; }
      const urlRes = checkUrl(url);
      if (!urlRes.ok) { err(urlRes.reason); return 1; }
      const noteRes = checkNote(typeof flags.note === "string" ? flags.note : "");
      if (!noteRes.ok) { err(noteRes.reason); return 1; }

      const store = loadStore(filePath, fsImpl);
      if (Object.prototype.hasOwnProperty.call(store.codes, idRes.id)) {
        err(`Code "${idRes.id}" already exists. Use "bandit-codes set ${idRes.id} <url>" to update it.`);
        return 1;
      }
      const entry = { to: urlRes.url };
      if (noteRes.note) entry.note = noteRes.note;
      store.codes[idRes.id] = entry;
      saveStore(filePath, store, fsImpl);
      out(`Added ${idRes.id} -> ${urlRes.url}`);
      return 0;
    }

    if (cmd === "set") {
      const id = positionals[1];
      const url = positionals[2];
      if (!id || !url) {
        err("Usage: bandit-codes set <id> <url> [--note <text>]");
        return 1;
      }
      const idRes = checkCodeId(id);
      if (!idRes.ok) { err(idRes.reason); return 1; }
      const urlRes = checkUrl(url);
      if (!urlRes.ok) { err(urlRes.reason); return 1; }

      const store = loadStore(filePath, fsImpl);
      if (!Object.prototype.hasOwnProperty.call(store.codes, idRes.id)) {
        err(`Code "${idRes.id}" does not exist. Use "bandit-codes add ${idRes.id} <url>" to create it.`);
        return 1;
      }
      const prev = store.codes[idRes.id];
      const noteVal = typeof flags.note === "string" ? flags.note : prev.note || "";
      const noteRes = checkNote(noteVal);
      if (!noteRes.ok) { err(noteRes.reason); return 1; }

      const next = { to: urlRes.url };
      if (noteRes.note) next.note = noteRes.note;
      store.codes[idRes.id] = next;
      saveStore(filePath, store, fsImpl);
      out(`Updated ${idRes.id} -> ${urlRes.url}`);
      return 0;
    }

    if (cmd === "retire") {
      const id = positionals[1];
      if (!id) {
        err("Usage: bandit-codes retire <id> [--to <replacement-url>] [--note <text>]");
        return 1;
      }
      const idRes = checkCodeId(id);
      if (!idRes.ok) { err(idRes.reason); return 1; }

      const store = loadStore(filePath, fsImpl);
      if (!Object.prototype.hasOwnProperty.call(store.codes, idRes.id)) {
        err(`Code "${idRes.id}" does not exist.`);
        return 1;
      }
      const prev = store.codes[idRes.id];
      const next = { retired: true };
      if (typeof flags.to === "string" && flags.to) {
        const urlRes = checkUrl(flags.to);
        if (!urlRes.ok) { err(urlRes.reason); return 1; }
        next.to = urlRes.url;
      }
      const noteVal = typeof flags.note === "string" ? flags.note : prev.note || "";
      const noteRes = checkNote(noteVal);
      if (!noteRes.ok) { err(noteRes.reason); return 1; }
      if (noteRes.note) next.note = noteRes.note;

      store.codes[idRes.id] = next;
      saveStore(filePath, store, fsImpl);
      out(next.to ? `Retired ${idRes.id} (forwarding to ${next.to})` : `Retired ${idRes.id} (now uses fallback)`);
      return 0;
    }

    if (cmd === "list") {
      const store = loadStore(filePath, fsImpl);
      const entries = Object.entries(store.codes).filter(([, e]) => {
        if (flags.active && e.retired) return false;
        if (flags.retired && !e.retired) return false;
        return true;
      });
      let qrBase = "";
      if (flags.urls) {
        const pathCheck = checkRoutePath(typeof flags.path === "string" ? flags.path : "/qr-codes");
        if (!pathCheck.ok) { err(pathCheck.reason); return 1; }
        const domainCheck = checkDomain(typeof flags.domain === "string" ? flags.domain : "example.com");
        if (!domainCheck.ok) { err(domainCheck.reason); return 1; }
        qrBase = `https://${domainCheck.domain}${pathCheck.path}?${store.param}=`;
      }
      if (flags.json) {
        if (flags.urls) {
          const withUrls = Object.fromEntries(
            entries.map(([id, e]) => [id, { ...e, qrUrl: `${qrBase}${id}` }]),
          );
          out(JSON.stringify(withUrls, null, 2));
        } else {
          out(JSON.stringify(Object.fromEntries(entries), null, 2));
        }
        return 0;
      }
      if (entries.length === 0) {
        out("No codes found.");
        return 0;
      }
      for (const [id, e] of entries) {
        const status = e.retired ? "retired" : "active";
        const dest = e.to || "(fallback)";
        const note = e.note ? `  # ${e.note}` : "";
        if (flags.urls) {
          out(`${qrBase}${id}\t[${status}]\t${dest}${note}`);
        } else {
          out(`${id}\t[${status}]\t${dest}${note}`);
        }
      }
      return 0;
    }

    if (cmd === "check") {
      if (!fsImpl.existsSync(filePath)) {
        err(`Codes file not found: ${filePath}`);
        return 1;
      }
      let parsed;
      try {
        parsed = JSON.parse(fsImpl.readFileSync(filePath, "utf8"));
      } catch (e) {
        err(`Invalid JSON: ${e.message}`);
        return 1;
      }
      const res = validateStore(parsed);
      if (!res.ok) {
        for (const msg of res.errors) err(`ERROR: ${msg}`);
        return 1;
      }
      const total = Object.keys(res.data.codes).length;
      const active = Object.values(res.data.codes).filter((e) => !e.retired).length;
      const retired = total - active;
      out(`OK: ${total} codes checked (${active} active, ${retired} retired).`);
      return 0;
    }

    if (cmd === "build") {
      const store = loadStore(filePath, fsImpl);
      const outDir = path.resolve(cwd, typeof flags.out === "string" ? flags.out : "dist");
      const routePath = typeof flags.path === "string" ? flags.path : "/qr-codes";
      const domain = typeof flags.domain === "string" ? flags.domain : "example.com";
      const result = writeBuildOutputs(store, { outDir, routePath, domain, fsImpl });
      for (const note of result.notes) out(`Note: ${note}`);
      out(`Built ${result.written.length} files in ${outDir}: ${result.written.join(", ")}`);
      return 0;
    }

    if (cmd === "import") {
      const srcArg = positionals[1];
      if (!srcArg) {
        err("Usage: bandit-codes import <source-file> [--format snippet|csv|json] [--slugify] [--overwrite] [--dry-run]");
        return 1;
      }
      const srcPath = path.resolve(cwd, srcArg);
      if (!fsImpl.existsSync(srcPath)) {
        err(`Source file not found: ${srcPath}`);
        return 1;
      }
      const content = fsImpl.readFileSync(srcPath, "utf8");
      const existing = fsImpl.existsSync(filePath)
        ? loadStore(filePath, fsImpl)
        : { v: 1, param: "c", fallback: "/", codes: {} };

      const imported = detectAndImport(content, srcPath, {
        format: typeof flags.format === "string" ? flags.format : "",
        slugify: Boolean(flags.slugify),
        param: existing.param,
      });
      if (!imported.ok) {
        for (const msg of imported.errors) err(`ERROR: ${msg}`);
        return 1;
      }

      let added = 0;
      let updated = 0;
      let skipped = 0;
      for (const [id, entry] of Object.entries(imported.store.codes)) {
        const exists = Object.prototype.hasOwnProperty.call(existing.codes, id);
        if (exists && !flags.overwrite) {
          skipped++;
          continue;
        }
        existing.codes[id] = entry;
        if (exists) updated++;
        else added++;
      }

      if (!flags["dry-run"]) {
        saveStore(filePath, existing, fsImpl);
      }
      const prefix = flags["dry-run"] ? "[dry-run] " : "";
      out(`${prefix}Imported ${added} added, ${updated} updated, ${skipped} skipped.`);
      return 0;
    }

    err(`Unknown command: ${cmd}. Run "bandit-codes --help" for usage.`);
    return 1;
  } catch (e) {
    err(e.message || String(e));
    return 1;
  }
}
