/**
 * Gerçek vakalar üzerinde doğruluk ölçümü: `npm run evaluate`
 * tests/cases altındaki her vaka için bölgenin ve arızanın doğru bulunup bulunmadığını yazar.
 * Uygulamada gösterilecek doğruluk oranı bu ölçümden gelir; uydurma oran kullanılmaz.
 */
import { diagnose } from "../js/engine/diagnose.js";
import { loadCases } from "../tests/cases.js";

const cases = loadCases();
let group = 0, top1 = 0, top3 = 0, labelled = 0;
for (const c of cases) {
  const res = diagnose({ features: c.features, conditions: c.conditions, vehicle: c.vehicle, answers: c.answers });
  const ids = res.ranked.map(r => r.fault.id);
  const g = res.groups[0].id === c.expect.group;
  group += g;
  let line = `${c.id}: bölge ${g ? "doğru" : "YANLIŞ"} (${res.groups[0].id})`;
  if (c.expect.fault) {
    labelled++;
    const rank = ids.indexOf(c.expect.fault) + 1;
    top1 += rank === 1; top3 += rank > 0 && rank <= 3;
    line += ` · arıza sırası ${rank}`;
  }
  console.log(line + ` · ilk 3: ${ids.slice(0, 3).join(", ")}`);
}
console.log(`\n${cases.length} vaka · bölge doğru: ${group}/${cases.length}` +
  (labelled ? ` · kesin arızası bilinen ${labelled} vakada ilk sıra: ${top1}, ilk 3: ${top3}` : " · kesin arızası bilinen vaka yok"));

// --- Referans sesler: sosyal medyadan derlenen, etiketi doğrulanmamış örnekler. Doğruluk oranına katılmaz.
import { readdirSync, readFileSync } from "node:fs";
import { FAULT_BY_ID } from "../js/data/faults.js";
const refDir = new URL("../tests/reference/", import.meta.url);
for (const file of readdirSync(refDir).filter(f => f.endsWith(".json"))) {
  const ref = JSON.parse(readFileSync(new URL(file, refDir), "utf8"));
  console.log(`\nReferans (doğrulanmamış): ${ref.id}`);
  let g = 0, t3 = 0;
  for (const seg of ref.segments) {
    const res = diagnose({ features: seg.features });
    const rank = res.ranked.findIndex(r => r.fault.id === seg.fault) + 1;
    const okGroup = res.groups[0].id === FAULT_BY_ID[seg.fault].group;
    g += okGroup; t3 += rank <= 3;
    console.log(`  ${seg.fault}: bölge ${okGroup ? "doğru" : "yanlış"} · sıra ${rank}`);
  }
  console.log(`  yalnızca sesle (belirti ve soru olmadan): bölge ${g}/${ref.segments.length}, ilk 3: ${t3}/${ref.segments.length}`);
}
