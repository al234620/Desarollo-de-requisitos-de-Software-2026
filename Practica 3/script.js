"use strict";

// El CSV es la fuente inicial. Los cambios posteriores viven en este navegador.
const KEY = "paso_firme_datos_v1";
const CATEGORIES = ["Tenis", "Casual", "Zapato", "Tacón", "Bota"];
const ICONS = { Tenis: "👟", Casual: "👞", Zapato: "👞", "Tacón": "👠", Bota: "🥾" };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => Number(value).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const formatDate = (value) => new Date(value).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
let state = { products: [], sales: [], adjustments: [] };

function notify(message, isError = false) {
  const note = $("#notification");
  note.textContent = message;
  note.classList.toggle("error", isError);
  note.hidden = false;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    notify("No se pudieron guardar los cambios en este navegador. Revisa el espacio disponible y los permisos de almacenamiento.", true);
    console.error(error);
    return false;
  }
}

// Lee CSV con comillas dobles, separadores dentro de comillas y saltos de línea.
function parseCSV(text, delimiter) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("El CSV tiene comillas sin cerrar.");
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function parseProductsCSV(text) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = parseCSV(text, delimiter);
  const headers = ["Código", "Marca", "Modelo", "Categoría", "Talla (MX)", "Precio (MXN)", "Existencia (pares)"];
  if (!rows.length || headers.some((header, index) => normalize(rows[0][index]) !== normalize(header))) {
    throw new Error("El CSV debe tener las siete columnas originales: Código, Marca, Modelo, Categoría, Talla (MX), Precio (MXN), Existencia (pares).");
  }
  const seen = new Set();
  return rows.slice(1).map((row, index) => {
    const line = index + 2;
    if (row.length !== 7) throw new Error(`La fila ${line} no contiene siete columnas.`);
    const [codigo, marca, modelo, categoria, tallaText, precioText, stockText] = row;
    // Precio con punto decimal o coma decimal si el delimitador es punto y coma.
    const parseNumeric = (value) => Number(String(value).replace(/\$/g, "").replace(/\s/g, "").replace(delimiter === ";" ? /,/g : /(?<=\d),(?=\d{3}(?:\D|$))/g, delimiter === ";" ? "." : ""));
    const talla = parseNumeric(tallaText), precio = parseNumeric(precioText), existencia = parseNumeric(stockText);
    if (!codigo || !marca || !modelo || !CATEGORIES.includes(categoria) || !Number.isFinite(talla) || talla <= 0 || !Number.isFinite(precio) || precio <= 0 || !Number.isSafeInteger(existencia) || existencia < 0) {
      throw new Error(`Datos inválidos en la fila ${line}.`);
    }
    if (seen.has(normalize(codigo))) throw new Error(`Código repetido en el CSV: ${codigo}.`);
    seen.add(normalize(codigo));
    return { codigo, marca, modelo, categoria, talla, precio, existencia };
  });
}

function decodeCSV(buffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("windows-1252").decode(buffer); }
}

function validateSaved(data) {
  return data && Array.isArray(data.products) && Array.isArray(data.sales) && Array.isArray(data.adjustments) &&
    data.products.every(product => product && typeof product.codigo === "string" && Number.isSafeInteger(product.existencia) && product.existencia >= 0 && Number.isFinite(product.precio));
}

async function loadInitial() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const loaded = JSON.parse(stored);
      if (!validateSaved(loaded)) throw new Error("Los datos guardados tienen un formato incorrecto.");
      state = loaded;
      refresh();
      return;
    }
  } catch (error) {
    notify(`No se pudieron recuperar los datos locales: ${error.message}`, true);
    return;
  }

  try {
    const response = await fetch("productos.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = parseProductsCSV(decodeCSV(await response.arrayBuffer()));
    if (!products.length) throw new Error("No hay productos en el CSV.");
    state = { products, sales: [], adjustments: [] };
    if (save()) notify(`${products.length} productos importados desde productos.csv.`);
  } catch (error) {
    notify(`No se pudo abrir productos.csv: ${error.message}. Abre la carpeta con Live Server o un servidor local.`, true);
    console.error(error);
  }
  refresh();
}

