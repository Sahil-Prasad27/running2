const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const FORMAT_LABELS = {
  "12in_lp": '12" LP',
  "7in": '7" Single',
  "10in": '10"',
  "12in_maxi": '12" Maxi',
  box_set: "Box Set",
  picture_disc: "Picture Disc",
  coloured: "Coloured Vinyl",
};

const GRADES = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"];
const GRADE_RANK = Object.fromEntries(GRADES.map((grade, index) => [grade, index]));
const GRADE_DEFS = {
  M: "Perfect sealed or untouched copy with no visible handling.",
  NM: "Exceptionally clean copy with only the slightest signs of careful handling.",
  "VG+": "Strong collector copy with light wear and solid playback.",
  VG: "Noticeable wear and light noise, but still an enjoyable copy.",
  "G+": "Heavier wear, marks, and surface noise though fully playable.",
  G: "Well-played copy with significant wear and cosmetic flaws.",
  F: "Rough copy with major defects, best kept as a filler.",
  P: "Broken or heavily damaged copy, for display or repair only.",
};

const STORAGE_KEY = "vintage-vinyl-frontend-only-v1";
const STORE_SETTINGS = {
  store_id: 1,
  currency: "USD",
  vat_rate: 0.1,
  vat_mode: "included",
  role_discount_cap: 10,
  compliance_threshold: 500,
  storage_receipt_retention_years: 7,
};
const ACTIVE_STOCK_STATUSES = new Set(["in_stock", "reserved", "consignment"]);

let cart = [];
let tradeRows = 0;
let store = loadStore();

const money = (value) => "$" + Number(value || 0).toFixed(2);
const esc = (value) =>
  String(value ?? "").replace(/[&<>"]/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[match]);
const jsq = (value) => JSON.stringify(String(value ?? ""));

function toast(message, error = false) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.className = "toast show" + (error ? " error" : "");
  window.setTimeout(() => {
    el.className = "toast";
  }, 3000);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function localIso(date = new Date()) {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join("T");
}

function nowIso() {
  return localIso(new Date());
}

function todayIso() {
  return nowIso().slice(0, 10);
}

function shiftDate(days, hours = 12, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return localIso(date);
}

function deepText(parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function sortByDateDesc(left, right, key = "created_at") {
  return String(right[key] || "").localeCompare(String(left[key] || ""));
}

function saveStore() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    // Keep the UI usable even if localStorage is unavailable.
  }
}

function loadStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.records) && Array.isArray(parsed.inventory)) {
        return parsed;
      }
    }
  } catch (error) {
    // Fall through to a fresh demo store.
  }
  const initial = createInitialStore();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch (error) {
    // Ignore persistence issues in file:// or private contexts.
  }
  return initial;
}

function createInitialStore() {
  const today = todayIso();
  const compactDate = today.replaceAll("-", "");

  const records = [
    {
      id: 1,
      artist: "The Velvet Echoes",
      title: "Second Signal",
      label: "Moonlight Records",
      catalogue_number: "ML-222",
      country_code: "US",
      year: 1980,
      format: "12in_lp",
      rpm: 33,
      mono_stereo: "stereo",
      genres: ["Post-Punk", "Dream Pop"],
      pre_order: false,
      release_date: "",
      deposit_policy: "optional",
      per_customer_cap: 5,
    },
    {
      id: 2,
      artist: "Midnight Static",
      title: "City After Rain",
      label: "Afterglow Press",
      catalogue_number: "AG-118",
      country_code: "GB",
      year: 1986,
      format: "12in_lp",
      rpm: 33,
      mono_stereo: "stereo",
      genres: ["Electronic", "New Wave"],
      pre_order: false,
      release_date: "",
      deposit_policy: "optional",
      per_customer_cap: 5,
    },
    {
      id: 3,
      artist: "The Turntable Saints",
      title: "Dust on the Needle",
      label: "Saint City Sounds",
      catalogue_number: "SCS-074",
      country_code: "US",
      year: 1974,
      format: "7in",
      rpm: 45,
      mono_stereo: "mono",
      genres: ["Soul", "Funk"],
      pre_order: false,
      release_date: "",
      deposit_policy: "optional",
      per_customer_cap: 5,
    },
    {
      id: 4,
      artist: "Neon Harbour",
      title: "Late Checkout",
      label: "Harbourline",
      catalogue_number: "HB-091",
      country_code: "DE",
      year: 1991,
      format: "coloured",
      rpm: 33,
      mono_stereo: "stereo",
      genres: ["Synthpop", "Alternative"],
      pre_order: false,
      release_date: "",
      deposit_policy: "optional",
      per_customer_cap: 5,
    },
    {
      id: 5,
      artist: "Saffron Stereo",
      title: "Monsoon Dream",
      label: "Lotus Arc",
      catalogue_number: "LA-305",
      country_code: "JP",
      year: 1978,
      format: "12in_lp",
      rpm: 33,
      mono_stereo: "stereo",
      genres: ["Jazz", "Fusion"],
      pre_order: false,
      release_date: "",
      deposit_policy: "optional",
      per_customer_cap: 5,
    },
    {
      id: 6,
      artist: "Lunar B-Sides",
      title: "Pressed in Red",
      label: "Orbit Archive",
      catalogue_number: "OA-909",
      country_code: "US",
      year: new Date().getFullYear(),
      format: "picture_disc",
      rpm: 33,
      mono_stereo: "stereo",
      genres: ["Indie Rock", "Shoegaze"],
      pre_order: true,
      release_date: shiftDate(16, 10, 0).slice(0, 10),
      deposit_policy: "required",
      per_customer_cap: 2,
    },
    {
      id: 7,
      artist: "Echo Province",
      title: "Sunday Transmission",
      label: "Province Wax",
      catalogue_number: "PW-068",
      country_code: "US",
      year: 1968,
      format: "10in",
      rpm: 45,
      mono_stereo: "mono",
      genres: ["Garage Rock", "Psych"],
      pre_order: false,
      release_date: "",
      deposit_policy: "optional",
      per_customer_cap: 5,
    },
  ];

  const inventory = [
    {
      id: 1,
      record_id: 1,
      bin_code: "BIN-222",
      media_grade: "VG+",
      sleeve_grade: "VG+",
      has_original_inner_sleeve: true,
      asking_price: 24.5,
      status: "in_stock",
      acquired_at: shiftDate(-14, 11, 15),
      notes: "Bright copy with crisp top end.",
      matrix_runout_a: "ML-222-A",
      matrix_runout_b: "ML-222-B",
      low_stock_threshold: 1,
      inserts: ["Lyrics sleeve"],
      consignment_id: null,
    },
    {
      id: 2,
      record_id: 1,
      bin_code: "BIN-222B",
      media_grade: "VG",
      sleeve_grade: "VG",
      has_original_inner_sleeve: false,
      asking_price: 20,
      status: "reserved",
      acquired_at: shiftDate(-8, 16, 10),
      notes: "Reserved for regular customer pickup.",
      matrix_runout_a: "ML-222-A2",
      matrix_runout_b: "ML-222-B2",
      low_stock_threshold: 1,
      inserts: [],
      consignment_id: null,
    },
    {
      id: 3,
      record_id: 2,
      bin_code: "BIN-118",
      media_grade: "NM",
      sleeve_grade: "VG+",
      has_original_inner_sleeve: true,
      asking_price: 28,
      status: "in_stock",
      acquired_at: shiftDate(-10, 13, 0),
      notes: "Clean sleeve edge, tiny corner tap.",
      matrix_runout_a: "AG-118-A",
      matrix_runout_b: "AG-118-B",
      low_stock_threshold: 1,
      inserts: ["Hype sticker"],
      consignment_id: null,
    },
    {
      id: 4,
      record_id: 2,
      bin_code: "BIN-118S",
      media_grade: "NM",
      sleeve_grade: "VG+",
      has_original_inner_sleeve: true,
      asking_price: 27,
      status: "sold",
      acquired_at: shiftDate(-20, 15, 20),
      notes: "Sold from window display copy.",
      matrix_runout_a: "AG-118-A",
      matrix_runout_b: "AG-118-B",
      low_stock_threshold: 1,
      inserts: [],
      consignment_id: null,
    },
    {
      id: 5,
      record_id: 3,
      bin_code: "SOUL-74",
      media_grade: "VG",
      sleeve_grade: "VG",
      has_original_inner_sleeve: false,
      asking_price: 19.5,
      status: "consignment",
      acquired_at: shiftDate(-5, 12, 30),
      notes: "Consignment copy with punchy low end.",
      matrix_runout_a: "SCS-074-A",
      matrix_runout_b: "SCS-074-B",
      low_stock_threshold: 1,
      inserts: [],
      consignment_id: 1,
    },
    {
      id: 6,
      record_id: 4,
      bin_code: "ALT-091",
      media_grade: "VG+",
      sleeve_grade: "VG+",
      has_original_inner_sleeve: true,
      asking_price: 22,
      status: "in_stock",
      acquired_at: shiftDate(-3, 17, 45),
      notes: "Marbled pressing with glossy finish.",
      matrix_runout_a: "HB-091-A",
      matrix_runout_b: "HB-091-B",
      low_stock_threshold: 1,
      inserts: ["Art print"],
      consignment_id: null,
    },
    {
      id: 7,
      record_id: 5,
      bin_code: "JAZZ-305",
      media_grade: "NM",
      sleeve_grade: "VG+",
      has_original_inner_sleeve: true,
      asking_price: 26,
      status: "sold",
      acquired_at: shiftDate(-30, 14, 15),
      notes: "Sold during lunchtime walk-in.",
      matrix_runout_a: "LA-305-A",
      matrix_runout_b: "LA-305-B",
      low_stock_threshold: 1,
      inserts: ["Booklet"],
      consignment_id: null,
    },
    {
      id: 8,
      record_id: 7,
      bin_code: "GAR-068",
      media_grade: "G+",
      sleeve_grade: "VG",
      has_original_inner_sleeve: false,
      asking_price: 31,
      status: "in_stock",
      acquired_at: shiftDate(-1, 10, 40),
      notes: "Harder-to-find ten inch original.",
      matrix_runout_a: "PW-068-A",
      matrix_runout_b: "PW-068-B",
      low_stock_threshold: 1,
      inserts: [],
      consignment_id: null,
    },
    {
      id: 9,
      record_id: 6,
      bin_code: "PRE-909",
      media_grade: "M",
      sleeve_grade: "M",
      has_original_inner_sleeve: true,
      asking_price: 34,
      status: "incoming",
      acquired_at: shiftDate(10, 9, 0),
      notes: "Street date stock, not yet saleable.",
      matrix_runout_a: "OA-909-A",
      matrix_runout_b: "OA-909-B",
      low_stock_threshold: 1,
      inserts: ["Poster"],
      consignment_id: null,
    },
  ];

  return {
    settings: clone(STORE_SETTINGS),
    customers: [
      {
        id: 1,
        display_name: "Maya Brooks",
        email: "maya@example.com",
        country_code: "US",
        tier: "gold",
        cancellation_count_12m: 0,
        created_at: shiftDate(-22, 11, 0),
      },
      {
        id: 2,
        display_name: "Jonah Vale",
        email: "jonah@example.com",
        country_code: "US",
        tier: "silver",
        cancellation_count_12m: 1,
        created_at: shiftDate(0, 9, 30),
      },
      {
        id: 3,
        display_name: "Priya Sen",
        email: "priya@example.com",
        country_code: "IN",
        tier: "gold",
        cancellation_count_12m: 4,
        created_at: shiftDate(-5, 10, 45),
      },
      {
        id: 4,
        display_name: "Elliot Hart",
        email: "elliot@example.com",
        country_code: "GB",
        tier: "basic",
        cancellation_count_12m: 0,
        created_at: shiftDate(-1, 14, 20),
      },
    ],
    consignors: [
      { id: 1, name: "Harper Vale" },
      { id: 2, name: "Crescent Stereo Estate" },
    ],
    records,
    inventory,
    wantlists: [
      {
        id: 1,
        customer_id: 1,
        artist_query: "Midnight Static",
        title_query: "",
        label_query: "",
        catalogue_query: "",
        year_from: 1980,
        year_to: 1989,
        max_price: 35,
        min_media_grade: "VG+",
        notify_email: true,
        notify_sms: false,
        notify_push: true,
        priority: 90,
        is_active: true,
        notes: "Looking for sharp synth records with original sleeve.",
        created_at: shiftDate(-9, 9, 15),
      },
      {
        id: 2,
        customer_id: 3,
        artist_query: "",
        title_query: "",
        label_query: "",
        catalogue_query: "",
        year_from: 1970,
        year_to: 1985,
        max_price: 30,
        min_media_grade: "VG",
        notify_email: true,
        notify_sms: true,
        notify_push: false,
        priority: 70,
        is_active: true,
        notes: "Japanese jazz and fusion under thirty dollars.",
        created_at: shiftDate(-4, 18, 5),
      },
    ],
    tradeIns: [],
    preorders: [
      {
        id: 1,
        record_id: 6,
        customer_id: 3,
        quantity: 1,
        deposit_amount: 10,
        deposit_tender: "card",
        ship_address: "International delivery",
        notes: "Please hold one clean copy.",
        release_date: shiftDate(16, 10, 0).slice(0, 10),
        placed_at: shiftDate(0, 11, 5),
        status: "pending",
      },
    ],
    serviceTickets: [
      {
        id: 1,
        ticket_number: `STK-${new Date().getFullYear()}-0001`,
        customer_id: 1,
        equipment_type: "turntable",
        brand: "Technics",
        model: "SL-1200",
        serial_number: "VV-4410",
        authorised_limit: 300,
        current_quote: 125,
        contact_attempts: 1,
        status: "received",
        symptoms: "Speed drift after warm-up.",
        notes: "Customer requested full calibration if needed.",
        received_at: shiftDate(-2, 13, 15),
      },
    ],
    consignments: [
      {
        id: 1,
        agreement_number: `CSG-${new Date().getFullYear()}-0001`,
        consignor_id: 1,
        consignor: "Harper Vale",
        effective_date: shiftDate(-35, 9, 0).slice(0, 10),
        default_payout_pct: 60,
        sale_floor: true,
        statement_frequency: "monthly",
        auto_return_days: 180,
        finalised_at: shiftDate(-35, 9, 30),
        notes: "Classic soul and funk singles.",
        tiers: [
          { from_days: 0, to_days: 30, pct: 60 },
          { from_days: 31, to_days: 90, pct: 55 },
          { from_days: 91, to_days: 180, pct: 50 },
        ],
      },
    ],
    loyaltyLedger: [
      {
        id: 1,
        customer_id: 1,
        created_at: shiftDate(-22, 11, 30),
        source: "signup_bonus",
        delta_points: 250,
        note: "Opening collector bonus",
        expires_at: shiftDate(320, 0, 0).slice(0, 10),
      },
      {
        id: 2,
        customer_id: 1,
        created_at: shiftDate(-1, 12, 20),
        source: "purchase",
        delta_points: 130,
        note: "12 inch purchase",
        expires_at: shiftDate(364, 0, 0).slice(0, 10),
      },
      {
        id: 3,
        customer_id: 2,
        created_at: shiftDate(0, 15, 10),
        source: "purchase",
        delta_points: 247,
        note: "Walk-in order points",
        expires_at: shiftDate(365, 0, 0).slice(0, 10),
      },
    ],
    blacklist: [
      {
        id: 1,
        matrix_runout_a: "FAKE-001-A",
        matrix_runout_b: "FAKE-001-B",
        artist_name: "Bootleg Choir",
        title: "Counterfeit Nights",
        reason: "Known counterfeit pressing from secondary marketplace",
        source_authority: "Store buyer notes",
        added_at: shiftDate(-18, 15, 0),
      },
    ],
    audits: [
      {
        id: 1,
        created_at: shiftDate(-3, 11, 25),
        entity_type: "inventory",
        entity_id: 6,
        action: "listed",
        actor: "Store manager",
        context: JSON.stringify({ record_id: 4, note: "New coloured pressing added" }),
      },
      {
        id: 2,
        created_at: shiftDate(-1, 12, 25),
        entity_type: "service_ticket",
        entity_id: 1,
        action: "received",
        actor: "Store manager",
        context: JSON.stringify({ equipment_type: "turntable" }),
      },
    ],
    payoutsDue: [
      {
        id: 1,
        agreement_number: `CSG-${new Date().getFullYear()}-0001`,
        consignor: "Harper Vale",
        sale_date: today,
        payout: 11.7,
      },
    ],
    orders: [
      {
        id: 1,
        order_number: `VV-${compactDate}-001`,
        customer_id: 2,
        placed_at: shiftDate(0, 10, 15),
        subtotal: 27,
        discount_total: 0,
        shipping_total: 0,
        grand_total: 27,
        status: "paid",
        email_receipt: false,
        items: [
          {
            inventory_id: 4,
            record_id: 2,
            qty: 1,
            line_discount_pct: 0,
            line_total: 27,
            artist: "Midnight Static",
            title: "City After Rain",
            genres: ["Electronic", "New Wave"],
          },
        ],
        tenders: [{ type: "card", amount: 27 }],
      },
      {
        id: 2,
        order_number: `VV-${compactDate}-002`,
        customer_id: 1,
        placed_at: shiftDate(0, 14, 40),
        subtotal: 26,
        discount_total: 1.3,
        shipping_total: 0,
        grand_total: 24.7,
        status: "shipped",
        email_receipt: true,
        items: [
          {
            inventory_id: 7,
            record_id: 5,
            qty: 1,
            line_discount_pct: 5,
            line_total: 24.7,
            artist: "Saffron Stereo",
            title: "Monsoon Dream",
            genres: ["Jazz", "Fusion"],
          },
        ],
        tenders: [{ type: "cash", amount: 24.7 }],
      },
    ],
  };
}

