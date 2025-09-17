// FILE: scripts/check-deps.mjs
// Fails early in CI with a clear message if a dep is missing.
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const need = ["vue", "jspdf", "jspdf-autotable", "xlsx"];
let ok = true;
for (const name of need) {
  try { req.resolve(name); }
  catch { ok = false; console.error(`[deps] Missing dependency: "${name}". Add it to package.json -> dependencies.`); }
}
if (!ok) process.exit(1);
