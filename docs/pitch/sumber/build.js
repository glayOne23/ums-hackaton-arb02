const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const L = require("react-icons/lu");
/**
 * Membuat docs/pitch/SIGAP_Pitch_Deck.pptx dari tangkapan layar di ./shots.
 * Cara pakai ada di README.md folder ini.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const JSZip = require("jszip");

const OUT = path.resolve(process.argv[2] || path.join(__dirname, "..", "SIGAP_Pitch_Deck.pptx"));
const RAW = path.join(__dirname, "shots");
// Gambar desktop dipotong (tanpa menu samping) ke folder sementara
const SHOT = fs.mkdtempSync(path.join(os.tmpdir(), "sigap-pitch-")) + "/";
const CROPS = {
  "d-dashboard": [540, 140, 1980, 1460], "d-requests": [540, 140, 1980, 1460], "d-billing": [540, 140, 1980, 1460],
  "d-outlets": [512, 140, 2048, 1160], "d-reports": [512, 140, 2048, 1160], "d-settings": [512, 140, 2048, 1160], "d-product": [512, 140, 2048, 1160],
};
async function prepareShots() {
  for (const f of fs.readdirSync(RAW).filter((f) => f.endsWith(".png"))) fs.copyFileSync(path.join(RAW, f), SHOT + f);
  for (const [name, [left, top, width, height]] of Object.entries(CROPS)) {
    await sharp(path.join(RAW, name + ".png")).extract({ left, top, width, height }).toFile(SHOT + name + "-crop.png");
  }
}

// pptxgenjs tidak bisa menulis warna tema; tulis langsung ke ppt/theme/theme1.xml
async function applyTheme(file, theme) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file), { createFolders: false });
  const part = "ppt/theme/theme1.xml";
  let xml = await zip.file(part).async("string");
  const esc = (v) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const order = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  const scheme = `<a:clrScheme name="${esc(theme.name)}">` + order.map((k) => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`).join("") + "</a:clrScheme>";
  xml = xml.replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, scheme)
    .replace(/(<a:majorFont><a:latin typeface=")[^"]*/, `$1${esc(theme.headFontFace)}`)
    .replace(/(<a:minorFont><a:latin typeface=")[^"]*/, `$1${esc(theme.bodyFontFace)}`)
    .replace(/(<a:theme [^>]*name=")[^"]*/, `$1${esc(theme.name)}`)
    .replace(/<a:fontScheme name="[^"]*"/, `<a:fontScheme name="${esc(theme.name)}"`);
  zip.file(part, xml);
  // Tanpa entri folder kosong: berkas seperti itu gagal dibuka sebagian layanan cloud
  const out = new JSZip();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) out.file(name, await entry.async("nodebuffer"), { createFolders: false });
  }
  fs.writeFileSync(file, await out.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

const THEME = {
  name: "SIGAP Herbal",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1C2A22", lt1: "FFFFFF", dk2: "14532D", lt2: "EEF4EC",
    accent1: "15803D", accent2: "C2710C", accent3: "0F766E", accent4: "65A30D",
    accent5: "57534E", accent6: "B91C1C", hlink: "15803D", folHlink: "0F766E",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "SIGAP — Draf Pitch Deck";
pres.subject = "UMS Health Innovation Hackathon 2026 · ARB-02";
pres.author = "Tim Antech Async";
pres.company = "Antech Async";
const C = pres.SchemeColor;
const W = 13.333;
const M = 0.6;

pres.defineSlideMaster({
  title: "SIGAP_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 2.2, w: 7.4, h: 1.5, fontSize: 60, bold: true, color: C.background1, fontFace: THEME.headFontFace, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: M, y: 3.85, w: 7.4, h: 1.3, fontSize: 22, color: C.background2, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SIGAP_CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.35, w: W - 2 * M, h: 0.8, fontSize: 36, bold: true, color: C.text2, fontFace: THEME.headFontFace, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "SIGAP · Tim Antech Async · ARB-02", options: { x: M, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: W - M - 0.5, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: HEX.accent5, align: "right" },
});

// ---------- helpers ----------
const iconCache = {};
async function icon(name, color = "FFFFFF") {
  const key = name + color;
  if (!iconCache[key]) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(L[name], { color: "#" + color, size: 256 }));
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    iconCache[key] = "image/png;base64," + buf.toString("base64");
  }
  return iconCache[key];
}
async function badge(slide, name, x, y, d, fill, id) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: "badge-" + id });
  const p = d * 0.25;
  slide.addImage({ data: await icon(name), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: "icon-" + id, altText: id });
}
function card(slide, x, y, w, h, fill, id) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { type: "none" }, objectName: id });
}
function txt(slide, text, opts) {
  slide.addText(text, { isTextBox: true, margin: 0, color: C.text1, fontSize: 14, valign: "top", ...opts });
}
function lead(slide, time, text) {
  txt(slide, [
    ...(time ? [{ text: time + "  ·  ", options: { bold: true, italic: false, color: C.accent2 } }] : []),
    { text },
  ], { x: M, y: 1.15, w: W - 2 * M, h: 0.45, fontSize: 18, color: C.accent5, italic: true, objectName: "lead" });
}
function source(slide, text) {
  txt(slide, text, { x: 6.3, y: 7.0, w: W - M - 0.7 - 6.3, h: 0.3, fontSize: 10, color: C.accent5, align: "right", objectName: "source" });
}
const shadow = () => ({ type: "outer", blur: 10, offset: 4, angle: 90, color: "000000", opacity: 0.25 });
// Phone frame around a 390x844 screenshot; returns the screen box for marks
function phone(slide, file, x, y, h, id, alt) {
  const pad = 0.09;
  const ih = h - 2 * pad, iw = ih * 390 / 844;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: iw + 2 * pad, h, rectRadius: 0.22, fill: { color: C.text1 }, line: { type: "none" }, shadow: shadow(), objectName: "phone-" + id });
  slide.addImage({ path: SHOT + file, x: x + pad, y: y + pad, w: iw, h: ih, objectName: "screen-" + id, altText: alt });
  return { x: x + pad, y: y + pad, w: iw, h: ih, fw: iw + 2 * pad };
}
// Laptop-like frame around a cropped desktop screenshot (ratio = w/h)
function screen(slide, file, x, y, w, ratio, id, alt) {
  const pad = 0.07;
  const iw = w - 2 * pad, ih = iw / ratio;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: ih + 2 * pad, rectRadius: 0.08, fill: { color: C.text1 }, line: { type: "none" }, shadow: shadow(), objectName: "frame-" + id });
  slide.addImage({ path: SHOT + file, x: x + pad, y: y + pad, w: iw, h: ih, objectName: "screen-" + id, altText: alt });
  return ih + 2 * pad;
}
// Numbered marker on a phone screen at css pixel (cx, cy)
function mark(slide, box, cx, cy, n) {
  const d = 0.42;
  const x = box.x + (cx / 390) * box.w - d / 2, y = box.y + (cy / 844) * box.h - d / 2;
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.accent2 }, line: { color: C.background1, width: 2 }, objectName: "mark-" + n });
  txt(slide, String(n), { x, y, w: d, h: d, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "mark-n-" + n });
}
function numbered(slide, n, head, body, x, y, w) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.42, h: 0.42, fill: { color: C.accent2 }, line: { type: "none" }, objectName: "num-" + n });
  txt(slide, String(n), { x, y, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "num-n-" + n });
  txt(slide, head, { x: x + 0.6, y: y - 0.02, w: w - 0.6, h: 0.38, fontSize: 17, bold: true, color: C.text2, objectName: "num-h-" + n });
  if (body) txt(slide, body, { x: x + 0.6, y: y + 0.36, w: w - 0.6, h: 0.5, fontSize: 14, color: C.accent5, objectName: "num-d-" + n });
}