function debounced(fn, wait = 250) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), wait);
  };
}

function downloadFile(urlOrBlob, filename) {
  if (urlOrBlob instanceof Blob) {
    downloadBlob(urlOrBlob, filename);
    return;
  }
  const link = document.createElement("a");
  link.href = urlOrBlob;
  if (filename) link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function pdfEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPdfBlob(title, lines) {
  const textLines = [title, "", ...lines].slice(0, 42);
  const commands = ["BT", "/F1 18 Tf", "50 790 Td", `(${pdfEscape(textLines[0])}) Tj`, "/F1 11 Tf"];
  textLines.slice(1).forEach((line, index) => {
    const y = 760 - index * 16;
    commands.push(`1 0 0 1 50 ${y} Tm (${pdfEscape(line)}) Tj`);
  });
  commands.push("ET");
  const stream = commands.join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object + "\n";
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",")
    )
    .join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  }

  return rows;
}

function findRecord(recordId) {
  return store.records.find((record) => record.id === Number(recordId)) || null;
}

function findInventory(inventoryId) {
  return store.inventory.find((item) => item.id === Number(inventoryId)) || null;
}

function inventoryForRecord(recordId) {
  return store.inventory.filter((item) => item.record_id === Number(recordId));
}

function getCustomer(customerId) {
  return store.customers.find((customer) => customer.id === Number(customerId)) || null;
}

function getConsignment(consignmentId) {
  return store.consignments.find((item) => item.id === Number(consignmentId)) || null;
}

function gradeAtLeast(actual, minimum) {
  return (GRADE_RANK[actual] ?? 999) <= (GRADE_RANK[minimum] ?? 999);
}

function recordSummary(record) {
  const inventory = inventoryForRecord(record.id);
  const available = inventory.filter((item) => ACTIVE_STOCK_STATUSES.has(item.status));
  const primary = available[0] || inventory[0] || {};
  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    label: record.label,
    catalogue_number: record.catalogue_number,
    country_code: record.country_code,
    year: record.year,
    format: record.format,
    rpm: record.rpm,
    mono_stereo: record.mono_stereo,
    pre_order: Boolean(record.pre_order),
    release_date: record.release_date,
    deposit_policy: record.deposit_policy,
    per_customer_cap: record.per_customer_cap,
    price: primary.asking_price ?? 0,
    media_grade: primary.media_grade || "",
    genres: record.genres.join(", "),
    stock: available.length,
  };
}

function queryRecords(params = {}) {
  const query = String(params.q || "").trim().toLowerCase();
  let items = store.records.map(recordSummary);

  if (query) {
    const tokens = query.split(/\s+/).filter(Boolean);
    items = items.filter((item) => {
      const matrices = inventoryForRecord(item.id)
        .map((inventory) => [inventory.matrix_runout_a, inventory.matrix_runout_b, inventory.bin_code].join(" "))
        .join(" ");
      const haystack = deepText([
        item.artist,
        item.title,
        item.label,
        item.catalogue_number,
        item.country_code,
        item.genres,
        matrices,
      ]);
      return tokens.every((token) => haystack.includes(token));
    });
  }

  if (params.grade) items = items.filter((item) => item.media_grade && gradeAtLeast(item.media_grade, params.grade));
  if (params.country) items = items.filter((item) => item.country_code === String(params.country).toUpperCase());
  if (params.format) items = items.filter((item) => item.format === params.format);
  if (params.decade) items = items.filter((item) => String(item.year).startsWith(String(params.decade).slice(0, 3)));
  if (params.genre) items = items.filter((item) => item.genres.includes(params.genre));
  if (params.min_price) items = items.filter((item) => Number(item.price) >= Number(params.min_price));
  if (params.max_price) items = items.filter((item) => Number(item.price) <= Number(params.max_price));
  if (params.in_stock === "1") items = items.filter((item) => item.stock > 0);

  const sort = params.sort || "year_desc";
  if (sort === "price_desc") {
    items.sort((left, right) => Number(right.price) - Number(left.price));
  } else if (sort === "price_asc") {
    items.sort((left, right) => Number(left.price) - Number(right.price));
  } else {
    items.sort((left, right) => Number(right.year) - Number(left.year));
  }

  return {
    ok: true,
    items: clone(items),
    count: items.length,
    facets: {
      grades: clone(GRADES),
      genres: [...new Set(items.flatMap((item) => item.genres.split(",").map((genre) => genre.trim()).filter(Boolean)))].sort(),
    },
  };
}

function buildMeta() {
  const artists = [...new Set(store.records.map((record) => record.artist))]
    .sort((left, right) => left.localeCompare(right))
    .map((name, index) => ({ id: index + 1, name }));
  const labels = [...new Set(store.records.map((record) => record.label))]
    .sort((left, right) => left.localeCompare(right))
    .map((name, index) => ({ id: index + 1, name }));

  return {
    ok: true,
    grades: clone(GRADES),
    grade_defs: clone(GRADE_DEFS),
    formats: Object.keys(FORMAT_LABELS),
    format_labels: clone(FORMAT_LABELS),
    rpm: [33, 45, 78],
    artists,
    labels,
    customers: clone(store.customers),
    consignors: clone(store.consignors),
    store: clone(store.settings),
  };
}