function showView(id) {
  $$(".view").forEach(view => { view.hidden = view.id !== id; view.classList.toggle("active", view.id === id); });
  $$(".nav-button").forEach(button => {
    const selected = button.dataset.view === id;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("#notification").hidden = true;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.type) node.type = options.type;
  if (options.disabled !== undefined) node.disabled = options.disabled;
  if (options.title) node.title = options.title;
  if (options.dataset) Object.entries(options.dataset).forEach(([key, value]) => { node.dataset[key] = value; });
  children.forEach(child => node.append(child));
  return node;
}

function productName(product) { return `${product.marca} ${product.modelo}`; }
function stockLabel(value) { return value === 0 ? "Agotado" : value <= 2 ? `${value} · Bajo` : `${value} pares`; }
function stockClass(value) { return value === 0 ? "empty" : value <= 2 ? "low" : ""; }
function updateSelect(select, products, prompt, keepSelection = true) {
  const previous = keepSelection ? select.value : "";
  select.replaceChildren(element("option", { text: prompt }));
  select.options[0].value = "";
  products.forEach(product => {
    const option = element("option", { text: `${product.codigo} · ${productName(product)} · MX ${product.talla} · ${product.existencia} pares` });
    option.value = product.codigo;
    select.append(option);
  });
  if (products.some(product => product.codigo === previous)) select.value = previous;
}

function renderDashboard() {
  $("#metricProductos").textContent = state.products.length;
  $("#metricPares").textContent = state.products.reduce((sum, p) => sum + p.existencia, 0);
  $("#metricBajo").textContent = state.products.filter(p => p.existencia <= 2).length;
  $("#metricIngresos").textContent = money(state.sales.reduce((sum, sale) => sum + sale.total, 0));
  const list = $("#lowStockList"); list.replaceChildren();
  const low = state.products.filter(p => p.existencia <= 2).sort((a, b) => a.existencia - b.existencia).slice(0, 5);
  if (!low.length) { list.append(element("p", { className: "muted", text: "¡Todos los productos tienen más de dos pares!" })); return; }
  low.forEach(product => {
    const details = element("div", {}, [element("strong", { text: productName(product) }), element("small", { text: `${product.codigo} · MX ${product.talla}` })]);
    list.append(element("div", { className: "low-item" }, [details, element("b", { text: `${product.existencia} ${product.existencia === 1 ? "par" : "pares"}` })]));
  });
}

function renderFilters() {
  const select = $("#categoryFilter");
  const previous = select.value;
  select.replaceChildren(element("option", { text: "Todas las categorías" }));
  select.options[0].value = "";
  [...new Set(state.products.map(product => product.categoria))].sort((a, b) => a.localeCompare(b, "es")).forEach(category => {
    const option = element("option", { text: category }); option.value = category; select.append(option);
  });
  select.value = previous;
}

function renderProducts() {
  const term = normalize($("#search").value);
  const category = $("#categoryFilter").value;
  const stockFilter = $("#stockFilter").value;
  const filtered = state.products.filter(product => {
    const matchText = normalize(`${product.codigo} ${product.marca} ${product.modelo}`).includes(term);
    const matchCategory = !category || product.categoria === category;
    const matchStock = !stockFilter || (stockFilter === "available" && product.existencia > 0) || (stockFilter === "low" && product.existencia > 0 && product.existencia <= 2) || (stockFilter === "empty" && product.existencia === 0);
    return matchText && matchCategory && matchStock;
  });
  $("#resultsLabel").textContent = `Mostrando ${filtered.length} de ${state.products.length} referencias`;
  const grid = $("#productGrid"); grid.replaceChildren();
  if (!filtered.length) { grid.append(element("p", { className: "empty-state", text: "No hay productos que coincidan con los filtros." })); return; }
  filtered.forEach(product => {
    const categoryClass = normalize(product.categoria).replace(/[^a-z]/g, "");
    const picture = element("div", { className: `product-picture ${categoryClass}` }, [
      element("span", { className: "code-tag", text: product.codigo }),
      element("span", { className: "shoe-mark", text: ICONS[product.categoria] || "👟" })
    ]);
    const meta = element("div", { className: "product-meta" }, [
      element("span", { text: product.categoria }),
      element("span", { className: `stock-badge ${stockClass(product.existencia)}`, text: stockLabel(product.existencia) })
    ]);
    const sell = element("button", { text: "Vender →", type: "button", disabled: product.existencia === 0, dataset: { sell: product.codigo } });
    grid.append(element("article", { className: "product-card" }, [picture, meta,
      element("h3", { text: productName(product) }),
      element("p", { className: "product-detail", text: `Talla MX ${product.talla} · Código ${product.codigo}` }),
      element("div", { className: "product-bottom" }, [element("span", { className: "product-price", text: money(product.precio) }), sell])
    ]));
  });
}

function renderSalePreview() {
  const product = state.products.find(p => p.codigo === $("#saleProduct").value);
  const qty = Number($("#saleQuantity").value);
  $("#salePreviewName").textContent = product ? `${productName(product)} · MX ${product.talla}` : "Selecciona un producto";
  $("#salePreviewUnit").textContent = product ? money(product.precio) : "—";
  $("#salePreviewStock").textContent = product ? `${product.existencia} pares` : "—";
  $("#salePreviewTotal").textContent = product && Number.isSafeInteger(qty) && qty > 0 ? money(product.precio * qty) : "—";
  $("#saleQuantity").max = product ? String(product.existencia) : "";
}

function renderStockCurrent() {
  const product = state.products.find(p => p.codigo === $("#stockProduct").value);
  $("#currentStock").textContent = product ? `Existencia actual: ${product.existencia} pares` : "Existencia actual: —";
}

function addRow(tbody, contents) {
  tbody.append(element("tr", {}, contents.map(value => element("td", { text: value }))));
}
function renderHistory() {
  $("#saleCount").textContent = `${state.sales.length} registros`;
  $("#adjustCount").textContent = `${state.adjustments.length} registros`;
  const sales = $("#salesTable"), adjustments = $("#adjustTable");
  sales.replaceChildren(); adjustments.replaceChildren();
  if (!state.sales.length) addRow(sales, ["Sin ventas registradas."]);
  else state.sales.forEach(sale => addRow(sales, [sale.folio, formatDate(sale.fecha), `${sale.codigo} · ${sale.producto} · MX ${sale.talla}`, sale.cantidad, money(sale.total)]));
  if (!state.adjustments.length) addRow(adjustments, ["Sin ajustes registrados."]);
  else state.adjustments.forEach(adjustment => addRow(adjustments, [formatDate(adjustment.fecha), `${adjustment.codigo} · ${adjustment.producto}`, `${adjustment.antes} → ${adjustment.despues}`, adjustment.motivo]));
}
function refresh() {
  renderDashboard(); renderFilters(); renderProducts();
  updateSelect($("#saleProduct"), state.products.filter(p => p.existencia > 0), "Selecciona un producto");
  updateSelect($("#stockProduct"), state.products, "Selecciona un producto");
  renderSalePreview(); renderStockCurrent(); renderHistory();
}

function registerProduct(event) {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form);
  const codigo = String(data.get("codigo")).trim();
  const marca = String(data.get("marca")).trim(), modelo = String(data.get("modelo")).trim();
  const categoria = String(data.get("categoria"));
  const talla = Number(data.get("talla")), precio = Number(data.get("precio")), existencia = Number(data.get("existencia"));
  if (!codigo || !marca || !modelo || !CATEGORIES.includes(categoria) || !Number.isFinite(talla) || talla < 1 || talla > 50 || !Number.isFinite(precio) || precio <= 0 || !Number.isSafeInteger(existencia) || existencia < 0) {
    notify("Verifica los campos: precio positivo, talla válida y existencia entera no negativa.", true); return;
  }
  if (state.products.some(p => normalize(p.codigo) === normalize(codigo))) { notify(`El código ${codigo} ya está registrado.`, true); return; }
  state.products.push({ codigo, marca, modelo, categoria, talla, precio, existencia });
  if (!save()) { state.products.pop(); return; }
  form.reset(); refresh(); showView("catalogo"); notify(`Producto ${codigo} registrado correctamente.`);
}

