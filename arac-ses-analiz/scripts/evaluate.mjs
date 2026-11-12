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