function recordMatchesWantlist(summary, wantlist) {
  if (!wantlist.is_active) return false;
  const year = Number(summary.year) || 0;
  const price = Number(summary.price) || 0;
  const haystack = deepText([summary.artist, summary.title, summary.label, summary.catalogue_number]);

  if (wantlist.artist_query && !haystack.includes(String(wantlist.artist_query).toLowerCase())) return false;
  if (wantlist.title_query && !haystack.includes(String(wantlist.title_query).toLowerCase())) return false;
  if (wantlist.label_query && !haystack.includes(String(wantlist.label_query).toLowerCase())) return false;
  if (wantlist.catalogue_query && !haystack.includes(String(wantlist.catalogue_query).toLowerCase())) return false;
  if (wantlist.year_from && year < Number(wantlist.year_from)) return false;
  if (wantlist.year_to && year > Number(wantlist.year_to)) return false;
  if (wantlist.max_price && price > Number(wantlist.max_price)) return false;
  if (wantlist.min_media_grade && !gradeAtLeast(summary.media_grade, wantlist.min_media_grade)) return false;
  return true;
}

function countWantlistMatches() {
  const summaries = store.records.map(recordSummary);
  return store.wantlists.filter((wantlist) => summaries.some((summary) => recordMatchesWantlist(summary, wantlist))).length;
}

function todayOrders() {
  const today = todayIso();
  return store.orders.filter((order) => String(order.placed_at).startsWith(today));
}

function buildDashboard() {
  const orders = todayOrders().filter((order) => order.status !== "cancelled");
  const gross = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  const net = orders.reduce((sum, order) => sum + Number(order.grand_total || 0), 0);
  const transactions = orders.length;
  const avgBasket = transactions ? net / transactions : 0;

  const hourlyMap = new Map();
  for (const order of orders) {
    const hour = String(order.placed_at).slice(11, 13) || "00";
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + Number(order.grand_total || 0));
  }

  const genreMap = new Map();
  const topMap = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      for (const genre of item.genres || ["Other"]) {
        genreMap.set(genre, (genreMap.get(genre) || 0) + Number(item.line_total || 0));
      }
      const key = Number(item.inventory_id);
      const current = topMap.get(key) || {
        inventory_id: key,
        artist: item.artist,
        title: item.title,
        qty: 0,
        total: 0,
      };
      current.qty += Number(item.qty || 1);
      current.total += Number(item.line_total || 0);
      topMap.set(key, current);
    }
  }

  const lowStock = store.records
    .map((record) => {
      const inventory = inventoryForRecord(record.id).filter((item) => ACTIVE_STOCK_STATUSES.has(item.status));
      const stockCount = inventory.length;
      if (!stockCount) return null;
      const primary = inventory[0];
      if (stockCount > Number(primary.low_stock_threshold || 1)) return null;
      return {
        id: primary.id,
        bin_code: primary.bin_code,
        asking_price: primary.asking_price,
        title: record.title,
        artist: record.artist,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(left.asking_price) - Number(right.asking_price));

  return {
    ok: true,
    kpi: {
      gross,
      net,
      transactions,
      avg_basket: avgBasket,
      new_customers: store.customers.filter((customer) => String(customer.created_at).startsWith(todayIso())).length,
      wantlist_matches: countWantlistMatches(),
      preorders_received: store.preorders.filter((preorder) => String(preorder.placed_at).startsWith(todayIso())).length,
    },
    hourly: [...hourlyMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([h, total]) => ({ h, total })),
    genre: [...genreMap.entries()].sort((left, right) => Number(right[1]) - Number(left[1])).map(([genre, total]) => ({ genre, total })),
    top_items: [...topMap.values()].sort((left, right) => right.qty - left.qty || right.total - left.total).slice(0, 10),
    low_stock: lowStock,
    payouts_due: clone(store.payoutsDue).sort((left, right) => String(right.sale_date).localeCompare(String(left.sale_date))).slice(0, 20),
  };
}

function createAudit(entityType, entityId, action, context = {}) {
  store.audits.unshift({
    id: nextId(store.audits),
    created_at: nowIso(),
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor: "Store manager",
    context: JSON.stringify(context),
  });
}

function validateRecordInput(data) {
  const title = String(data.title || "").trim();
  const artist = String(data.artist_name || data.artist || "").trim();
  const label = String(data.label_name || data.label || "").trim();
  const catalogueNumber = String(data.catalogue_number || "").trim();
  const countryCode = String(data.country_code || "US").trim().toUpperCase();
  const year = Number(data.year);
  const format = data.format || "12in_lp";
  const rpm = Number(data.rpm || 33);
  const price = Number(data.asking_price || 0);
  const mediaGrade = data.media_grade || "VG";
  const sleeveGrade = data.sleeve_grade || mediaGrade;
  const binCode = String(data.bin_code || "").trim();

  if (!artist) throw new Error("Artist is required");
  if (!label) throw new Error("Label is required");
  if (!title) throw new Error("Title is required");
  if (!catalogueNumber) throw new Error("Catalogue Number is required");
  if (!countryCode || countryCode.length !== 2) throw new Error("Country must be an ISO-2 code");
  if (!year || year < 1948 || year > new Date().getFullYear()) throw new Error("Year outside allowed range");
  if (!FORMAT_LABELS[format]) throw new Error("Format is invalid");
  if (![33, 45, 78].includes(rpm)) throw new Error("RPM is invalid");
  if (!GRADES.includes(mediaGrade) || !GRADES.includes(sleeveGrade)) throw new Error("Grade is invalid");
  if (!binCode) throw new Error("Bin Code is required");
  if (Number.isNaN(price) || price < 0) throw new Error("Asking Price is invalid");

  const duplicate = store.records.find(
    (record) =>
      record.label.toLowerCase() === label.toLowerCase() &&
      record.catalogue_number.toLowerCase() === catalogueNumber.toLowerCase() &&
      record.country_code === countryCode
  );
  if (duplicate) throw new Error("Duplicate label + catalogue + country");

  return {
    artist,
    title,
    label,
    catalogue_number: catalogueNumber,
    country_code: countryCode,
    year,
    format,
    rpm,
    mono_stereo: data.mono_stereo || "unknown",
    matrix_runout_a: String(data.matrix_runout_a || "").trim(),
    matrix_runout_b: String(data.matrix_runout_b || "").trim(),
    media_grade: mediaGrade,
    sleeve_grade: sleeveGrade,
    has_original_inner_sleeve: Boolean(data.has_original_inner_sleeve),
    asking_price: Number(price.toFixed(2)),
    bin_code: binCode,
    negotiable: Boolean(data.negotiable),
    genres: Array.isArray(data.genres) ? data.genres.filter(Boolean) : [],
    inserts: Array.isArray(data.inserts) ? data.inserts.filter(Boolean) : [],
    photo_paths: Array.isArray(data.photo_paths) ? data.photo_paths.filter(Boolean).slice(0, 6) : [],
    notes: String(data.notes || "").trim(),
    pre_order: Boolean(data.pre_order),
    release_date: String(data.release_date || "").trim(),
    deposit_policy: data.deposit_policy || "optional",
    per_customer_cap: Math.min(Number(data.per_customer_cap || 5), 5),
  };
}

function saveRecordData(data) {
  const clean = validateRecordInput(data);
  const recordId = nextId(store.records);
  const inventoryId = nextId(store.inventory);

  store.records.push({
    id: recordId,
    artist: clean.artist,
    title: clean.title,
    label: clean.label,
    catalogue_number: clean.catalogue_number,
    country_code: clean.country_code,
    year: clean.year,
    format: clean.format,
    rpm: clean.rpm,
    mono_stereo: clean.mono_stereo,
    genres: clean.genres,
    pre_order: clean.pre_order,
    release_date: clean.release_date,
    deposit_policy: clean.deposit_policy,
    per_customer_cap: clean.per_customer_cap,
  });

  store.inventory.push({
    id: inventoryId,
    record_id: recordId,
    bin_code: clean.bin_code,
    media_grade: clean.media_grade,
    sleeve_grade: clean.sleeve_grade,
    has_original_inner_sleeve: clean.has_original_inner_sleeve,
    asking_price: clean.asking_price,
    status: clean.pre_order ? "incoming" : "in_stock",
    acquired_at: nowIso(),
    notes: clean.notes,
    matrix_runout_a: clean.matrix_runout_a,
    matrix_runout_b: clean.matrix_runout_b,
    low_stock_threshold: 1,
    inserts: clean.inserts,
    consignment_id: null,
    photos: clean.photo_paths,
  });

  const warning = findDuplicateMatrix(clean.matrix_runout_a, clean.matrix_runout_b, recordId);
  createAudit("inventory", inventoryId, "listed", { record_id: recordId, grade_note: GRADE_DEFS[clean.media_grade] });
  saveStore();

  return {
    ok: true,
    record_id: recordId,
    inventory_id: inventoryId,
    decade: `${Math.floor(clean.year / 10) * 10}s`,
    grading_explanation: GRADE_DEFS[clean.media_grade],
    warning,
  };
}

function findDuplicateMatrix(matrixA, matrixB, ignoreRecordId = null) {
  if (!matrixA && !matrixB) return null;
  const hit = store.inventory.find((item) => {
    if (ignoreRecordId && item.record_id === ignoreRecordId) return false;
    return (
      String(item.matrix_runout_a || "").toUpperCase() === String(matrixA || "").toUpperCase() &&
      String(item.matrix_runout_b || "").toUpperCase() === String(matrixB || "").toUpperCase()
    );
  });
  if (!hit) return null;
  const record = findRecord(hit.record_id);
  return record ? { id: hit.id, record_id: record.id, title: record.title, artist: record.artist } : null;
}

function priceAssistData(recordId) {
  const record = findRecord(recordId);
  if (!record) throw new Error("Record not found");
  const peers = store.records
    .filter((item) => item.id !== record.id && item.format === record.format)
    .map((item) => recordSummary(item).price)
    .filter((price) => price > 0);
  const basePrice = recordSummary(record).price || peers[0] || 20;
  const peerAverage = peers.length ? peers.reduce((sum, value) => sum + value, 0) / peers.length : basePrice;
  const center = (basePrice + peerAverage) / 2;
  return {
    ok: true,
    low: Number((center * 0.9).toFixed(2)),
    high: Number((center * 1.12).toFixed(2)),
    confidence: peers.length >= 2 ? "demo range based on similar format listings" : "demo range based on current shelf price",
  };
}

function recordDetailData(idOrInventoryId) {
  let record = findRecord(idOrInventoryId);
  if (!record) {
    const inventory = findInventory(idOrInventoryId);
    if (inventory) record = findRecord(inventory.record_id);
  }
  if (!record) throw new Error("Record not found");

  return {
    ok: true,
    record: {
      ...clone(record),
      genres: record.genres.join(", "),
    },
    inventory: clone(inventoryForRecord(record.id)),
  };
}

function createTradeIn(data) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (!rows.length) throw new Error("Add at least one record");

  let offerTotal = 0;
  const cleanRows = rows.map((row) => {
    const directRecord = findRecord(row.pressing_id);
    const inventory = findInventory(row.pressing_id);
    const record = directRecord || (inventory ? findRecord(inventory.record_id) : null);
    const base = record ? Number(recordSummary(record).price || 18) : 18;
    const multiplier = row.media_grade === "NM" ? 0.6 : row.media_grade === "VG+" ? 0.5 : row.media_grade === "VG" ? 0.4 : 0.28;
    const offer = base * multiplier;
    offerTotal += offer;
    return {
      pressing_id: Number(row.pressing_id),
      media_grade: row.media_grade,
      sleeve_grade: row.sleeve_grade,
      photos: row.photos || [],
      suggested_offer: Number(offer.toFixed(2)),
    };
  });

  if (String(data.offer_mode) === "store_credit") offerTotal *= 1.2;

  const tradeIn = {
    id: nextId(store.tradeIns),
    customer_id: Number(data.customer_id) || null,
    offer_mode: data.offer_mode || "cash",
    id_type: data.id_type || "",
    id_number: data.id_number || "",
    signature: String(data.signature || "").trim(),
    customer_accepts: Boolean(data.customer_accepts),
    notes: String(data.notes || "").trim(),
    rows: cleanRows,
    offer_total: Number(offerTotal.toFixed(2)),
    created_at: nowIso(),
  };

  if (!tradeIn.signature) throw new Error("Signature is required");
  store.tradeIns.unshift(tradeIn);
  createAudit("trade_in", tradeIn.id, "created", { rows: cleanRows.length, offer_mode: tradeIn.offer_mode });
  saveStore();
  return { ok: true, offer_total: tradeIn.offer_total };
}