function registerSale(event) {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form);
  const product = state.products.find(p => p.codigo === data.get("codigo"));
  const qty = Number(data.get("cantidad"));
  if (!product || !Number.isSafeInteger(qty) || qty <= 0) { notify("Selecciona un producto y una cantidad entera mayor que cero.", true); return; }
  if (qty > product.existencia) { notify(`No hay suficientes pares: solo quedan ${product.existencia}.`, true); return; }
  const nextNumber = state.sales.reduce((max, sale) => Math.max(max, Number(String(sale.folio).slice(1)) || 0), 0) + 1;
  const sale = { folio: `V${String(nextNumber).padStart(4, "0")}`, fecha: new Date().toISOString(), codigo: product.codigo, producto: productName(product), talla: product.talla, cantidad: qty, total: Math.round(product.precio * qty * 100) / 100 };
  product.existencia -= qty; state.sales.unshift(sale);
  if (!save()) { product.existencia += qty; state.sales.shift(); return; }
  form.reset(); refresh(); showView("historial"); notify(`Venta ${sale.folio} registrada. Se descontaron ${qty} ${qty === 1 ? "par" : "pares"}.`);
}

function registerAdjustment(event) {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form);
  const product = state.products.find(p => p.codigo === data.get("codigo"));
  const after = Number(data.get("nuevaExistencia"));
  const motivo = String(data.get("motivo")).trim();
  if (!product || !Number.isSafeInteger(after) || after < 0 || !motivo) { notify("Selecciona un producto, indica un conteo entero válido y escribe el motivo.", true); return; }
  if (product.existencia === after) { notify("La nueva existencia es igual a la actual; no hay cambios por guardar.", true); return; }
  const before = product.existencia;
  const adjustment = { fecha: new Date().toISOString(), codigo: product.codigo, producto: productName(product), antes: before, despues: after, motivo };
  product.existencia = after; state.adjustments.unshift(adjustment);
  if (!save()) { product.existencia = before; state.adjustments.shift(); return; }
  form.reset(); refresh(); showView("historial"); notify(`Existencia de ${product.codigo} actualizada: ${before} → ${after} pares.`);
}

$$(".nav-button").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
$$("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
$("[data-link]").addEventListener("click", event => { event.preventDefault(); showView("inicio"); });
$("#search").addEventListener("input", renderProducts);
$("#categoryFilter").addEventListener("change", renderProducts);
$("#stockFilter").addEventListener("change", renderProducts);
$("#productGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-sell]");
  if (!button || button.disabled) return;
  showView("venta"); $("#saleProduct").value = button.dataset.sell; $("#saleQuantity").value = 1; renderSalePreview();
});
$("#saleProduct").addEventListener("change", renderSalePreview);
$("#saleQuantity").addEventListener("input", renderSalePreview);
$("#stockProduct").addEventListener("change", renderStockCurrent);
$("#productForm").addEventListener("submit", registerProduct);
$("#saleForm").addEventListener("submit", registerSale);
$("#stockForm").addEventListener("submit", registerAdjustment);
loadInitial();