(async () => {
  await prepareShots();
  // ===== 1. Pembuka =====
  pres.addSection({ title: "Pembuka" });
  let s = pres.addSlide({ masterName: "SIGAP_DARK", sectionTitle: "Pembuka" });
  txt(s, "UMS HEALTH INNOVATION HACKATHON 2026 · TANTANGAN ARB-02", { x: M, y: 1.4, w: 8, h: 0.4, fontSize: 14, bold: true, color: C.accent4, charSpacing: 2, objectName: "kicker" });
  s.addText("SIGAP", { placeholder: "title" });
  s.addText("Satu catatan kunjungan sales, langsung menjadi stok, tagihan, dan laporan pimpinan.", { placeholder: "body" });
  txt(s, "CRM & Inventory untuk CV Arba'in Jaya Mandiri, produsen dan distributor herbal di Surakarta", { x: M, y: 5.25, w: 7.0, h: 0.6, fontSize: 16, color: C.background2, objectName: "partner" });
  txt(s, "Tim Antech Async · Purwo Setiawan · Ridwan Renaldi · Muhammad Hammam Islami · Reza Amin Thohari", { x: M, y: 6.55, w: 8.4, h: 0.4, fontSize: 14, color: C.background2, objectName: "team" });
  s.addShape(pres.shapes.OVAL, { x: 8.75, y: 1.55, w: 4.3, h: 4.3, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "hero-circle" });
  phone(s, "m-visit-offline.png", 9.75, 0.75, 6.0, "hero", "Layar kunjungan SIGAP di HP sales, tersimpan tanpa sinyal");
  s.addNotes("Pembuka. Kami akan bercerita tentang satu hari Endri, sales CV Arba'in, sebelum dan sesudah memakai SIGAP. Yang tampak di HP ini adalah layar aplikasi yang sudah jalan, bukan desain.");

  // ===== 2. Sebelum: perjalanan satu nota =====
  pres.addSection({ title: "Cerita" });
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Cerita" });
  s.addText("Hari ini, satu nota menempuh lima tangan", { placeholder: "title" });
  lead(s, "Sebelum SIGAP", "Perjalanan satu kunjungan Endri, dari data Oktober 2026 dan wawancara mitra");
  const asis = [
    ["LuReceipt", "Endri, di outlet", "Menulis sisa dan laku di nota kertas bercap", "Tidak tahu outlet mana yang sudah lama terlewat"],
    ["LuSmartphone", "Endri, sore hari", "Mengirim foto nota lewat WhatsApp", "Nota menumpuk, mudah terselip"],
    ["LuFileSpreadsheet", "Admin kantor", "Mengetik ulang ke 4–5 file Excel", "\"tk dewi murni gading\" tercatat 3×; nama produk beda tiap file"],
    ["LuWarehouse", "Gudang", "Menghitung stok di catatan sendiri", "Batch dan ED di rak outlet tidak tercatat"],
    ["LuChartColumn", "Pimpinan", "Baru melihat rekap di akhir bulan", "Outlet terlewat sejak Maret; perputaran produk utama ±50%"],
  ];
  const aw = (W - 2 * M) / asis.length;
  s.addShape(pres.shapes.LINE, { x: M + aw / 2, y: 2.3, w: aw * (asis.length - 1), h: 0, line: { color: HEX.accent5, width: 2, dashType: "dash" }, objectName: "asis-line" });
  for (let i = 0; i < asis.length; i++) {
    const [ic, who, act, pain] = asis[i];
    const cx = M + i * aw + aw / 2;
    await badge(s, ic, cx - 0.45, 1.85, 0.9, C.accent5, "asis-" + i);
    txt(s, who, { x: cx - aw / 2 + 0.1, y: 2.9, w: aw - 0.2, h: 0.4, fontSize: 17, bold: true, color: C.text2, align: "center", objectName: "asis-who-" + i });
    txt(s, act, { x: cx - aw / 2 + 0.15, y: 3.3, w: aw - 0.3, h: 0.75, fontSize: 14, color: C.text1, align: "center", objectName: "asis-act-" + i });
    card(s, cx - aw / 2 + 0.1, 4.15, aw - 0.2, 1.3, "FBEAEA", "asis-pain-" + i);
    txt(s, pain, { x: cx - aw / 2 + 0.25, y: 4.28, w: aw - 0.5, h: 1.05, fontSize: 14, color: C.accent6, align: "center", valign: "middle", objectName: "asis-pain-t-" + i });
  }
  const st = [["2", "sales"], ["±260", "outlet titip jual"], ["±60", "produk"], ["7", "kabupaten/kota"], ["±260", "kunjungan per sales per bulan"]];
  st.forEach(([n, l], i) => {
    const x = M + i * aw;
    txt(s, [{ text: n + " ", options: { bold: true, color: C.accent1, fontSize: 28, fontFace: THEME.headFontFace } }, { text: l, options: { color: C.accent5, fontSize: 14 } }],
      { x: x + 0.1, y: 5.75, w: aw - 0.2, h: 0.9, align: "center", valign: "middle", objectName: "scale-" + i });
  });
  source(s, "Sumber: 01 Problem Discovery Report, temuan T1–T7");
  s.addNotes("Ini perjalanan satu nota hari ini. Endri menulis di nota kertas, mengirim fotonya lewat WhatsApp, admin mengetik ulang ke empat sampai lima file Excel, gudang punya catatan sendiri, dan pimpinan baru tahu di akhir bulan. Di setiap tangan ada masalah yang kami temukan di data Oktober 2026. Skalanya: 2 sales, sekitar 260 outlet, 60 produk, 7 kabupaten/kota.");

  // ===== 3. Pagi =====
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Cerita" });
  s.addText("Pagi: Endri tahu ke mana dan membawa apa", { placeholder: "title" });
  lead(s, "07.30", "Sebelum berangkat, Endri cukup membuka SIGAP di HP");
  const p1 = phone(s, "m-today.png", M, 1.8, 5.05, "today", "Layar Hari ini: target kunjungan, uang dibawa, stok bawaan");
  const p2 = phone(s, "m-outlets.png", M + p1.fw + 0.4, 1.8, 5.05, "outlets", "Daftar outlet sales dengan saringan perlu dikunjungi dan belum bayar");
  mark(s, p1, 390, 150, 1); mark(s, p1, 390, 300, 2); mark(s, p1, 390, 740, 3);
  mark(s, p2, 390, 180, 4); mark(s, p2, 390, 300, 5);
  const cx3 = M + 2 * p1.fw + 1.0, cw3 = W - M - cx3;
  numbered(s, 1, "Rencana hari ini", "Jumlah kunjungan dan uang tunai yang sedang dibawa", cx3, 1.95, cw3);
  numbered(s, 2, "Stok bawaan di mobil", "Per produk, tanpa catatan terpisah", cx3, 2.95, cw3);
  numbered(s, 3, "Minta barang ke gudang", "Langsung dari HP; gudang mendapat notifikasi", cx3, 3.95, cw3);
  numbered(s, 4, "Saring outlet", "Perlu dikunjungi atau belum bayar, satu ketukan", cx3, 4.95, cw3);
  numbered(s, 5, "Outlet yang terlewat tampak duluan", "Ditandai oranye, dengan tombol WhatsApp ke pemilik", cx3, 5.95, cw3);
  s.addNotes("Pagi hari Endri membuka SIGAP. Layar Hari ini menunjukkan rencana kunjungan, uang yang dibawa, stok bawaan, dan permintaan ke gudang. Daftar outlet bisa disaring: yang perlu dikunjungi atau yang belum bayar. Outlet yang lama terlewat ditandai, sehingga tidak ada lagi outlet yang terlupa berbulan-bulan.");

  // ===== 4. Di outlet =====
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Cerita" });
  s.addText("Di outlet: tanpa sinyal, cukup ubah sisa di rak", { placeholder: "title" });
  lead(s, "10.00", "Di toko obat langganan, sinyal hilang. Endri tetap bekerja seperti biasa");
  const ph = 4.4, gap = 0.62;
  const v1 = phone(s, "m-visit.png", M, 1.8, ph, "v1", "Layar kunjungan: sisa titipan sudah terisi");
  const v2 = phone(s, "m-visit-offline.png", M + v1.fw + gap, 1.8, ph, "v2", "Sisa diubah, laku dan rupiah dihitung otomatis, tersimpan di HP");
  const v3 = phone(s, "m-bill.png", M + 2 * (v1.fw + gap), 1.8, ph, "v3", "Bayar dan simpan, dengan saran tagih");
  for (let i = 0; i < 2; i++) {
    s.addShape(pres.shapes.RIGHT_ARROW, { x: M + (i + 1) * v1.fw + i * gap + 0.1, y: 1.8 + ph / 2 - 0.2, w: gap - 0.2, h: 0.4, fill: { color: C.accent2 }, line: { type: "none" }, objectName: "flow-" + i });
  }
  const caps = [["1  Sisa sudah terisi", "dari kunjungan lalu"], ["2  Ubah yang berkurang", "laku dan Rp dihitung sendiri"], ["3  Bayar & simpan", "saran tagih, foto form"]];
  caps.forEach(([h, d], i) => {
    const x = M + i * (v1.fw + gap) - 0.1;
    txt(s, h, { x, y: 6.3, w: v1.fw + 0.2, h: 0.32, fontSize: 15, bold: true, color: C.text2, align: "center", objectName: "cap-h-" + i });
    txt(s, d, { x, y: 6.6, w: v1.fw + 0.2, h: 0.25, fontSize: 12, color: C.accent5, align: "center", objectName: "cap-d-" + i });
  });
  const rx = M + 3 * v1.fw + 2 * gap + 0.55, rw4 = W - M - rx;
  card(s, rx, 1.8, rw4, 1.75, C.text2, "offline-card");
  await badge(s, "LuWifiOff", rx + 0.25, 2.0, 0.6, C.accent2, "offline");
  txt(s, "Tersimpan di HP", { x: rx + 1.0, y: 2.05, w: rw4 - 1.2, h: 0.5, fontSize: 18, bold: true, color: C.background1, valign: "middle", objectName: "offline-h" });
  txt(s, "Nota terkirim sendiri saat sinyal kembali, tepat satu kali, tidak dobel", { x: rx + 0.25, y: 2.75, w: rw4 - 0.5, h: 0.95, fontSize: 14, color: C.background2, objectName: "offline-d" });
  [["≤ 15 dtk", "bila tidak ada yang laku"], ["≤ 2 mnt", "kunjungan biasa, tanpa mengetik huruf"]].forEach(([n, l], i) => {
    const y = 3.95 + i * 1.3;
    txt(s, n, { x: rx, y, w: rw4, h: 0.7, fontSize: 36, bold: true, color: C.accent2, fontFace: THEME.headFontFace, objectName: "target-n-" + i });
    txt(s, l, { x: rx, y: y + 0.68, w: rw4, h: 0.4, fontSize: 14, color: C.accent5, objectName: "target-l-" + i });
  });
  s.addNotes("Di outlet, sinyal hilang. Endri membuka outlet: sisa titipan sudah terisi dari kunjungan lalu. Ia cukup mengurangi yang berkurang; laku dan rupiahnya dihitung sendiri, termasuk potongan. Lalu bayar dan simpan, dengan saran tagih bila laku lebih dari dua. Semua tersimpan di HP dan terkirim sendiri saat ada sinyal, tepat satu kali.");

  // ===== 5. Kantor, gudang, pimpinan =====
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Cerita" });
  s.addText("Sinyal kembali: semua orang langsung tahu", { placeholder: "title" });
  lead(s, "Siang–sore", "Nota Endri tadi sudah menjadi stok, tagihan, dan angka ringkasan, tanpa diketik ulang");
  const roles = [
    ["d-requests-crop.png", "LuWarehouse", "Admin Gudang", "Permintaan Endri masuk dengan angka di menu; batch ED terdekat dipilih otomatis"],
    ["d-billing-crop.png", "LuReceipt", "Admin Kantor", "Tagihan belum lunas, yang paling lama di atas; daftar dikirim lewat WhatsApp"],
    ["d-dashboard-crop.png", "LuChartColumn", "Pimpinan", "Omzet, kunjungan, outlet belum dikunjungi, dan outlet paling aktif hari ini juga"],
  ];
  const rw5 = (W - 2 * M - 2 * 0.35) / 3;
  for (let i = 0; i < roles.length; i++) {
    const [file, ic, who, d] = roles[i];
    const x = M + i * (rw5 + 0.35);
    const fh = screen(s, file, x, 1.8, rw5, 1980 / 1460, "role-" + i, who + ": " + d);
    await badge(s, ic, x, 1.8 + fh + 0.3, 0.6, C.accent1, "role-" + i);
    txt(s, who, { x: x + 0.75, y: 1.8 + fh + 0.3, w: rw5 - 0.75, h: 0.6, fontSize: 18, bold: true, color: C.text2, valign: "middle", objectName: "role-h-" + i });
    txt(s, d, { x, y: 1.8 + fh + 1.0, w: rw5, h: 0.8, fontSize: 16, color: C.text1, objectName: "role-d-" + i });
  }
  s.addNotes("Begitu sinyal kembali, gudang melihat permintaan Endri dengan lencana angka di menu, dan batch dengan ED terdekat dipilih otomatis. Admin kantor melihat tagihan yang belum lunas, paling lama di atas. Pimpinan melihat omzet, kunjungan, outlet yang belum dikunjungi, dan outlet paling aktif saat itu juga, bukan di akhir bulan.");

  // ===== 6. Di balik layar =====
  pres.addSection({ title: "Solusi" });
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Solusi" });
  s.addText("Di balik layar: ke mana nota Endri pergi", { placeholder: "title" });
  lead(s, null, "Satu aplikasi untuk semua peran, satu server, sumber terbuka tanpa API berbayar");
  const arch = [
    ["LuSmartphone", "HP Endri", "Disimpan dulu di antrean HP", "React 19 PWA"],
    ["LuWifiOff", "Sinyal kembali", "Dikirim dengan kode unik, tidak pernah dobel", "Dexie · Workbox"],
    ["LuServer", "Server", "Menghitung laku, tagihan, dan potongan", "Laravel 13 · PHP 8.5"],
    ["LuDatabase", "Basis data", "Satu buku mutasi stok untuk semua lokasi", "MySQL 8.4 LTS"],
    ["LuBell", "Kabar ke orang lain", "Notifikasi ke gudang dan kantor, backup harian", "Antrean + scheduler"],
  ];
  const ww = (W - 2 * M) / arch.length;
  s.addShape(pres.shapes.LINE, { x: M + ww / 2, y: 2.2, w: ww * (arch.length - 1), h: 0, line: { color: HEX.accent2, width: 3, endArrowType: "triangle" }, objectName: "arch-line" });
  for (let i = 0; i < arch.length; i++) {
    const [ic, h, d, tech] = arch[i];
    const cx = M + i * ww + ww / 2;
    await badge(s, ic, cx - 0.42, 1.78, 0.84, C.accent1, "arch-" + i);
    txt(s, h, { x: cx - ww / 2 + 0.1, y: 2.75, w: ww - 0.2, h: 0.36, fontSize: 17, bold: true, color: C.text2, align: "center", objectName: "arch-h-" + i });
    txt(s, d, { x: cx - ww / 2 + 0.2, y: 3.12, w: ww - 0.4, h: 0.5, fontSize: 14, color: C.text1, align: "center", objectName: "arch-d-" + i });
    card(s, cx - ww / 2 + 0.3, 3.72, ww - 0.6, 0.34, C.background2, "arch-tech-" + i);
    txt(s, tech, { x: cx - ww / 2 + 0.3, y: 3.72, w: ww - 0.6, h: 0.34, fontSize: 12, bold: true, color: C.accent3, align: "center", valign: "middle", objectName: "arch-tech-t-" + i });
  }
  // Simple on purpose
  txt(s, [
    { text: "Sengaja dibuat sederhana. ", options: { bold: true, color: C.text2 } },
    { text: "Kami mendahulukan fungsi daripada hiasan, supaya SIGAP ringan dan mudah dipasang.", options: { color: C.accent5 } },
  ], { x: M, y: 4.35, w: W - 2 * M, h: 0.4, fontSize: 16, objectName: "simple-head" });
  const simple = [
    ["LuFeather", "Ringan", "Lancar di HP RAM 4 GB dan hemat kuota"],
    ["LuZap", "Cepat", "Layar langsung terbuka, walau sinyal lemah"],
    ["LuMonitorSmartphone", "Pas di semua layar", "Dari HP, tablet, sampai PC"],
    ["LuSun", "Terbaca di terik", "Kontras tinggi, huruf bisa diperbesar"],
  ];
  const sw6 = (W - 2 * M - 3 * 0.2) / 4;
  for (let i = 0; i < simple.length; i++) {
    const [ic, h, d] = simple[i];
    const x = M + i * (sw6 + 0.2);
    card(s, x, 4.85, sw6, 1.0, C.background2, "simple-" + i);
    await badge(s, ic, x + 0.15, 5.1, 0.5, C.accent2, "simple-" + i);
    txt(s, h, { x: x + 0.8, y: 4.95, w: sw6 - 0.9, h: 0.32, fontSize: 15, bold: true, color: C.text2, objectName: "simple-h-" + i });
    txt(s, d, { x: x + 0.8, y: 5.27, w: sw6 - 0.9, h: 0.5, fontSize: 14, color: C.text1, objectName: "simple-d-" + i });
  }
  card(s, M, 6.05, W - 2 * M, 0.75, C.text2, "deploy-card");
  await badge(s, "LuSettings", M + 0.2, 6.17, 0.5, C.accent2, "rules");
  txt(s, [
    { text: "Aturan bisnis diubah di Pengaturan, tanpa programmer. ", options: { bold: true, color: C.background1 } },
    { text: "Dipasang dengan Docker + Caddy, HTTPS otomatis, bisa di server Indonesia.", options: { color: C.background2 } },
  ], { x: M + 0.85, y: 6.05, w: W - 2 * M - 1.0, h: 0.75, fontSize: 14, valign: "middle", objectName: "deploy-text" });
  s.addNotes("Arsitekturnya mengikuti perjalanan nota tadi. Nota disimpan dulu di HP, dikirim saat sinyal kembali dengan kode unik sehingga tidak dobel, server menghitung laku, tagihan, dan potongan sesuai Pengaturan, lalu mencatatnya di satu buku mutasi stok. Antrean dan scheduler mengirim notifikasi dan backup harian. Tampilan SIGAP memang terlihat sederhana, dan itu kami sengaja. Kami mendahulukan fungsi supaya aplikasinya ringan dan mudah dipasang. Hasilnya: lancar di HP sales dengan RAM 4 GB dan hemat kuota, layar cepat terbuka walau sinyal lemah, pas dari HP sampai PC, dan tetap terbaca di bawah terik matahari karena kontrasnya tinggi dan hurufnya bisa diperbesar.");

  // ===== 7. Progres =====
  pres.addSection({ title: "Progres" });
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Progres" });
  s.addText("Ini bukan desain: aplikasinya sudah jalan", { placeholder: "title" });
  lead(s, null, "Status per 23 November 2026, dari repositori tim");
  const prog = [["27", "pull request digabung"], ["±260", "uji otomatis backend"], ["±80", "uji end-to-end (HP & desktop)"], ["7 / 7", "langkah skenario uji SRS jalan otomatis"]];
  prog.forEach(([n, l], i) => {
    const y = 1.75 + i * 0.98;
    txt(s, n, { x: M, y, w: 3.2, h: 0.7, fontSize: 36, bold: true, color: C.accent1, fontFace: THEME.headFontFace, objectName: "prog-n-" + i });
    txt(s, l, { x: M, y: y + 0.66, w: 3.3, h: 0.35, fontSize: 14, color: C.accent5, objectName: "prog-l-" + i });
  });
  txt(s, [
    { text: "Siap untuk mitra: ", options: { bold: true, color: C.accent1 } },
    { text: "panduan penggunaan 53 halaman dan panduan pindah data dari Excel." },
  ], { x: M, y: 5.8, w: 4.4, h: 0.55, fontSize: 14, objectName: "guide" });
  txt(s, [
    { text: "Berikutnya: ", options: { bold: true, color: C.accent2 } },
    { text: "modul maklon, sudah dirancang di dokumen 06." },
  ], { x: M, y: 6.4, w: 4.4, h: 0.55, fontSize: 14, objectName: "next" });
  const shots = [
    ["d-outlets-crop.png", "Outlet per sales, impor Excel, gabung dobel"],
    ["d-reports-crop.png", "10 laporan, ekspor Excel dan cetak"],
    ["d-product-crop.png", "Stok per produk: gudang, sales, outlet, ED"],
    ["d-settings-crop.png", "Pengaturan aturan, peran dan izin"],
  ];
  const gw = 3.55, gx = W - M - 2 * gw - 0.35;
  shots.forEach(([f, cap], i) => {
    const x = gx + (i % 2) * (gw + 0.35), y = 1.8 + Math.floor(i / 2) * 2.55;
    const fh = screen(s, f, x, y, gw, 2048 / 1160, "prog-" + i, cap);
    txt(s, cap, { x, y: y + fh + 0.08, w: gw, h: 0.32, fontSize: 14, bold: true, color: C.text2, objectName: "prog-cap-" + i });
  });
  s.addNotes("Semua layar yang tadi ditampilkan diambil dari aplikasi yang sudah jalan. Selain alur kunjungan, sudah ada data outlet dan impor Excel dengan penggabungan data dobel, sepuluh laporan dengan ekspor Excel, stok gudang per batch dan ED, pengaturan aturan, peran dan izin, koreksi nota, tutup buku, notifikasi, dan backup harian. Kualitas dijaga dengan uji otomatis. Untuk mitra juga sudah siap panduan penggunaan 53 halaman per peran, lengkap dengan gambar dan alur, serta panduan memindahkan data dari Excel lama.");

  // ===== 8. Regulasi & KI =====
  pres.addSection({ title: "Regulasi dan KI" });
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Regulasi dan KI" });
  s.addText("Setiap botol bisa ditelusuri sampai rak outlet", { placeholder: "title" });
  lead(s, null, "Regulasi produk herbal, data pribadi, dan kekayaan intelektual sudah masuk ke rancangan");
  const chain = [
    ["LuPill", "Produk", "Nomor BPOM wajib diisi", "Peraturan BPOM 25/2023"],
    ["LuPackage", "Gudang", "Barang masuk per batch dan ED", "CPOTB · BPOM 25/2021"],
    ["LuSmartphone", "Bawaan sales", "Batch ED terdekat keluar dulu", "Telusur batch"],
    ["LuStore", "Rak outlet", "Peringatan tarik 6 bulan sebelum ED", "Bila ada penarikan: tahu outlet mana"],
  ];
  const cw8 = (W - 2 * M) / chain.length;
  s.addShape(pres.shapes.LINE, { x: M + cw8 / 2, y: 2.3, w: cw8 * (chain.length - 1), h: 0, line: { color: HEX.accent1, width: 3, endArrowType: "triangle" }, objectName: "chain-line" });
  for (let i = 0; i < chain.length; i++) {
    const [ic, h, d, law] = chain[i];
    const cx = M + i * cw8 + cw8 / 2;
    await badge(s, ic, cx - 0.45, 1.85, 0.9, C.accent1, "chain-" + i);
    txt(s, h, { x: cx - cw8 / 2 + 0.1, y: 2.9, w: cw8 - 0.2, h: 0.4, fontSize: 18, bold: true, color: C.text2, align: "center", objectName: "chain-h-" + i });
    txt(s, d, { x: cx - cw8 / 2 + 0.2, y: 3.3, w: cw8 - 0.4, h: 0.5, fontSize: 14, color: C.text1, align: "center", objectName: "chain-d-" + i });
    txt(s, law, { x: cx - cw8 / 2 + 0.2, y: 3.8, w: cw8 - 0.4, h: 0.35, fontSize: 12, italic: true, color: C.accent5, align: "center", objectName: "chain-law-" + i });
  }
  const bot = [
    ["LuShieldCheck", C.accent1, "Pelindungan data pribadi", "UU No. 27/2022 (UU PDP)", "Hak akses per peran, riwayat siapa mengubah apa, HTTPS, data di server sendiri. Data mitra asli tidak masuk repo."],
    ["LuCopyright", C.accent2, "Hak cipta program", "UU No. 28/2014 · DJKI", "Didaftarkan sebagai program komputer milik tim (target Apr 2027). Pustaka sumber terbuka berlisensi longgar."],
  ];
  const bw = (W - 2 * M - 0.3) / 2;
  for (let i = 0; i < bot.length; i++) {
    const [ic, col, h, law, d] = bot[i];
    const x = M + i * (bw + 0.3);
    card(s, x, 4.5, bw, 2.2, C.background2, "law-" + i);
    await badge(s, ic, x + 0.3, 4.8, 0.8, col, "law-" + i);
    txt(s, h, { x: x + 1.3, y: 4.75, w: bw - 1.5, h: 0.42, fontSize: 20, bold: true, color: C.text2, objectName: "law-h-" + i });
    txt(s, law, { x: x + 1.3, y: 5.17, w: bw - 1.5, h: 0.35, fontSize: 14, italic: true, color: C.accent5, objectName: "law-l-" + i });
    txt(s, d, { x: x + 1.3, y: 5.55, w: bw - 1.5, h: 1.05, fontSize: 14, objectName: "law-d-" + i });
  }
  source(s, "Perlu disepakati dengan mitra: kepemilikan data dan lisensi pakai");
  s.addNotes("Setiap botol bisa ditelusuri: produk dengan nomor BPOM, masuk gudang per batch dan ED, batch ED terdekat keluar dulu ke sales, sampai ke rak outlet dengan peringatan tarik enam bulan sebelum ED. Bila ada penarikan, kita tahu outlet mana yang menerima batch itu, sejalan dengan CPOTB. Data PIC outlet dilindungi sesuai UU PDP. Program didaftarkan hak cipta. Yang masih perlu disepakati dengan mitra: kepemilikan data dan lisensi pakai.");

  // ===== 9. Biaya & model bisnis =====
  pres.addSection({ title: "Biaya dan bisnis" });
  s = pres.addSlide({ masterName: "SIGAP_CONTENT", sectionTitle: "Biaya dan bisnis" });
  s.addText("Bagi mitra, hematnya lebih besar dari biayanya", { placeholder: "title" });
  lead(s, null, "Model langganan per sales: server, backup, pembaruan, dan bantuan sudah termasuk");
  // Price card
  card(s, M, 1.8, 3.6, 3.75, C.text2, "price-card");
  txt(s, "Rp 150 rb", { x: M + 0.3, y: 1.98, w: 3.0, h: 0.75, fontSize: 36, bold: true, color: C.background1, fontFace: THEME.headFontFace, objectName: "price-n" });
  txt(s, "per sales per bulan", { x: M + 0.3, y: 2.7, w: 3.0, h: 0.35, fontSize: 16, color: C.background2, objectName: "price-l" });
  txt(s, [
    { text: "Pengguna kantor, gudang, pimpinan: gratis", options: { bullet: true, breakLine: true } },
    { text: "CV Arba'in, 2 sales: Rp 300 rb per bulan", options: { bullet: true, bold: true, breakLine: true } },
    { text: "Mitra pilot gratis sampai Apr 2027", options: { bullet: true, breakLine: true } },
    { text: "Data milik klien, bisa diekspor kapan saja", options: { bullet: true } },
  ], { x: M + 0.3, y: 3.2, w: 3.05, h: 2.25, fontSize: 14, color: C.background2, paraSpaceAfter: 6, objectName: "price-list" });
  // Chart helper
  const cmp = (x, w, title, labels, values, fmt, max, id, alt) => {
    txt(s, title, { x, y: 1.8, w, h: 0.4, fontSize: 18, bold: true, color: C.text2, objectName: id + "-title" });
    s.addChart(pres.charts.BAR, [{ name: title, labels, values }], {
      x: x - 0.1, y: 2.2, w: w + 0.1, h: 2.55, barDir: "col",
      chartColors: [HEX.accent1, HEX.accent6], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: fmt,
      dataLabelColor: HEX.dk1, dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelFontFace: "+mn-lt",
      catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 14, catAxisLabelFontFace: "+mn-lt",
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: max, valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: false, showTitle: false, barGapWidthPct: 45, objectName: id, altText: alt,
    });
  };
  cmp(4.55, 3.85, "Per bulan", ["Biaya SIGAP", "Waktu rekap admin"], [300, 600], "\"Rp \"0\" rb\"", 720, "month-chart",
    "Per bulan: biaya SIGAP Rp 300 ribu, waktu admin untuk rekap senilai Rp 600 ribu");
  txt(s, "±44 jam per bulan kembali ke admin untuk menagih dan melayani outlet, bukan pengurangan karyawan", { x: 4.55, y: 4.85, w: 3.85, h: 0.6, fontSize: 12, italic: true, color: C.accent5, objectName: "month-note" });
  cmp(8.85, W - M - 8.85, "Total 3 tahun", ["Langganan", "Beli putus"], [11, 38], "\"Rp \"0\" jt\"", 45, "tco-chart",
    "Total biaya 3 tahun: langganan sekitar Rp 11 juta, beli putus sekitar Rp 38 juta");
  txt(s, "Beli putus: lisensi + pasang Rp 20 jt, pemeliharaan 20% per tahun, server sendiri Rp 3,3 jt per tahun", { x: 8.85, y: 4.85, w: W - M - 8.85, h: 0.6, fontSize: 12, italic: true, color: C.accent5, objectName: "tco-note" });
  // Upside not yet counted
  txt(s, "Belum dihitung, tapi nyata:", { x: M, y: 5.85, w: 2.6, h: 0.75, fontSize: 16, bold: true, color: C.text2, valign: "middle", objectName: "upside-h" });
  const ups = [
    ["LuTimer", "Barang ED ditarik sebelum menjadi rugi"],
    ["LuReceipt", "Tagihan tunda tertagih lebih cepat"],
    ["LuStore", "Outlet yang terlewat dikunjungi lagi"],
  ];
  const ux = M + 2.75, uw = (W - M - ux - 2 * 0.25) / 3;
  for (let i = 0; i < ups.length; i++) {
    const x = ux + i * (uw + 0.25);
    card(s, x, 5.85, uw, 0.75, C.background2, "up-" + i);
    await badge(s, ups[i][0], x + 0.15, 5.95, 0.55, C.accent2, "up-" + i);
    txt(s, ups[i][1], { x: x + 0.85, y: 5.85, w: uw - 0.95, h: 0.75, fontSize: 14, color: C.text1, valign: "middle", objectName: "up-t-" + i });
  }
  source(s, "Asumsi dan harga adalah draf, divalidasi ke mitra sebelum Final");
  s.addNotes("Dari sisi mitra, SIGAP menguntungkan. Biayanya Rp 150 ribu per sales per bulan; pengguna kantor, gudang, dan pimpinan gratis. Untuk CV Arba'in dengan 2 sales, Rp 300 ribu per bulan, sudah termasuk server, backup, pembaruan, dan bantuan. Sebagai pembanding, bila admin menghabiskan 2 jam sehari untuk rekap ulang Excel, nilainya sekitar Rp 600 ribu per bulan, dua kali biaya SIGAP. Ini bukan pengurangan karyawan: admin tetap dibutuhkan, hanya pekerjaan mengetik ulang yang hilang, dan sekitar 44 jam per bulan itu dialihkan untuk menagih tagihan tunda, memantau outlet yang terlewat, dan melayani outlet. Angka rupiahnya dihitung dari 2 jam per hari kali 22 hari dengan gaji admin Rp 2,4 juta per bulan. Dalam 3 tahun, langganan sekitar Rp 11 juta, sedangkan beli putus sekitar Rp 38 juta: lisensi dan pemasangan Rp 20 juta, pemeliharaan 20 persen per tahun, dan server sendiri. Belum dihitung: barang ED yang tertarik tepat waktu, tagihan tunda yang tertagih lebih cepat, dan outlet terlewat yang kembali dikunjungi. Beli putus tetap tersedia bagi yang ingin memasang di server sendiri, dengan kontrak pemeliharaan. Semua angka adalah asumsi yang akan kami validasi bersama mitra.");

  // ===== 10. Rencana =====
  pres.addSection({ title: "Rencana" });
  s = pres.addSlide({ masterName: "SIGAP_DARK", sectionTitle: "Rencana" });
  txt(s, "Bab berikutnya: Endri memakai SIGAP", { x: M, y: 0.45, w: W - 2 * M, h: 0.8, fontSize: 36, bold: true, color: C.background1, fontFace: THEME.headFontFace, valign: "middle", objectName: "plan-title" });
  const steps = [
    ["23–25 Nov", "Kunci fitur", "Rapikan temuan uji; pasang di server HTTPS untuk demo"],
    ["26–27 Nov", "Uji & gladi", "Uji kegunaan dengan sales dan admin mitra (SUS ≥ 70); gladi demo 4 menit"],
    ["28–29 Nov", "Final", "Demo 7 langkah skenario uji, langsung dari HP tanpa sinyal"],
    ["Des–Jan", "Migrasi", "Data Excel asli masuk; pelatihan 30 menit per peran"],
    ["Feb–Mar", "Uji coba", "Satu area, ukur: selisih stok turun ≥ 50%"],
    ["Apr 2027", "TKT 6", "Evaluasi, laporan, daftar hak cipta; lanjut modul maklon"],
  ];
  const sw = (W - 2 * M) / steps.length;
  s.addShape(pres.shapes.LINE, { x: M + sw / 2, y: 2.05, w: sw * (steps.length - 1), h: 0, line: { color: C.accent4, width: 2 }, objectName: "timeline" });
  for (let i = 0; i < steps.length; i++) {
    const [when, h, d] = steps[i];
    const cx = M + i * sw + sw / 2;
    const hl = i === 2;
    s.addShape(pres.shapes.OVAL, { x: cx - 0.3, y: 1.75, w: 0.6, h: 0.6, fill: { color: hl ? C.accent2 : C.accent1 }, line: { color: C.background1, width: 2 }, objectName: "dot-" + i });
    txt(s, String(i + 1), { x: cx - 0.3, y: 1.75, w: 0.6, h: 0.6, fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "dot-n-" + i });
    txt(s, when, { x: cx - sw / 2 + 0.08, y: 2.55, w: sw - 0.16, h: 0.35, fontSize: 14, bold: true, color: hl ? C.accent2 : C.accent4, align: "center", objectName: "when-" + i });
    txt(s, h, { x: cx - sw / 2 + 0.08, y: 2.9, w: sw - 0.16, h: 0.45, fontSize: 20, bold: true, color: C.background1, align: "center", fontFace: THEME.headFontFace, objectName: "step-h-" + i });
    txt(s, d, { x: cx - sw / 2 + 0.12, y: 3.4, w: sw - 0.24, h: 1.4, fontSize: 14, color: C.background2, align: "center", objectName: "step-d-" + i });
  }
  card(s, M, 4.95, W - 2 * M, 1.5, C.accent1, "ask-card");
  await badge(s, "LuHandshake", M + 0.3, 5.25, 0.9, C.text2, "ask");
  txt(s, "Yang kami butuhkan dari mitra", { x: M + 1.45, y: 5.15, w: 10, h: 0.45, fontSize: 20, bold: true, color: C.background1, objectName: "ask-h" });
  txt(s, "Dua jam bersama 2 sales dan admin untuk uji kegunaan sebelum Final, serta contoh data Excel asli untuk uji migrasi.", { x: M + 1.45, y: 5.6, w: W - 2 * M - 1.75, h: 0.75, fontSize: 16, color: C.background1, objectName: "ask-d" });
  s.addNotes("Cerita tadi masih memakai data contoh. Bab berikutnya adalah Endri yang sungguhan memakai SIGAP. Sebelum Final kami mengunci fitur, memasang di server HTTPS, menguji kegunaan bersama pengguna mitra, dan gladi demo. Setelahnya migrasi data asli, uji coba satu area, lalu evaluasi dan hak cipta untuk mencapai TKT 6 pada April 2027. Yang kami minta: waktu uji kegunaan dan contoh data Excel asli.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  fs.rmSync(SHOT, { recursive: true, force: true });
  console.log("Tersimpan:", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