function getWantlists() {
  return {
    ok: true,
    items: clone(
      store.wantlists
        .map((wantlist) => ({
          ...wantlist,
          display_name: getCustomer(wantlist.customer_id)?.display_name || "Unknown customer",
        }))
        .sort((left, right) => sortByDateDesc(left, right))
    ),
  };
}

function createWantlist(data) {
  const customerId = Number(data.customer_id);
  if (!customerId) throw new Error("Customer is required");
  const wantlist = {
    id: nextId(store.wantlists),
    customer_id: customerId,
    artist_query: String(data.artist || "").trim(),
    title_query: String(data.title || "").trim(),
    label_query: String(data.label || "").trim(),
    catalogue_query: String(data.catalogue || "").trim(),
    year_from: data.year_from ? Number(data.year_from) : null,
    year_to: data.year_to ? Number(data.year_to) : null,
    max_price: data.max_price ? Number(data.max_price) : null,
    min_media_grade: data.min_media_grade || "VG",
    notify_email: Boolean(data.notify_email),
    notify_sms: Boolean(data.notify_sms),
    notify_push: Boolean(data.notify_push),
    priority: Number(data.priority || 100),
    is_active: Boolean(data.active),
    notes: String(data.notes || "").trim(),
    created_at: nowIso(),
  };
  store.wantlists.unshift(wantlist);
  createAudit("wantlist", wantlist.id, "created", { customer_id: wantlist.customer_id });
  saveStore();
  return { ok: true, id: wantlist.id };
}

function buildReceiptAssets(order) {
  const customer = getCustomer(order.customer_id);
  const receiptLines = [
    `Order ${order.order_number}`,
    `Placed ${order.placed_at}`,
    customer ? `Customer ${customer.display_name}` : "Customer Walk-in",
    "",
    ...(order.items || []).map((item) => `${item.artist} - ${item.title} x${item.qty}  ${money(item.line_total)}`),
    "",
    `Subtotal ${money(order.subtotal)}`,
    `Discounts ${money(order.discount_total)}`,
    `Shipping ${money(order.shipping_total)}`,
    `Grand total ${money(order.grand_total)}`,
  ];
  const thermalText = receiptLines.join("\n");
  return {
    pdf_url: URL.createObjectURL(createPdfBlob("Vintage Vinyl Receipt", receiptLines)),
    thermal_url: URL.createObjectURL(new Blob([thermalText], { type: "application/octet-stream" })),
    email: order.email_receipt && customer?.email ? { queued: true, address: customer.email } : null,
  };
}

function checkoutData(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) throw new Error("Cart is empty");

  const orderItems = items.map((item) => {
    const inventory = findInventory(item.inventory_id);
    if (!inventory || !ACTIVE_STOCK_STATUSES.has(inventory.status)) throw new Error("One or more items are no longer available");
    const record = findRecord(inventory.record_id);
    const discount = Number(item.line_discount_pct || 0);
    const lineTotal = Number((Number(inventory.asking_price) * (1 - discount / 100)).toFixed(2));
    return {
      inventory_id: inventory.id,
      record_id: record.id,
      qty: Number(item.qty || 1),
      line_discount_pct: discount,
      line_total: lineTotal,
      artist: record.artist,
      title: record.title,
      genres: clone(record.genres),
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + Number(findInventory(item.inventory_id).asking_price), 0);
  const discountedSubtotal = orderItems.reduce((sum, item) => sum + Number(item.line_total), 0);
  const orderDiscountPct = Number(data.order_discount_pct || 0);
  const shippingTotal = Number(data.shipping_total || 0);
  const orderDiscountAmount = Number((discountedSubtotal * (orderDiscountPct / 100)).toFixed(2));
  const grandTotal = Number((discountedSubtotal - orderDiscountAmount + shippingTotal).toFixed(2));
  const orderId = nextId(store.orders);
  const todayStamp = todayIso().replaceAll("-", "");
  const todayCount = store.orders.filter((order) => order.order_number.startsWith(`VV-${todayStamp}-`)).length + 1;
  const order = {
    id: orderId,
    order_number: `VV-${todayStamp}-${String(todayCount).padStart(3, "0")}`,
    customer_id: Number(data.customer_id) || null,
    placed_at: nowIso(),
    subtotal: Number(subtotal.toFixed(2)),
    discount_total: Number((subtotal - discountedSubtotal + orderDiscountAmount).toFixed(2)),
    shipping_total: Number(shippingTotal.toFixed(2)),
    grand_total: grandTotal,
    status: "paid",
    email_receipt: Boolean(data.email_receipt),
    items: orderItems,
    tenders: (Array.isArray(data.tenders) ? data.tenders : []).map((tender) => ({
      type: tender.type,
      amount: Number(tender.amount || 0),
    })),
  };

  for (const item of orderItems) {
    const inventory = findInventory(item.inventory_id);
    inventory.status = "sold";
    const consignment = inventory.consignment_id ? getConsignment(inventory.consignment_id) : null;
    if (consignment) {
      store.payoutsDue.unshift({
        id: nextId(store.payoutsDue),
        agreement_number: consignment.agreement_number,
        consignor: consignment.consignor,
        sale_date: todayIso(),
        payout: Number((item.line_total * Number(consignment.default_payout_pct || 0) / 100).toFixed(2)),
      });
    }
  }

  store.orders.unshift(order);

  if (order.customer_id) {
    store.loyaltyLedger.unshift({
      id: nextId(store.loyaltyLedger),
      customer_id: order.customer_id,
      created_at: nowIso(),
      source: "purchase",
      delta_points: Math.round(grandTotal * 10),
      note: `Order ${order.order_number}`,
      expires_at: shiftDate(365, 0, 0).slice(0, 10),
    });
  }

  createAudit("order", order.id, "checked_out", { grand_total: order.grand_total, lines: order.items.length });
  saveStore();

  return {
    ok: true,
    order: clone(order),
    receipt: buildReceiptAssets(order),
  };
}

function createPreorder(data) {
  const record = findRecord(data.record_id);
  if (!record || !record.pre_order) throw new Error("Selected record is not a pre-order listing");
  const customer = getCustomer(data.customer_id);
  if (!customer) throw new Error("Customer is required");
  const quantity = Number(data.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) throw new Error("Quantity must be between 1 and 5");
  if (Number(data.deposit_amount || 0) < 0) throw new Error("Deposit cannot be negative");
  const used = store.preorders
    .filter((preorder) => preorder.record_id === record.id && preorder.customer_id === customer.id && preorder.status !== "cancelled")
    .reduce((sum, preorder) => sum + Number(preorder.quantity || 0), 0);
  if (used + quantity > Number(record.per_customer_cap || 5)) throw new Error("Per-customer quantity cap exceeded");
  if ((record.deposit_policy === "required" || customer.cancellation_count_12m > 3) && Number(data.deposit_amount || 0) <= 0) {
    throw new Error("Deposit is required for this pre-order");
  }

  const preorder = {
    id: nextId(store.preorders),
    record_id: record.id,
    customer_id: customer.id,
    quantity,
    deposit_amount: Number(data.deposit_amount || 0),
    deposit_tender: data.deposit_tender || "card",
    ship_address: String(data.ship_address || "").trim(),
    notes: String(data.notes || "").trim(),
    release_date: record.release_date,
    placed_at: nowIso(),
    status: "pending",
  };
  store.preorders.unshift(preorder);
  createAudit("preorder", preorder.id, "created", { record_id: record.id, customer_id: customer.id });
  saveStore();
  return { ok: true, preorder_id: preorder.id, release_date: record.release_date, shipping_fee: customer.country_code === "US" ? 0 : 25 };
}

function getServiceTickets() {
  return { ok: true, items: clone(store.serviceTickets).sort((left, right) => sortByDateDesc(left, right, "received_at")) };
}

function createServiceTicket(data) {
  const customer = getCustomer(data.customer_id);
  if (!customer) throw new Error("Customer is required");
  if (!data.brand || !data.model || !data.symptoms) throw new Error("Brand, Model, and Symptoms are required");
  const year = new Date().getFullYear();
  const count = store.serviceTickets.filter((ticket) => ticket.ticket_number.startsWith(`STK-${year}-`)).length + 1;
  const ticket = {
    id: nextId(store.serviceTickets),
    ticket_number: `STK-${year}-${String(count).padStart(4, "0")}`,
    customer_id: customer.id,
    equipment_type: data.equipment_type || "turntable",
    brand: String(data.brand).trim(),
    model: String(data.model).trim(),
    serial_number: String(data.serial_number || "").trim(),
    authorised_limit: Number(data.authorised_limit || 0),
    current_quote: 0,
    contact_attempts: 0,
    status: "received",
    symptoms: String(data.symptoms).trim(),
    photos: Array.isArray(data.photos) ? data.photos : [],
    checklist: data.checklist && typeof data.checklist === "object" ? clone(data.checklist) : {},
    notes: String(data.notes || "").trim(),
    received_at: nowIso(),
  };
  store.serviceTickets.unshift(ticket);
  createAudit("service_ticket", ticket.id, "received", { equipment_type: ticket.equipment_type });
  saveStore();
  return { ok: true, ticket_id: ticket.id, ticket_number: ticket.ticket_number };
}

function updateServiceStatus(ticketId, status) {
  const ticket = store.serviceTickets.find((item) => item.id === Number(ticketId));
  if (!ticket) throw new Error("Ticket not found");
  ticket.status = status;
  createAudit("service_ticket", ticket.id, "status_changed", { to: status });
  saveStore();
  return { ok: true };
}

function contactServiceTicket(ticketId) {
  const ticket = store.serviceTickets.find((item) => item.id === Number(ticketId));
  if (!ticket) throw new Error("Ticket not found");
  ticket.contact_attempts = Math.min(Number(ticket.contact_attempts || 0) + 1, 10);
  createAudit("service_ticket", ticket.id, "contact_attempt", { attempts: ticket.contact_attempts });
  saveStore();
  return { ok: true };
}

function getConsignments() {
  return { ok: true, items: clone(store.consignments).sort((left, right) => sortByDateDesc(left, right, "effective_date")) };
}

function createConsignment(data) {
  const consignor = store.consignors.find((item) => item.id === Number(data.consignor_id));
  if (!consignor) throw new Error("Consignor is required");
  if (!String(data.signature || "").trim()) throw new Error("Signature required to finalise");
  const year = new Date().getFullYear();
  const count = store.consignments.filter((item) => item.agreement_number.startsWith(`CSG-${year}-`)).length + 1;
  const consignment = {
    id: nextId(store.consignments),
    agreement_number: `CSG-${year}-${String(count).padStart(4, "0")}`,
    consignor_id: consignor.id,
    consignor: consignor.name,
    effective_date: data.effective_date || todayIso(),
    default_payout_pct: Number(data.default_payout_pct || 60),
    sale_floor: Boolean(data.sale_floor),
    statement_frequency: data.statement_frequency || "monthly",
    auto_return_days: Number(data.auto_return_days || 180),
    finalised_at: nowIso(),
    notes: String(data.notes || "").trim(),
    tiers: Array.isArray(data.tiers) ? data.tiers : [],
  };
  store.consignments.unshift(consignment);
  createAudit("consignment", consignment.id, "finalised", { consignor_id: consignor.id });
  saveStore();
  return { ok: true, consignment_id: consignment.id, agreement_number: consignment.agreement_number };
}

function loyaltyData(customerId) {
  const customer = getCustomer(customerId);
  if (!customer) throw new Error("Customer not found");
  const transactions = clone(store.loyaltyLedger.filter((entry) => entry.customer_id === Number(customerId)).sort((left, right) => sortByDateDesc(left, right)));
  const balance = transactions.reduce((sum, entry) => sum + Number(entry.delta_points || 0), 0);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 90);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const expiring = transactions
    .filter((entry) => Number(entry.delta_points) > 0 && entry.expires_at && entry.expires_at <= cutoffIso)
    .reduce((sum, entry) => sum + Number(entry.delta_points || 0), 0);
  return {
    ok: true,
    customer: clone(customer),
    balance,
    monetary_equivalent: Number((balance * 0.01).toFixed(2)),
    expiring_90_days: expiring,
    transactions,
  };
}

