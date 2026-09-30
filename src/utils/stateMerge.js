import { migrateState } from "./storage.js";

const ARRAY_KEYS = [
  "dogs",
  "trainingSessions",
  "trainingLog",
  "routes",
  "fixedTeams",
  "healthEvents",
];

function timestampValue(item) {
  const candidates = [item?.updatedAt, item?.createdAt, item?.date, item?.archivedAt].filter(Boolean);
  const values = candidates.map((value) => new Date(value).getTime()).filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : 0;
}

function mergeObjects(existing, incoming) {
  const existingTime = timestampValue(existing);
  const incomingTime = timestampValue(incoming);
  if (incomingTime >= existingTime) return { ...existing, ...incoming };
  return { ...incoming, ...existing };
}

export function mergeArrayById(base = [], incoming = []) {
  const map = new Map();
  const order = [];

  for (const item of Array.isArray(base) ? base : []) {
    if (!item?.id) continue;
    map.set(item.id, item);
    order.push(item.id);
  }

  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item?.id) continue;
    if (!map.has(item.id)) order.push(item.id);
    map.set(item.id, map.has(item.id) ? mergeObjects(map.get(item.id), item) : item);
  }

  return order.map((id) => map.get(id)).filter(Boolean);
}

function mergeGuides(base = [], incoming = []) {
  const guides = [...(Array.isArray(base) ? base : []), ...(Array.isArray(incoming) ? incoming : [])]
    .map((guide) => String(guide || "").trim())
    .filter(Boolean);
  return Array.from(new Set(guides));
}

function mergeMeta(base = {}, incoming = {}) {
  const latestDate = (a, b) => {
    const aTime = a ? new Date(a).getTime() : 0;
    const bTime = b ? new Date(b).getTime() : 0;
    return bTime > aTime ? b : a;
  };

  return {
    ...(base || {}),
    ...(incoming || {}),
    lastBackupAt: latestDate(base?.lastBackupAt, incoming?.lastBackupAt) || "",
    lastExcelExportAt: latestDate(base?.lastExcelExportAt, incoming?.lastExcelExportAt) || "",
    lastBackupSessionCount: Math.max(Number(base?.lastBackupSessionCount || 0), Number(incoming?.lastBackupSessionCount || 0)),
    lastQuickTraining: incoming?.lastQuickTraining || base?.lastQuickTraining || null,
  };
}

export function mergeStates(baseState, incomingState) {
  const base = migrateState(baseState || {});
  const incoming = migrateState(incomingState || {});
  const merged = { ...base, dataVersion: Math.max(Number(base.dataVersion || 0), Number(incoming.dataVersion || 0)) };

  for (const key of ARRAY_KEYS) {
    merged[key] = mergeArrayById(base[key], incoming[key]);
  }

  merged.guides = mergeGuides(base.guides, incoming.guides);
  merged.meta = mergeMeta(base.meta, incoming.meta);
  return migrateState(merged);
}
