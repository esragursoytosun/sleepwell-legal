import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const DIR = fileURLToPath(new URL("./cases/", import.meta.url));

/** tests/cases altındaki gerçek vakalar (yalnızca ölçülen ses özellikleri; ses/görüntü saklanmaz). */
export function loadCases() {
  return readdirSync(DIR).filter(f => f.endsWith(".json")).sort()
    .map(f => JSON.parse(readFileSync(join(DIR, f), "utf8")));
}