function redeemLoyalty(customerId, data) {
  const summary = loyaltyData(customerId);
  const points = Math.ceil(Number(data.points || 0) / 10) * 10;
  if (points <= 0 || points > summary.balance) throw new Error("Insufficient loyalty balance");
  store.loyaltyLedger.unshift({
    id: nextId(store.loyaltyLedger),
    customer_id: Number(customerId),
    created_at: nowIso(),
    source: "redeem",
    delta_points: -points,
    note: String(data.reward || "Reward").trim(),
    expires_at: "",
  });
  createAudit("loyalty", customerId, "redeemed", { points });
  saveStore();
  return { ok: true, balance: summary.balance - points };
}

function getBlacklist() {
  return { ok: true, items: clone(store.blacklist).sort((left, right) => sortByDateDesc(left, right, "added_at")) };
}

function addBlacklistEntry(data) {
  if (!String(data.matrix_a || "").trim()) throw new Error("Matrix A is required");
  if (!String(data.reason || "").trim()) throw new Error("Reason is required");
  if (!String(data.source_authority || "").trim()) throw new Error("Source Authority is required");
  const entry = {
    id: nextId(store.blacklist),
    matrix_runout_a: String(data.matrix_a || "").trim(),
    matrix_runout_b: String(data.matrix_b || "").trim(),
    artist_name: String(data.artist_name || "").trim(),
    title: String(data.title || "").trim(),
    reason: String(data.reason || "").trim(),
    source_authority: String(data.source_authority || "").trim(),
    added_at: nowIso(),
  };
  store.blacklist.unshift(entry);
  createAudit("blacklist", entry.id, "added", { matrix: entry.matrix_runout_a });
  saveStore();
  return { ok: true };
}

function getAuditData() {
  return { ok: true, items: clone(store.audits).slice(0, 200) };
}

function getResponseBody(options = {}) {
  if (!options.body) return {};
  if (typeof options.body === "string") return JSON.parse(options.body || "{}");
  return options.body;
}

async function api(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const parsed = new URL(url, "https://frontend.local");
  const params = Object.fromEntries(parsed.searchParams.entries());
  const body = getResponseBody(options);

  try {
    let result = null;

    if (method === "GET" && parsed.pathname === "/api/health") result = { ok: true, db: "frontend-only", timestamp: nowIso() };
    if (method === "GET" && parsed.pathname === "/api/meta") result = buildMeta();
    if (method === "GET" && parsed.pathname === "/api/dashboard") result = buildDashboard();
    if (method === "GET" && parsed.pathname === "/api/records") result = queryRecords(params);
    if (method === "POST" && parsed.pathname === "/api/records") result = saveRecordData(body);
    if (method === "POST" && parsed.pathname === "/api/trade-ins") result = createTradeIn(body);
    if (method === "GET" && parsed.pathname === "/api/wantlists") result = getWantlists();
    if (method === "POST" && parsed.pathname === "/api/wantlists") result = createWantlist(body);
    if (method === "POST" && parsed.pathname === "/api/pos/checkout") result = checkoutData(body);
    if (method === "POST" && parsed.pathname === "/api/preorders") result = createPreorder(body);
    if (method === "GET" && parsed.pathname === "/api/service-tickets") result = getServiceTickets();
    if (method === "POST" && parsed.pathname === "/api/service-tickets") result = createServiceTicket(body);
    if (method === "GET" && parsed.pathname === "/api/consignments") result = getConsignments();
    if (method === "POST" && parsed.pathname === "/api/consignments") result = createConsignment(body);
    if (method === "GET" && parsed.pathname === "/api/blacklist") result = getBlacklist();
    if (method === "POST" && parsed.pathname === "/api/blacklist") result = addBlacklistEntry(body);
    if (method === "GET" && parsed.pathname === "/api/audit") result = getAuditData();

    let match = parsed.pathname.match(/^\/api\/records\/(\d+)$/);
    if (!result && method === "GET" && match) result = recordDetailData(Number(match[1]));

    match = parsed.pathname.match(/^\/api\/records\/(\d+)\/pricing$/);
    if (!result && method === "GET" && match) result = priceAssistData(Number(match[1]));

    match = parsed.pathname.match(/^\/api\/service-tickets\/(\d+)\/status$/);
    if (!result && method === "POST" && match) result = updateServiceStatus(Number(match[1]), body.status);

    match = parsed.pathname.match(/^\/api\/service-tickets\/(\d+)\/contact$/);
    if (!result && method === "POST" && match) result = contactServiceTicket(Number(match[1]));

    match = parsed.pathname.match(/^\/api\/loyalty\/(\d+)$/);
    if (!result && method === "GET" && match) result = loyaltyData(Number(match[1]));

    match = parsed.pathname.match(/^\/api\/loyalty\/(\d+)\/redeem$/);
    if (!result && method === "POST" && match) result = redeemLoyalty(Number(match[1]), body);

    if (!result) {
      throw Object.assign(new Error("That frontend action is not available in static mode"), { ok: false });
    }

    return clone(result);
  } catch (error) {
    throw Object.assign(new Error(error.message || "Request failed"), { ok: false, message: error.message || "Request failed" });
  }
}

function dashboardExportRows() {
  return todayOrders()
    .slice()
    .sort((left, right) => String(left.placed_at).localeCompare(String(right.placed_at)))
    .map((order) => ({
      order_number: order.order_number,
      placed_at: order.placed_at,
      grand_total: order.grand_total,
      status: order.status,
    }));
}

function downloadDashboardExport(format) {
  const rows = dashboardExportRows();
  if (format === "csv") {
    const csv = toCsv([
      ["order_number", "placed_at", "grand_total", "status"],
      ...rows.map((row) => [row.order_number, row.placed_at, row.grand_total, row.status]),
    ]);
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), "daily_sales.csv");
  } else {
    const lines = rows.length
      ? rows.map((row) => `${row.order_number}  ${row.placed_at}  ${money(row.grand_total)}  ${row.status.toUpperCase()}`)
      : ["No paid orders were recorded for this day."];
    downloadBlob(createPdfBlob("Vintage Vinyl - Daily Sales", lines), "daily_sales.pdf");
  }
  toast(`Dashboard ${format.toUpperCase()} download started`);
}

function downloadCatalogueExport() {
  const data = queryRecords({ sort: "year_desc" });
  const csv = toCsv([
    ["artist", "title", "label", "catalogue_number", "country_code", "year", "format", "rpm", "media_grade", "asking_price", "stock"],
    ...data.items.map((item) => [
      item.artist,
      item.title,
      item.label,
      item.catalogue_number,
      item.country_code,
      item.year,
      item.format,
      item.rpm,
      item.media_grade,
      item.price,
      item.stock,
    ]),
  ]);
  downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), "catalogue.csv");
  toast("Catalogue CSV download started");
}

function downloadLoyaltyExport() {
  const customerId = Number($("#loyal-customer")?.value) || 1;
  const data = loyaltyData(customerId);
  const csv = toCsv([
    ["timestamp", "source", "points", "note"],
    ...data.transactions.map((item) => [item.created_at, item.source, item.delta_points, item.note || ""]),
  ]);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "loyalty.csv");
  toast("Loyalty CSV download started");
}

function setReceiptDock(order, receipt = {}) {
  const numberEl = $("#receipt-order-number");
  const metaEl = $("#receipt-order-meta");
  const pdfLink = $("#receipt-pdf-link");
  const thermalLink = $("#receipt-thermal-link");

  if (!numberEl || !metaEl || !pdfLink || !thermalLink || !order?.id) return;

  numberEl.textContent = `${order.order_number} ready`;
  metaEl.textContent = receipt?.email?.queued
    ? `Total ${money(order.grand_total)}. PDF and thermal files are ready, and the demo email queue targets ${receipt.email.address}.`
    : `Total ${money(order.grand_total)}. PDF and thermal files are ready for download.`;

  pdfLink.href = receipt.pdf_url || "#";
  pdfLink.download = `${order.order_number}.pdf`;
  pdfLink.setAttribute("aria-disabled", receipt.pdf_url ? "false" : "true");
  pdfLink.classList.toggle("is-disabled", !receipt.pdf_url);

  thermalLink.href = receipt.thermal_url || "#";
  thermalLink.download = `${order.order_number}.escpos`;
  thermalLink.setAttribute("aria-disabled", receipt.thermal_url ? "false" : "true");
  thermalLink.classList.toggle("is-disabled", !receipt.thermal_url);
}

function clearReceiptDock() {
  const numberEl = $("#receipt-order-number");
  const metaEl = $("#receipt-order-meta");
  const pdfLink = $("#receipt-pdf-link");
  const thermalLink = $("#receipt-thermal-link");

  if (numberEl) numberEl.textContent = "No completed sale yet";
  if (metaEl) metaEl.textContent = "Complete a checkout and the PDF receipt download will appear here.";

  [pdfLink, thermalLink].forEach((link) => {
    if (!link) return;
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.classList.add("is-disabled");
  });
}

function syncPrimaryTender(total) {
  const rows = [...$("#tender-lines").children];
  if (rows.length !== 1) return;
  const input = rows[0].querySelector("input");
  if (!input) return;
  const currentValue = Number(input.value || 0);
  if (!input.dataset.manual || currentValue === 0) {
    input.value = total.toFixed(2);
  }
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  const activeView = $(`#view-${name}`);
  activeView?.classList.add("active");
  $$(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.view === name));

  const title = {
    dashboard: "Daily Sales Dashboard",
    records: "Catalogue and Listing",
    tradeins: "Trade-In Intake",
    wantlists: "Customer Wantlists",
    pos: "POS Checkout",
    preorders: "Pre-orders",
    service: "Turntable Service Queue",
    consignment: "Consignment Agreements",
    loyalty: "Loyalty Points",
    search: "Customer Search",
    import: "CSV Import and Export",
    audit: "Audit and Counterfeit Blacklist",
  }[name];

  if ($("#page-title")) $("#page-title").textContent = title || "Vintage Vinyl";

  // Avoid hash-based scrolling because a single-page dashboard can be much taller than the viewport.
  // Updating the hash here can auto-jump the page unexpectedly while the user is navigating long forms.
  const url = new URL(window.location.href);
  url.searchParams.set("view", name);
  url.hash = "";
  window.history.replaceState({}, "", url);

  // Keep the main view at the top and move focus to the section for keyboard users.
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  activeView?.setAttribute("tabindex", "-1");
  activeView?.focus({ preventScroll: true });

  loadView(name);
}

