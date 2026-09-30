import { migrateState } from "./storage.js";

const ARRAY_KEYS = [
  "dogs",
  "trainingSessions",
  "trainingLog",
  "routes",
  "fixedTeams",
  "healthEvents",
];

const DELETE_LIST_KEYS = [
  "deletedTrainingSessionIds",
  "deletedTrainingLogIds",
  "deletedHealthEventIds",
  "deletedFixedTeamIds",
  "deletedRouteIds",
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

function uniqueStrings(...lists) {
  return Array.from(new Set(lists.flatMap((list) => Array.isArray(list) ? list : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)));
}

function mergeGuides(base = [], incoming = []) {
  return uniqueStrings(base, incoming);
}

function deletedIds(meta = {}) {
  return {
    trainingSessions: new Set(meta.deletedTrainingSessionIds || []),
    trainingLog: new Set(meta.deletedTrainingLogIds || []),
    healthEvents: new Set(meta.deletedHealthEventIds || []),
    fixedTeams: new Set(meta.deletedFixedTeamIds || []),
    routes: new Set(meta.deletedRouteIds || []),
  };
}

function applyDeleteMarkers(state, markers) {
  const clean = { ...state };
  clean.trainingSessions = (clean.trainingSessions || []).filter((session) => !markers.trainingSessions.has(session.id));
  clean.trainingLog = (clean.trainingLog || []).filter((log) => !markers.trainingLog.has(log.id) && !markers.trainingSessions.has(log.trainingId));
  clean.healthEvents = (clean.healthEvents || []).filter((event) => !markers.healthEvents.has(event.id));
  clean.fixedTeams = (clean.fixedTeams || []).filter((team) => !markers.fixedTeams.has(team.id));
  clean.routes = (clean.routes || []).filter((route) => !markers.routes.has(route.id));
  return clean;
}

function mergeMeta(base = {}, incoming = {}) {
  const latestDate = (a, b) => {
    const aTime = a ? new Date(a).getTime() : 0;
    const bTime = b ? new Date(b).getTime() : 0;
    return bTime > aTime ? b : a;
  };

  const result = {
    ...(base || {}),
    ...(incoming || {}),
    lastBackupAt: latestDate(base?.lastBackupAt, incoming?.lastBackupAt) || "",
    lastExcelExportAt: latestDate(base?.lastExcelExportAt, incoming?.lastExcelExportAt) || "",
    lastBackupSessionCount: Math.max(Number(base?.lastBackupSessionCount || 0), Number(incoming?.lastBackupSessionCount || 0)),
    lastQuickTraining: incoming?.lastQuickTraining || base?.lastQuickTraining || null,
  };

  for (const key of DELETE_LIST_KEYS) {
    result[key] = uniqueStrings(base?.[key], incoming?.[key]);
  }

  return result;
}

export function mergeStates(baseState, incomingState) {
  const baseRaw = migrateState(baseState || {});
  const incomingRaw = migrateState(incomingState || {});
  const meta = mergeMeta(baseRaw.meta, incomingRaw.meta);
  const markers = deletedIds(meta);
  const base = applyDeleteMarkers(baseRaw, markers);
  const incoming = applyDeleteMarkers(incomingRaw, markers);
  const merged = { ...base, dataVersion: Math.max(Number(base.dataVersion || 0), Number(incoming.dataVersion || 0)) };

  for (const key of ARRAY_KEYS) {
    merged[key] = mergeArrayById(base[key], incoming[key]);
  }

  merged.guides = mergeGuides(base.guides, incoming.guides);
  merged.meta = meta;
  return migrateState(applyDeleteMarkers(merged, markers));
}
