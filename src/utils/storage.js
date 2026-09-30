import { initialDogs } from "../data/initialDogs.js";
import { DEFAULT_GUIDES, INITIAL_ROUTES } from "../data/options.js";

export const STORAGE_KEY = "dog-training-tracker-data";
export const LEGACY_STORAGE_KEYS = ["dog-training-tracker-v1"];
export const DATA_VERSION = 16;

export const defaultState = {
  dataVersion: DATA_VERSION,
  dogs: initialDogs,
  trainingSessions: [],
  trainingLog: [],
  routes: INITIAL_ROUTES,
  guides: DEFAULT_GUIDES,
  fixedTeams: [],
  healthEvents: [],
  meta: { lastBackupAt: "", lastExcelExportAt: "", lastBackupSessionCount: 0, lastQuickTraining: null },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeDog(dog, index) {
  const name = String(dog?.name || dog?.dogName || `Dog ${index + 1}`).trim().toLocaleUpperCase();
  return {
    id: dog?.id || `dog-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    name,
    sex: dog?.sex === "Female" || dog?.sex === "Male" ? dog.sex : dog?.sex === "f" ? "Female" : dog?.sex === "m" ? "Male" : "Unknown",
    dateOfBirth: dog?.dateOfBirth || "",
    mainPosition: dog?.mainPosition || "Team",
    alternativePosition: dog?.alternativePosition || "",
    trainingStatus: dog?.trainingStatus || "Active",
    healthStatus: dog?.healthStatus || "Active",
    form: Number(dog?.form || 3),
    lastHeat: dog?.lastHeat || "",
    notes: dog?.notes || "",
    archived: Boolean(dog?.archived),
    archivedAt: dog?.archivedAt || "",
    createdAt: dog?.createdAt || "",
    updatedAt: dog?.updatedAt || "",
  };
}

function normalizeFixedTeam(team, index) {
  const name = String(team?.name || `Team ${index + 1}`).trim();
  const members = cleanArray(team?.members, [])
    .map((member) => ({
      dogId: member?.dogId || member?.id || "",
      position: member?.position || "Team",
    }))
    .filter((member) => member.dogId);
  return {
    id: team?.id || `team-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    name,
    category: team?.category || "Custom",
    notes: team?.notes || team?.note || "",
    members,
    createdAt: team?.createdAt || "",
    updatedAt: team?.updatedAt || "",
  };
}

function normalizeHealthEvent(event, index) {
  const dogId = event?.dogId || "";
  return {
    id: event?.id || `health-${Date.now()}-${index}`,
    dogId,
    dogName: String(event?.dogName || "").trim().toLocaleUpperCase(),
    sex: event?.sex || "",
    date: event?.date || new Date().toISOString().slice(0, 10),
    type: event?.type || "Health Note",
    status: event?.status || "Watch",
    note: event?.note || "",
    nextCheck: event?.nextCheck || "",
    applyToDogProfile: Boolean(event?.applyToDogProfile),
    createdAt: event?.createdAt || new Date().toISOString(),
    updatedAt: event?.updatedAt || "",
  };
}

function normalizeSession(session) {
  const id = session?.id || session?.trainingId || `TR-${Date.now()}`;
  return {
    id,
    date: session?.date || new Date().toISOString().slice(0, 10),
    route: session?.route || "Open distance",
    distance: Number(session?.distance || 0),
    trainingType: session?.trainingType || "ATV",
    guide: session?.guide || "",
    fixedTeamId: session?.fixedTeamId || "",
    fixedTeamName: session?.fixedTeamName || "",
    numberOfDogs: Number(session?.numberOfDogs || 0),
    generalNote: session?.generalNote || "",
    createdAt: session?.createdAt || new Date().toISOString(),
    updatedAt: session?.updatedAt || "",
  };
}

function normalizeLog(log, index) {
  const trainingId = log?.trainingId || log?.id?.split("-").slice(0, 2).join("-") || `TR-${Date.now()}`;
  return {
    id: log?.id || `${trainingId}-${log?.dogId || index}`,
    trainingId,
    date: log?.date || new Date().toISOString().slice(0, 10),
    dogId: log?.dogId || "",
    dogName: String(log?.dogName || "").trim().toLocaleUpperCase(),
    sex: log?.sex || "",
    route: log?.route || "Open distance",
    distance: Number(log?.distance || 0),
    position: log?.position || "Team",
    trainingType: log?.trainingType || "ATV",
    guide: log?.guide || "",
    fixedTeamId: log?.fixedTeamId || "",
    fixedTeamName: log?.fixedTeamName || "",
    form: Number(log?.form || 3),
    problem: Boolean(log?.problem),
    dogNote: log?.dogNote || "",
    finished: log?.finished !== false,
    removed: Boolean(log?.removed),
    removedReason: log?.removedReason || "",
    createdAt: log?.createdAt || new Date().toISOString(),
    updatedAt: log?.updatedAt || "",
  };
}

export function migrateState(value) {
  const source = value && typeof value === "object" ? value : {};
  const routes = cleanArray(source.routes, defaultState.routes).length ? cleanArray(source.routes, defaultState.routes) : defaultState.routes;
  const guidesFromData = cleanArray(source.guides, []);
  const guidesFromSessions = cleanArray(source.trainingSessions, [])
    .map((session) => session?.guide)
    .filter(Boolean);
  const guides = Array.from(new Set([...guidesFromData, ...guidesFromSessions, ...DEFAULT_GUIDES].map((guide) => String(guide).trim()).filter(Boolean)));

  return {
    dataVersion: DATA_VERSION,
    dogs: cleanArray(source.dogs, defaultState.dogs).map(normalizeDog),
    trainingSessions: cleanArray(source.trainingSessions, []).map(normalizeSession),
    trainingLog: cleanArray(source.trainingLog, []).map(normalizeLog),
    routes,
    guides,
    fixedTeams: cleanArray(source.fixedTeams, []).map(normalizeFixedTeam),
    healthEvents: cleanArray(source.healthEvents, []).map(normalizeHealthEvent),
    meta: {
      ...(source.meta && typeof source.meta === "object" ? source.meta : {}),
      lastBackupAt: source.meta?.lastBackupAt || "",
      lastExcelExportAt: source.meta?.lastExcelExportAt || "",
      lastBackupSessionCount: Number(source.meta?.lastBackupSessionCount || 0),
      lastQuickTraining: source.meta?.lastQuickTraining && typeof source.meta.lastQuickTraining === "object" ? source.meta.lastQuickTraining : null,
    },
  };
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!stored) return clone(defaultState);
    const parsed = JSON.parse(stored);
    return migrateState(parsed);
  } catch (error) {
    console.warn("Could not load local data. Starting with defaults.", error);
    return clone(defaultState);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrateState(state)));
  } catch (error) {
    console.warn("Could not save local data.", error);
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}