function loadView(name) {
  const actions = {
    dashboard: loadDashboard,
    records: () => loadMeta().then(loadRecords),
    tradeins: async () => {
      await loadMeta();
      if (!$("#trade-rows").children.length) addTradeRow();
    },
    wantlists: async () => {
      await loadMeta();
      await loadWantlists();
    },
    pos: async () => {
      await loadMeta();
      await searchPOS();
    },
    preorders: async () => {
      await loadMeta();
      await loadPreorders();
    },
    service: async () => {
      await loadMeta();
      await loadService();
    },
    consignment: async () => {
      await loadMeta();
      await loadConsignments();
    },
    loyalty: async () => {
      await loadMeta();
      await loadLoyalty();
    },
    search: loadCustomerSearch,
    import: () => {},
    audit: async () => {
      await loadAudit();
      await loadBlacklist();
    },
  };

  const action = actions[name] || (() => {});
  Promise.resolve(action()).catch((error) => toast(error.message, true));
}

$$(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

bindWheelScroll();

function scrollToId(id) {
  $(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadHealth() {
  // Keep the app UI clean by avoiding dummy health banners or demo labels.
  // A real backend would replace this with a genuine system check later.
  return;
}

async function loadMeta() {
  const data = await api("/api/meta");
  window.meta = data;

  if ($("#dashboard-date")) {
    $("#dashboard-date").textContent = new Date().toLocaleDateString();
  }

  const placeholders = {
    "#t-customer": "Select...",
    "#w-customer": "Select...",
    "#pos-customer": "Walk-in",
    "#po-customer": "Select...",
    "#s-customer": "Select...",
    "#loyal-customer": "Select...",
    "#c-consignor": "Select...",
  };

  const fill = (selector, items, labelKey = "display_name") => {
    const el = $(selector);
    if (!el) return;
    const oldValue = el.value;
    const placeholder = placeholders[selector] || "Select...";
    el.innerHTML = `<option value="">${placeholder}</option>` +
      items.map((item) => `<option value="${item.id}">${esc(item[labelKey] || item.name)}</option>`).join("");
    if ([...el.options].some((option) => option.value === oldValue)) {
      el.value = oldValue;
    }
  };

  fill("#t-customer", data.customers);
  fill("#w-customer", data.customers);
  fill("#pos-customer", data.customers);
  fill("#po-customer", data.customers);
  fill("#s-customer", data.customers);
  fill("#loyal-customer", data.customers);
  fill("#c-consignor", data.consignors, "name");

  if ($("#artist-list")) {
    $("#artist-list").innerHTML = data.artists.map((artist) => `<option value="${esc(artist.name)}">`).join("");
  }
  if ($("#label-list")) {
    $("#label-list").innerHTML = data.labels.map((label) => `<option value="${esc(label.name)}">`).join("");
  }

  return data;
}

async function loadDashboard() {
  try {
    const data = await api("/api/dashboard");
    const kpis = [
      ["Sales (gross)", money(data.kpi.gross)],
      ["Sales (net)", money(data.kpi.net)],
      ["Transactions", data.kpi.transactions],
      ["Avg basket", money(data.kpi.avg_basket)],
      ["New customers", data.kpi.new_customers],
      ["Wantlist matches", data.kpi.wantlist_matches],
      ["Pre-orders", data.kpi.preorders_received],
    ];

    $("#kpis").innerHTML = kpis
      .map(([label, value]) => `<div class="kpi"><small>${label}</small><strong>${value}</strong><em>live</em></div>`)
      .join("");

    const hourly = data.hourly.length ? data.hourly : [...Array(8)].map((_, index) => ({ h: String(index).padStart(2, "0"), total: 0 }));
    const hourlyMax = Math.max(...hourly.map((row) => Number(row.total)), 1);
    $("#hourly-chart").innerHTML = hourly
      .map(
        (row) =>
          `<div class="bar" title="${row.h}:00 ${money(row.total)}"><span style="height:${Math.max(6, (Number(row.total) / hourlyMax) * 200)}px"></span><small>${row.h}</small></div>`
      )
      .join("");

    const genres = data.genre.length ? data.genre : [{ genre: "No sales", total: 0 }];
    const genreMax = Math.max(...genres.map((row) => Number(row.total)), 1);
    $("#genre-chart").innerHTML = genres
      .map(
        (row) =>
          `<div class="donut-line"><span>${esc(row.genre)}</span><div class="progress"><span style="width:${Math.max(1, (Number(row.total) / genreMax) * 100)}%"></span></div><strong>${money(row.total)}</strong></div>`
      )
      .join("");

    $("#top-items tbody").innerHTML =
      data.top_items
        .map(
          (row) =>
            `<tr onclick="showRecord(${row.inventory_id})"><td>${esc(row.artist)}</td><td>${esc(row.title)}</td><td>${row.qty}</td><td>${money(row.total)}</td></tr>`
        )
        .join("") || '<tr><td colspan="4" class="muted">No sales today yet.</td></tr>';

    $("#low-stock tbody").innerHTML =
      data.low_stock
        .map(
          (row) =>
            `<tr><td>${esc(row.artist)} - ${esc(row.title)}</td><td>${esc(row.bin_code)}</td><td>${money(row.asking_price)}</td></tr>`
        )
        .join("") || '<tr><td colspan="3" class="muted">No low-stock alerts.</td></tr>';

    $("#payouts tbody").innerHTML =
      data.payouts_due
        .map(
          (row) =>
            `<tr><td>${esc(row.agreement_number)}</td><td>${esc(row.consignor)}</td><td>${esc(row.sale_date)}</td><td>${money(row.payout)}</td></tr>`
        )
        .join("") || '<tr><td colspan="4" class="muted">No payouts due.</td></tr>';
  } catch (error) {
    toast(error.message, true);
  }
}

function defaultRPM() {
  const format = $("#r-format").value;
  const value = format === "7in" || format === "10in" || format === "12in_maxi" ? "45" : "33";
  document.querySelector(`input[name="rpm"][value="${value}"]`).checked = true;
}

function setDecade() {
  const year = Number.parseInt($("#r-year").value || "0", 10);
  $("#r-decade").value = year ? `${Math.floor(year / 10) * 10}s` : "";
}

function gradeDescription() {
  const grade = $("#r-media").value;
  $("#grade-explain").textContent = `${grade}: ${window.meta?.grade_defs?.[grade] || ""}`;
}

async function checkMatrix() {
  const sideA = $("#r-ma").value;
  const sideB = $("#r-mb").value;
  const banner = $("#duplicate-banner");

  if (!sideA && !sideB) {
    banner.classList.add("hidden");
    return;
  }

  try {
    const query = new URLSearchParams({ q: sideA || sideB });
    const data = await api(`/api/records?${query}`);
    const hit = data.items.find(Boolean);
    if (!hit) {
      banner.classList.add("hidden");
      return;
    }

    banner.textContent = `Possible duplicate pressing - ${hit.artist} / ${hit.title}. Save is still allowed.`;
    banner.classList.remove("hidden");
  } catch (error) {
    banner.classList.add("hidden");
  }
}

async function loadRecords() {
  try {
    const params = new URLSearchParams({
      q: $("#catalogue-search").value,
      grade: $("#filter-grade").value,
      country: $("#filter-country").value,
      format: $("#filter-format").value,
      in_stock: $("#filter-stock").checked ? "1" : "",
    });

    const data = await api(`/api/records?${params}`);
    $("#record-list").innerHTML =
      data.items
        .map(
          (record) => `
            <article class="record-card">
              <div class="meta">
                <span>${record.year} - ${esc(record.country_code)} - ${FORMAT_LABELS[record.format] || record.format}</span>
                <span>${record.media_grade || "-"}</span>
              </div>
              <h3>${esc(record.artist)} - ${esc(record.title)}</h3>
              <p>${esc(record.label)} - ${esc(record.catalogue_number)} - ${esc(record.genres || "")}</p>
              <div class="meta">
                <span>${record.stock} in stock</span>
                <strong>${money(record.price)}</strong>
              </div>
              <div class="record-actions">
                <button class="btn secondary" onclick="showRecord(${record.id})">View</button>
                ${record.stock > 0 ? `<button class="btn primary" onclick="addToCart(${record.id})">Add to cart</button>` : ""}
                <button class="btn secondary" onclick="priceAssist(${record.id})">Pricing</button>
              </div>
            </article>
          `
        )
        .join("") || '<div class="rule-callout">No results. Try relaxing the most restrictive filter.</div>';
  } catch (error) {
    toast(error.message, true);
  }
}

async function saveRecord(event) {
  event.preventDefault();
  try {
    const artist = $("#r-artist").value.trim();
    const label = $("#r-label").value.trim();
    const media = $("#r-media").value;
    const hasInnerSleeve = $("#r-inner").checked;
    const photoFiles = $("#r-photos").files;

    if (media === "NM" && !hasInnerSleeve && !window.confirm("NM without the original inner sleeve will be downgraded to VG+. Continue?")) {
      return;
    }
    if (photoFiles.length > 6) throw new Error("Up to 6 cover photos are allowed");

    const photoPaths = await uploadFiles(photoFiles);
    await api("/api/records", {
      method: "POST",
      body: JSON.stringify({
        artist_name: artist,
        title: $("#r-title").value,
        label_name: label,
        create_artist: true,
        create_label: true,
        catalogue_number: $("#r-cat").value,
        country_code: $("#r-country").value,
        year: Number($("#r-year").value),
        format: $("#r-format").value,
        rpm: Number(document.querySelector('input[name="rpm"]:checked').value),
        mono_stereo: $("#r-mono").value,
        matrix_runout_a: $("#r-ma").value,
        matrix_runout_b: $("#r-mb").value,
        media_grade: media,
        sleeve_grade: $("#r-sleeve").value,
        has_original_inner_sleeve: hasInnerSleeve,
        asking_price: $("#r-price").value,
        bin_code: $("#r-bin").value,
        negotiable: $("#r-neg").checked,
        genres: $("#r-genres").value.split(",").map((value) => value.trim()).filter(Boolean),
        inserts: $("#r-inserts").value.split(";").map((value) => value.trim()).filter(Boolean),
        photo_paths: photoPaths,
        notes: $("#r-notes").value,
      }),
    });

    toast("Listing saved successfully");
    $("#record-form").reset();
    setDecade();
    defaultRPM();
    gradeDescription();
    await loadMeta();
    await loadRecords();
    await loadDashboard();
  } catch (error) {
    toast(error.message, true);
  }
}

async function priceAssist(id) {
  try {
    const data = await api(`/api/records/${id}/pricing`);
    toast(`Pricing range ${money(data.low)} to ${money(data.high)} - ${data.confidence}`);
  } catch (error) {
    toast(error.message, true);
  }
}

async function showRecord(id) {
  try {
    const data = await api(`/api/records/${id}`);
    const record = data.record;
    window.alert(
      `${record.artist} - ${record.title}\n${record.year} - ${FORMAT_LABELS[record.format] || record.format}\nInventory: ${data.inventory.length}\nGenres: ${record.genres || "-"}`
    );
  } catch (error) {
    toast(error.message, true);
  }
}

function addTradeRow() {
  tradeRows += 1;
  const row = document.createElement("div");
  row.className = "line-row";
  row.dataset.idx = String(tradeRows);
  row.innerHTML = `
    <div><label class="muted">Pressing ID<input class="tr-pressing" type="number" required></label></div>
    <div><label class="muted">Media<select class="tr-media"><option>M</option><option>NM</option><option>VG+</option><option selected>VG</option><option>G+</option><option>G</option><option>F</option><option>P</option></select></label></div>
    <div><label class="muted">Sleeve<select class="tr-sleeve"><option>M</option><option>NM</option><option>VG+</option><option selected>VG</option><option>G+</option><option>G</option><option>F</option><option>P</option></select></label></div>
    <div><label class="muted">Condition Photos<input class="tr-photos-file" type="file" accept="image/jpeg,image/png" multiple required></label></div>
    <button type="button" class="btn secondary" onclick="this.closest('.line-row').remove()">Remove</button>
  `;
  $("#trade-rows").appendChild(row);
}

async function uploadFiles(fileList) {
  const files = [...fileList];
  if (files.length > 6) throw new Error("Maximum 6 images per listing");
  if (files.some((file) => file.size > 8 * 1024 * 1024)) throw new Error("Each image must be 8 MB or smaller");
  if (files.some((file) => !["image/jpeg", "image/png"].includes(file.type))) throw new Error("Only JPG and PNG files are allowed");
  return files.map((file) => `${Date.now()}_${file.name}`);
}

async function saveTradeIn(event) {
  event.preventDefault();
  try {
    const rows = [];
    for (const row of [...$("#trade-rows").children]) {
      const files = row.querySelector(".tr-photos-file").files;
      if (!files.length) throw new Error("Each trade-in row requires at least one condition photo");
      const photos = await uploadFiles(files);
      rows.push({
        pressing_id: Number(row.querySelector(".tr-pressing").value),
        media_grade: row.querySelector(".tr-media").value,
        sleeve_grade: row.querySelector(".tr-sleeve").value,
        photos,
      });
    }

    if (!rows.length) throw new Error("Add at least one record");

    const data = await api("/api/trade-ins", {
      method: "POST",
      body: JSON.stringify({
        customer_id: Number($("#t-customer").value) || null,
        offer_mode: document.querySelector('input[name="offer_mode"]:checked').value,
        id_type: $("#t-idtype").value,
        id_number: $("#t-idnum").value,
        signature: $("#t-sign").value,
        customer_accepts: $("#t-accept").checked,
        rows,
        notes: $("#t-notes").value,
      }),
    });

    $("#trade-total").textContent = money(data.offer_total);
    toast(`Trade-in saved - offer ${money(data.offer_total)}`);
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadWantlists() {
  try {
    const data = await api("/api/wantlists");
    $("#wantlist-table tbody").innerHTML = data.items
      .map(
        (item) =>
          `<tr><td>${esc(item.display_name)}</td><td>${esc(item.artist_query || "")}</td><td>${esc(item.title_query || "")}</td><td>${item.min_media_grade}</td><td>${item.max_price ? money(item.max_price) : "-"}</td><td>${item.is_active ? "Yes" : "No"}</td><td>${item.priority}</td></tr>`
      )
      .join("");
  } catch (error) {
    toast(error.message, true);
  }
}

async function saveWantlist(event) {
  event.preventDefault();
  try {
    await api("/api/wantlists", {
      method: "POST",
      body: JSON.stringify({
        customer_id: Number($("#w-customer").value),
        artist: $("#w-artist").value,
        title: $("#w-title").value,
        label: $("#w-label").value,
        catalogue: $("#w-cat").value,
        year_from: $("#w-yf").value || null,
        year_to: $("#w-yt").value || null,
        max_price: $("#w-price").value || null,
        min_media_grade: $("#w-grade").value,
        notify_email: $("#w-email").checked,
        notify_sms: $("#w-sms").checked,
        notify_push: $("#w-push").checked,
        priority: Number($("#w-priority").value),
        active: true,
        notes: $("#w-notes").value,
      }),
    });

    toast("Wantlist created");
    await loadWantlists();
  } catch (error) {
    toast(error.message, true);
  }
}

async function searchPOS() {
  try {
    const data = await api(`/api/records?q=${encodeURIComponent($("#pos-search").value || "")}`);
    $("#pos-results").innerHTML =
      data.items
        .filter((item) => item.stock > 0)
        .slice(0, 12)
        .map(
          (record) => `
            <article class="record-card">
              <h3>${esc(record.artist)} - ${esc(record.title)}</h3>
              <p>${record.year} - ${record.media_grade || "-"}</p>
              <div class="meta">
                <strong>${money(record.price)}</strong>
                <button class="btn primary" onclick="addFirstInventory(${record.id})">Add</button>
              </div>
            </article>
          `
        )
        .join("") || '<div class="rule-callout">No available inventory found.</div>';
  } catch (error) {
    toast(error.message, true);
  }
}

async function addFirstInventory(recordId) {
  try {
    const data = await api(`/api/records/${recordId}`);
    const inventory = data.inventory.find((item) => ["in_stock", "reserved", "consignment"].includes(item.status));
    if (!inventory) throw new Error("No available copy");
    if (cart.some((item) => item.inventory_id === inventory.id)) {
      toast("Item already in cart");
      return;
    }

    cart.push({
      inventory_id: inventory.id,
      title: `${data.record.artist} - ${data.record.title}`,
      price: Number(inventory.asking_price),
      media_grade: inventory.media_grade,
    });

    renderCart();
  } catch (error) {
    toast(error.message, true);
  }
}

function addToCart(recordId) {
  addFirstInventory(recordId);
}

function removeCartLine(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const countEl = $("#cart-count");
  const linesEl = $("#cart-lines");
  const totalEl = $("#cart-total");

  if (countEl) countEl.textContent = `${cart.length} items`;
  if (linesEl) {
    linesEl.innerHTML =
      cart
        .map(
          (item, index) => `
            <div class="line-row">
              <div>
                <strong>${esc(item.title)}</strong>
                <div class="muted">${esc(item.media_grade)}</div>
              </div>
              <div>${money(item.price)}</div>
              <div><input type="number" min="0" max="100" value="${item.discount || 0}" onchange="cart[${index}].discount=Number(this.value)||0;renderCart()"></div>
              <div class="muted">Line discount %</div>
              <button class="btn secondary" type="button" onclick="removeCartLine(${index})">Remove</button>
            </div>
          `
        )
        .join("") || '<div class="rule-callout">Cart is empty.</div>';
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * (1 - (item.discount || 0) / 100), 0);
  const orderDiscount = Number($("#pos-discount")?.value || 0);
  const shipping = Number($("#pos-shipping")?.value || 0);
  const total = subtotal * (1 - orderDiscount / 100) + shipping;

  if (totalEl) totalEl.textContent = money(total);
  syncPrimaryTender(total);
}

function addTender() {
  const row = document.createElement("div");
  row.className = "tender-row";
  row.innerHTML = `
    <select>
      <option>cash</option>
      <option>card</option>
      <option>voucher</option>
      <option>store_credit</option>
    </select>
    <input type="number" step="0.01" value="0.00" oninput="this.dataset.manual='true'">
    <button type="button" class="btn secondary" onclick="this.parentElement.remove(); renderCart()">Remove</button>
  `;
  $("#tender-lines").appendChild(row);
  renderCart();
}

function collectTenders() {
  return [...$("#tender-lines").children].map((row) => {
    const type = row.querySelector("select").value;
    return {
      type,
      amount: row.querySelector("input").value,
      card_token: type === "card" ? `tok_demo_${Date.now()}` : undefined,
      voucher_code: type === "voucher" ? "DEMO" : undefined,
      store_credit_txn: type === "store_credit" ? `SC_${Date.now()}` : undefined,
    };
  });
}

async function checkout() {
  try {
    if (!cart.length) throw new Error("Cart is empty");

    const data = await api("/api/pos/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer_id: Number($("#pos-customer").value) || null,
        items: cart.map((item) => ({
          inventory_id: item.inventory_id,
          qty: 1,
          line_discount_pct: item.discount || 0,
        })),
        order_discount_pct: Number($("#pos-discount").value),
        shipping_total: $("#pos-shipping").value,
        tenders: collectTenders(),
        email_receipt: $("#pos-email").checked,
      }),
    });

    setReceiptDock(data.order, data.receipt);
    if (data.receipt?.pdf_url) {
      downloadFile(data.receipt.pdf_url, `${data.order.order_number}.pdf`);
    }
    toast(`Paid ${data.order.order_number} - ${money(data.order.grand_total)}. Receipt download started.`);

    cart = [];
    $("#tender-lines").innerHTML = "";
    addTender();
    renderCart();
    await searchPOS();
    await loadDashboard();
    await loadHealth();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadPreorderRecords() {
  try {
    const data = await api("/api/records");
    const preorders = data.items.filter((item) => item.pre_order);
    $("#po-record").innerHTML =
      preorders.map((record) => `<option value="${record.id}">${esc(record.artist)} - ${esc(record.title)} - ${record.year}</option>`).join("") ||
      '<option value="">No active pre-orders</option>';
  } catch (error) {
    // This list is supplementary, so keep the UI responsive if the call fails.
  }
}

async function loadPreorders() {
  try {
    const data = await api("/api/records");
    const preorders = data.items.filter((item) => item.pre_order);
    $("#po-record").innerHTML =
      preorders.map((record) => `<option value="${record.id}">${esc(record.artist)} - ${esc(record.title)} - ${record.year}</option>`).join("") ||
      '<option value="">No active pre-orders</option>';
    $("#release-list").innerHTML =
      preorders
        .map(
          (item) =>
            `<div class="timeline-item"><strong>${esc(item.title)}</strong><div class="muted">Release ${item.release_date || "-"}</div></div>`
        )
        .join("") || '<div class="rule-callout">No active pre-orders.</div>';
  } catch (error) {
    toast(error.message, true);
  }
}

async function savePreorder(event) {
  event.preventDefault();
  try {
    const data = await api("/api/preorders", {
      method: "POST",
      body: JSON.stringify({
        record_id: Number($("#po-record").value),
        customer_id: Number($("#po-customer").value),
        quantity: Number($("#po-qty").value),
        deposit_amount: $("#po-deposit").value,
        deposit_tender: $("#po-tender").value,
        ship_address: $("#po-address").value,
        notes: $("#po-notes").value,
      }),
    });
    toast(`Pre-order created - release ${data.release_date}`);
    await loadPreorders();
    await loadDashboard();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadService() {
  try {
    const data = await api("/api/service-tickets");
    $("#service-list").innerHTML =
      data.items
        .map(
          (item) => `
            <div class="timeline-item">
              <div class="panel-head">
                <strong>${esc(item.ticket_number)} - ${esc(item.brand)} ${esc(item.model)}</strong>
                <span class="pill">${item.status}</span>
              </div>
              <div class="muted">Quote ${money(item.current_quote)} / limit ${money(item.authorised_limit)} - contacts ${item.contact_attempts}</div>
              <div class="record-actions" style="margin-top: 10px;">
                <button class="btn secondary" onclick="serviceAction(${item.id}, 'diagnosing')">Start diagnosis</button>
                <button class="btn secondary" onclick="serviceAction(${item.id}, 'ready')">Ready</button>
                <button class="btn secondary" onclick="contactTicket(${item.id})">Log contact</button>
              </div>
            </div>
          `
        )
        .join("") || '<div class="rule-callout">No service tickets.</div>';
  } catch (error) {
    toast(error.message, true);
  }
}

async function createTicket(event) {
  event.preventDefault();
  try {
    const cosmeticDamage = $("#sc-cosmetic").checked;
    const photoFiles = $("#s-photos").files;
    if (cosmeticDamage && !photoFiles.length) {
      throw new Error("Cosmetic damage requires at least one photo");
    }

    const photos = await uploadFiles(photoFiles);
    const data = await api("/api/service-tickets", {
      method: "POST",
      body: JSON.stringify({
        customer_id: Number($("#s-customer").value),
        equipment_type: $("#s-equipment").value,
        brand: $("#s-brand").value,
        model: $("#s-model").value,
        serial_number: $("#s-serial").value,
        authorised_limit: $("#s-limit").value,
        symptoms: $("#s-symptoms").value,
        photos,
        checklist: {
          powers_on: $("#sc-power").checked,
          platter_spins: $("#sc-platter").checked,
          arm_balanced: $("#sc-arm").checked,
          stylus_inspected: $("#sc-stylus").checked,
          cosmetic_damage_noted: cosmeticDamage,
        },
        notes: $("#s-notes").value,
      }),
    });

    toast(`Created ${data.ticket_number}`);
    event.target.reset();
    await loadService();
  } catch (error) {
    toast(error.message, true);
  }
}

async function serviceAction(id, status) {
  if (!window.confirm(`Change ticket status to ${status}?`)) return;
  try {
    await api(`/api/service-tickets/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    await loadService();
  } catch (error) {
    toast(error.message, true);
  }
}

async function contactTicket(id) {
  try {
    await api(`/api/service-tickets/${id}/contact`, { method: "POST" });
    toast("Contact attempt logged");
    await loadService();
  } catch (error) {
    toast(error.message, true);
  }
}

function addTier() {
  const row = document.createElement("div");
  row.className = "tier-row";
  row.innerHTML = '<input placeholder="From"><input placeholder="To"><input placeholder="%">';
  $("#tier-editor").appendChild(row);
}

async function loadConsignments() {
  try {
    const data = await api("/api/consignments");
    $("#cons-table tbody").innerHTML = data.items
      .map(
        (item) =>
          `<tr><td>${esc(item.agreement_number)}</td><td>${esc(item.consignor)}</td><td>${item.default_payout_pct}%</td><td>${item.statement_frequency}</td><td>${item.finalised_at ? "Finalised" : "Draft"}</td></tr>`
      )
      .join("");
  } catch (error) {
    toast(error.message, true);
  }
}

async function saveConsignment(event) {
  event.preventDefault();
  try {
    const tiers = [...$("#tier-editor").children]
      .map((row) => {
        const inputs = row.querySelectorAll("input");
        return {
          from_days: Number(inputs[0].value),
          to_days: inputs[1].value ? Number(inputs[1].value) : null,
          pct: Number(inputs[2].value),
        };
      })
      .filter((tier) => tier.from_days !== 0 || tier.to_days || tier.pct);

    const data = await api("/api/consignments", {
      method: "POST",
      body: JSON.stringify({
        consignor_id: Number($("#c-consignor").value),
        effective_date: $("#c-date").value || new Date().toISOString().slice(0, 10),
        default_payout_pct: Number($("#c-payout").value),
        auto_return_days: Number($("#c-return").value),
        statement_frequency: $("#c-freq").value,
        sale_floor: $("#c-floor").checked,
        signature: $("#c-sign").value,
        tiers,
        notes: $("#c-notes").value,
      }),
    });

    toast(`Agreement ${data.agreement_number} finalised`);
    event.target.reset();
    $("#c-date").value = todayIso();
    $("#tier-editor").innerHTML = '<div class="tier-row"><input placeholder="From" value="0"><input placeholder="To" value="30"><input placeholder="%" value="60"></div>';
    await loadConsignments();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadLoyalty() {
  const customerId = Number($("#loyal-customer").value) || 1;
  try {
    if ($("#loyal-customer") && !$("#loyal-customer").value) $("#loyal-customer").value = String(customerId);
    const data = await api(`/api/loyalty/${customerId}`);
    $("#loyalty-card").innerHTML = `
      <div class="kpi"><small>Current points</small><strong>${data.balance}</strong><em>${money(data.monetary_equivalent)}</em></div>
      <div class="kpi"><small>Tier</small><strong>${esc(data.customer?.tier || "basic")}</strong><em>${data.balance % 1000} progress</em></div>
      <div class="kpi"><small>Expiring in 90 days</small><strong>${data.expiring_90_days}</strong><em>watch list</em></div>
    `;
    $("#loyal-table tbody").innerHTML =
      data.transactions
        .map(
          (item) =>
            `<tr><td>${esc(item.created_at)}</td><td>${esc(item.source)}</td><td class="${item.delta_points >= 0 ? "high" : "danger"}">${item.delta_points}</td><td>${esc(item.note || "")}</td></tr>`
        )
        .join("") || '<tr><td colspan="4">No ledger entries.</td></tr>';
    if ($("#loyal-export")) {
      $("#loyal-export").href = "#";
    }
  } catch (error) {
    toast(error.message, true);
  }
}

async function redeemPoints(event) {
  event.preventDefault();
  try {
    const customerId = Number($("#loyal-customer").value) || 1;
    const points = Number($("#redeem-points").value);
    if (!window.confirm(`Redeem ${points} points?`)) return;

    const data = await api(`/api/loyalty/${customerId}/redeem`, {
      method: "POST",
      body: JSON.stringify({
        points,
        reward: $("#redeem-reward").value,
      }),
    });

    toast(`Redeemed - balance ${data.balance}`);
    await loadLoyalty();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadCustomerSearch() {
  try {
    const params = new URLSearchParams({
      q: $("#search-input")?.value || "",
      grade: $("#s-grade")?.value || "",
      format: $("#s-format")?.value || "",
      country: $("#s-country")?.value || "",
      min_price: $("#s-min")?.value || "",
      max_price: $("#s-max")?.value || "",
      in_stock: $("#s-stock")?.checked ? "1" : "",
    });

    const data = await api(`/api/records?${params}`);
    const state = { view: "search", ...Object.fromEntries(params.entries()) };
    history.replaceState(null, "", `?${new URLSearchParams(state)}`);

    $("#search-results").innerHTML =
      data.items
        .map(
          (record) => `
            <article class="record-card">
              <div class="meta">
                <span>${record.year} - ${esc(record.country_code)}</span>
                <span>${esc(record.media_grade || "-")}</span>
              </div>
              <h3>${esc(record.artist)} - ${esc(record.title)}</h3>
              <p>${esc(record.label)} - ${esc(record.catalogue_number)}</p>
              <div class="meta">
                <strong>${money(record.price)}</strong>
                <span>${record.stock} stock</span>
              </div>
              <div class="record-actions">
                <button class="btn secondary" onclick="showRecord(${record.id})">View</button>
                <button class="btn secondary" onclick='addWantFromResult(${jsq(record.artist)}, ${jsq(record.title)})'>Wantlist</button>
                ${record.stock ? `<button class="btn primary" onclick="addToCart(${record.id})">Add to cart</button>` : ""}
              </div>
            </article>
          `
        )
        .join("") || '<div class="rule-callout">No results. Consider relaxing grade, country, or price.</div>';
  } catch (error) {
    toast(error.message, true);
  }
}

function addWantFromResult(artist, title) {
  showView("wantlists");
  $("#w-artist").value = artist;
  $("#w-title").value = title;
  toast("Wantlist form prefilled");
}

function bindWheelScroll() {
  [$(".sidebar"), $(".main")].filter(Boolean).forEach((element) => {
    element.addEventListener(
      "wheel",
      (event) => {
        const atTop = element.scrollTop <= 0 && event.deltaY < 0;
        const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1 && event.deltaY > 0;
        if (atTop || atBottom) return;
        event.preventDefault();
        element.scrollTop += event.deltaY;
      },
      { passive: false }
    );
  });
}

async function importCsv(event) {
  event.preventDefault();
  const file = $("#csv-file").files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    if (rows.length < 2) throw new Error("CSV file is empty");

    const headers = rows[0].map((header) => header.trim());
    const bodyRows = rows.slice(1);
    const report = {
      total: bodyRows.length,
      imported: 0,
      errors: 0,
      error_breakdown: {},
    };
    const dryRun = $("#dry-run").checked;

    for (const row of bodyRows) {
      const item = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
      try {
        if (!item.artist || !item.title || !item.label || !item.catalogue_number) {
          throw new Error("Missing required fields");
        }
        if (!item.bin_code) throw new Error("Missing bin_code");
        if (!dryRun) {
          saveRecordData({
            artist_name: item.artist,
            title: item.title,
            label_name: item.label,
            catalogue_number: item.catalogue_number,
            country_code: item.country_code || "US",
            year: Number(item.year),
            format: item.format || "12in_lp",
            rpm: Number(item.rpm || 33),
            media_grade: item.media_grade || "VG",
            sleeve_grade: item.sleeve_grade || item.media_grade || "VG",
            asking_price: item.asking_price || 0,
            bin_code: item.bin_code,
            matrix_runout_a: item.matrix_runout_a || "",
            matrix_runout_b: item.matrix_runout_b || "",
            genres: [],
            inserts: [],
            notes: "Imported from CSV",
          });
        }
        report.imported += 1;
      } catch (error) {
        report.errors += 1;
        report.error_breakdown[error.message] = (report.error_breakdown[error.message] || 0) + 1;
      }
    }

    $("#import-report").innerHTML = `
      <div class="rule-callout">
        <strong>Total:</strong> ${report.total}
        <strong>Imported:</strong> ${report.imported}
        <strong>Errors:</strong> ${report.errors}
        <pre>${esc(JSON.stringify(report.error_breakdown, null, 2))}</pre>
      </div>
    `;
    toast(dryRun ? "Dry run completed" : "Import completed");
    await loadMeta();
    await loadRecords();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadBlacklist() {
  try {
    const data = await api("/api/blacklist");
    $("#blacklist-table tbody").innerHTML = data.items
      .map(
        (item) =>
          `<tr><td>${esc(item.matrix_runout_a)} / ${esc(item.matrix_runout_b || "")}</td><td>${esc(item.title || "")}</td><td>${esc(item.reason)}</td><td>${esc(item.added_at)}</td></tr>`
      )
      .join("");
  } catch (error) {
    toast(error.message, true);
  }
}

async function addBlacklist(event) {
  event.preventDefault();
  try {
    await api("/api/blacklist", {
      method: "POST",
      body: JSON.stringify({
        matrix_a: $("#b-a").value,
        matrix_b: $("#b-b").value,
        artist_name: $("#b-artist").value,
        title: $("#b-title").value,
        reason: $("#b-reason").value,
        source_authority: $("#b-source").value,
      }),
    });

    toast("Blacklist entry added");
    event.target.reset();
    await loadBlacklist();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadAudit() {
  try {
    const data = await api("/api/audit");
    $("#audit-table tbody").innerHTML = data.items
      .map(
        (item) =>
          `<tr><td>${esc(item.created_at)}</td><td>${esc(item.entity_type)} #${item.entity_id || ""}</td><td>${esc(item.action)}</td><td>${esc(item.actor || "")}</td><td><code>${esc(item.context || "")}</code></td></tr>`
      )
      .join("");
  } catch (error) {
    toast(error.message, true);
  }
}

const catalogueSearchDebounced = debounced(loadRecords, 250);
const customerSearchDebounced = debounced(loadCustomerSearch, 250);

function handleCatalogueSearch() {
  catalogueSearchDebounced();
}

function handleCustomerSearch() {
  customerSearchDebounced();
}

function startRefreshPolling() {
  window.setInterval(() => {
    if (window.location.hash === "#dashboard" || !window.location.hash) {
      loadDashboard();
      loadHealth();
    }
  }, 20000);
}

function init() {
  clearReceiptDock();
  addTender();
  defaultRPM();
  setDecade();
  gradeDescription();
  loadHealth();

  $("#pos-discount")?.addEventListener("input", renderCart);
  $("#pos-shipping")?.addEventListener("input", renderCart);
  $("#r-media")?.addEventListener("change", gradeDescription);

  const initialParams = new URLSearchParams(window.location.search);
  const initialView = initialParams.get("view") || window.location.hash.replace("#", "") || "dashboard";
  if (initialView === "search") {
    const searchFields = {
      "#search-input": "q",
      "#s-grade": "grade",
      "#s-format": "format",
      "#s-country": "country",
      "#s-min": "min_price",
      "#s-max": "max_price",
    };
    Object.entries(searchFields).forEach(([selector, key]) => {
      const element = $(selector);
      if (element && initialParams.has(key)) element.value = initialParams.get(key);
    });
    if ($("#s-stock")) $("#s-stock").checked = initialParams.get("in_stock") === "1";
  }
  showView(initialView);
  loadMeta().catch((error) => toast(error.message, true));

  window.setInterval(loadHealth, 30000);
  startRefreshPolling();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
