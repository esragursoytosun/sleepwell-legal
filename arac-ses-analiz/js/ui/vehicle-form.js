import { $ } from "./dom.js";
import { BRANDS, EV_BRANDS, FUELS } from "../data/vehicles.js";
import { state, saveVehicle } from "../state.js";

const option = (value, label = value) => `<option value="${value}">${label}</option>`;

function fillModels() {
  const models = BRANDS[$("brand").value] || [];
  $("model").innerHTML = models.length ? models.map(m => option(m)).join("") : option("", "Önce marka seçin");
  $("model").disabled = !models.length;
}

function read() {
  state.vehicle = {
    brand: $("brand").value,
    model: $("brand").value ? $("model").value : "",
    fuel: $("fuel").value,
    year: parseInt($("year").value, 10) || 0,
    km: parseInt($("km").value, 10) || 0
  };
  saveVehicle();
}

/** Araç formunu doldurur, kayıtlı bilgiyi geri yükler ve değişiklikleri duruma yazar. */
export function initVehicleForm() {
  $("brand").innerHTML = option("", "Seçin…") + Object.keys(BRANDS).map(b => option(b)).join("");
  $("fuel").innerHTML = FUELS.map(([v, l]) => option(v, l)).join("");

  const v = state.vehicle;
  if (BRANDS[v.brand]) $("brand").value = v.brand;
  fillModels();
  if ((BRANDS[v.brand] || []).includes(v.model)) $("model").value = v.model;
  $("fuel").value = v.fuel || "benzin";
  if (v.year) $("year").value = v.year;
  if (v.km) $("km").value = v.km;

  $("brand").addEventListener("change", () => {
    fillModels();
    if (EV_BRANDS.includes($("brand").value)) $("fuel").value = "elektrik";
    read();
  });
  for (const id of ["model", "fuel", "year", "km"]) $(id).addEventListener("change", read);
  read();
}
