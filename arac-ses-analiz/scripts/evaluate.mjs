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
// İki ölçüm: yalnızca sesle, ve kullanıcının o arıza için tipik olarak seçeceği belirtilerle birlikte.
import { readdirSync, readFileSync } from "node:fs";
import { FAULT_BY_ID } from "../js/data/faults.js";
const refDir = new URL("../tests/reference/", import.meta.url);
const typicalConditions = f => Object.entries(f.c).filter(([, w]) => w >= 2).map(([k]) => k);
const tally = { n: 0, group: 0, labelled: 0, top1: 0, top3: 0, groupC: 0, top1C: 0, top3C: 0 };
const byFault = {};
for (const file of readdirSync(refDir).filter(f => f.endsWith(".json")).sort()) {
  const ref = JSON.parse(readFileSync(new URL(file, refDir), "utf8"));
  for (const seg of ref.segments) {
    const group = seg.group || FAULT_BY_ID[seg.fault].group;
    const audioOnly = diagnose({ features: seg.features });
    tally.n++; tally.group += audioOnly.groups[0].id === group;
    if (!seg.fault) continue;                       // yalnızca bölgesi bilinen ses (ör. "amortisör")
    const withSymptoms = diagnose({ features: seg.features, conditions: typicalConditions(FAULT_BY_ID[seg.fault]) });
    const rank = r => r.ranked.findIndex(e => e.fault.id === seg.fault) + 1;
    const a = rank(audioOnly), b = rank(withSymptoms);
    tally.labelled++; tally.top1 += a === 1; tally.top3 += a <= 3;
    tally.groupC += withSymptoms.groups[0].id === group; tally.top1C += b === 1; tally.top3C += b <= 3;
    (byFault[seg.fault] ||= []).push(`${a}→${b}`);
  }
}
console.log(`\nReferans sesler (doğrulanmamış, ${tally.n} ses)`);
console.log(`  yalnızca sesle:      bölge ${tally.group}/${tally.n} · ilk sıra ${tally.top1}/${tally.labelled} · ilk 3: ${tally.top3}/${tally.labelled}`);
console.log(`  ses + belirtilerle:  bölge ${tally.groupC}/${tally.labelled} · ilk sıra ${tally.top1C}/${tally.labelled} · ilk 3: ${tally.top3C}/${tally.labelled}`);
console.log("  arıza başına sıra (yalnız ses → belirtilerle):");
for (const [id, ranks] of Object.entries(byFault)) console.log(`    ${id.padEnd(15)} ${ranks.join("  ")}`);

// --- Normal araçlar: gerçek rölanti kayıtlarında uygulama ne diyor? (yanlış alarm ölçümü)
import { idleNormality } from "../js/engine/normal.js";
const normal = JSON.parse(readFileSync(new URL("../tests/normal/rolanti.json", import.meta.url), "utf8")).recordings;
let inside = 0, tone = 0, good = 0;
for (const r of normal) {
  inside += idleNormality(r.features, { conditions: ["rolanti"], fuel: r.fuel }).inside;
  tone += r.features.toneHz > 0;
  good += diagnose({ features: r.features, conditions: ["rolanti"], vehicle: { fuel: r.fuel } }).confidence.level === "good";
}
console.log(`\nNormal araçlar (gerçek rölanti kayıtları, ${normal.length} araç)`);
console.log(`  "normal rölanti sesine benziyor" denen: ${inside}/${normal.length}`);
console.log(`  kalıcı ton bulunan (yanlış alarm):      ${tone}/${normal.length}`);
console.log(`  "iyi" güvenle arıza gösterilen:         ${good}/${normal.length}`);
