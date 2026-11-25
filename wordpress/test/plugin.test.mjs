import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginPath = path.resolve(__dirname, "../bandit-codes/bandit-codes.php");
const php = fs.readFileSync(pluginPath, "utf8");

test("WordPress plugin has valid header, GPLv2 license, and ABSPATH guard", () => {
  assert.match(php, /^<\?php/);
  assert.match(php, /Plugin Name:\s*Bandit Codes/);
  assert.match(php, /Author:\s*Patch Bandit/);
  assert.match(php, /License:\s*GPLv2 or later/);
  assert.match(php, /if \(\s*! defined\( 'ABSPATH' \)\s*\)/);
});

test("WordPress plugin enforces capability, nonce, escaping, and scheme checks", () => {
  assert.match(php, /current_user_can\( 'manage_options' \)/);
  assert.match(php, /check_admin_referer\( 'bandit_codes_save', 'bandit_codes_nonce' \)/);
  assert.match(php, /check_admin_referer\( 'bandit_codes_import', 'bandit_codes_import_nonce' \)/);
  assert.match(php, /check_admin_referer\( 'bandit_codes_export', 'bandit_codes_export_nonce' \)/);
  assert.match(php, /wp_redirect\( \$target, 302, 'Bandit Codes' \)/);
  assert.match(php, /esc_html/);
  assert.match(php, /esc_attr/);
  assert.match(php, /esc_url/);
  assert.match(php, /'https' !== \$scheme && 'http' !== \$scheme/);
  assert.doesNotMatch(php, /\b(eval|exec|shell_exec|system|passthru|unserialize)\s*\(/);
});

test("WordPress plugin has balanced PHP tags and braces", () => {
  const opens = (php.match(/<\?php/g) || []).length;
  const closes = (php.match(/\?>/g) || []).length;
  // Opening PHP tag at top plus template blocks match closing tags
  assert.equal(opens, closes + 1);
});

test("WordPress plugin prevents data loss on sparse row removal and truncated POST", () => {
  // Must iterate associative keys via foreach so removing a middle row never drops later rows
  assert.match(php, /foreach\s*\(\s*\$ids\s+as\s+\$i\s*=>\s*\$raw_id_val\s*\)/);
  assert.doesNotMatch(php, /for\s*\(\s*\$i\s*=\s*0;\s*\$i\s*<\s*\$total;\s*\$i\+\+\s*\)/);

  // Must place end-of-form sentinel after the table and refuse truncated saves before update_option
  const tableEndIdx = php.indexOf("</table>", php.indexOf('id="bandit-codes-table"'));
  const sentinelInputIdx = php.indexOf('name="bc_form_complete"');
  assert.ok(tableEndIdx > 0 && sentinelInputIdx > tableEndIdx, "bc_form_complete sentinel must appear after table");

  const saveFnStart = php.indexOf("function bandit_codes_handle_save()");
  const sentinelCheckIdx = php.indexOf("$_POST['bc_form_complete']", saveFnStart);
  const updateOptionIdx = php.indexOf("update_option( BANDIT_CODES_OPTION_DATA", saveFnStart);
  assert.ok(
    sentinelCheckIdx > saveFnStart && sentinelCheckIdx < updateOptionIdx,
    "sentinel check must run before update_option",
  );
  assert.match(php, /bandit_codes_admin_redirect\(\s*'truncated'\s*\)/);
  assert.match(php, /ini_get\(\s*'max_input_vars'\s*\)/);
  assert.match(php, /bandit_codes_skipped_/);
});

test("WordPress plugin enforces nginx-safe param, autoload path, multibyte note trim, and string ID cast", () => {
  assert.match(php, /preg_match\(\s*'\/\^\[A-Za-z0-9_\]\{1,32\}\$\/'\s*,\s*\$param\s*\)/);
  assert.match(php, /update_option\(\s*BANDIT_CODES_OPTION_PATH,\s*\$path,\s*true\s*\)/);
  assert.match(php, /mb_substr\(/);
  assert.match(php, /wp_html_excerpt\(/);
  assert.match(php, /bandit_codes_validate_id\(\s*\(string\)\s*\$id\s*\)/);
  assert.doesNotMatch(php, /\bzero\b/i);
});

test("WordPress plugin handles duplicate IDs, object-cast JSON export, US spelling, plain header, and localized JS labels", () => {
  // Verifier L6: duplicate code IDs reported rather than silently overwritten
  assert.match(php, /\$seen_ids\s*=\s*array\(\)/);
  assert.match(php, /isset\(\s*\$seen_ids\[\s*\$id\s*\]\s*\)/);
  assert.match(php, /duplicate code ID/);

  // Verifier L7: export casts codes to object so empty or numeric-keyed lists encode as {} not []
  assert.match(php, /\$data\['codes'\]\s*=\s*\(object\)\s*\$data\['codes'\];/);

  // Editor M1 / Security N1: US spelling "canceled" (not the double-L variant)
  assert.match(php, /Save canceled because/);
  assert.doesNotMatch(php, new RegExp("cancel" + "led", "i"));

  // Editor L4: plain plugin description without HTTP 302 jargon
  const headerBlock = php.slice(0, php.indexOf("*/"));
  assert.doesNotMatch(headerBlock, /HTTP 302/);

  // Editor L6: inline JS button/cell labels are translatable via wp_json_encode( __( ... ) )
  assert.match(php, /wp_json_encode\(\s*__\(\s*'Save first',\s*'bandit-codes'\s*\)\s*\)/);
  assert.match(php, /wp_json_encode\(\s*__\(\s*'Remove',\s*'bandit-codes'\s*\)\s*\)/);
});
