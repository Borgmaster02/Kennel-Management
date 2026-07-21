export const POSITIONS = ["Lead", "Swing", "Team", "Wheel"];

export const TRAINING_TYPES = [
  "ATV",
  "Kart",
  "Sled",
  "Guest Tour",
  "Puppy / Young Dog Training",
  "Rehab / Light Training",
];

export const HEALTH_STATUSES = [
  "Active",
  "Watch",
  "Light Training",
  "Rest",
  "Injured",
  "Sick",
  "In Heat",
  "Build-up",
  "Retired",
];

export const TRAINING_STATUSES = [
  "Active",
  "Build-up",
  "Light Training",
  "Rest",
  "Young Dog",
  "Retired",
];

export const STATUS_META = {
  Active: { tone: "green", label: "Active" },
  Watch: { tone: "yellow", label: "Watch" },
  "Light Training": { tone: "orange", label: "Light" },
  Rest: { tone: "red", label: "Rest" },
  Injured: { tone: "red", label: "Injured" },
  Sick: { tone: "red", label: "Sick" },
  "In Heat": { tone: "red", label: "In Heat" },
  "Build-up": { tone: "blue", label: "Build-up" },
  "Young Dog": { tone: "blue", label: "Young" },
  Retired: { tone: "grey", label: "Retired" },
};

export const FORM_LABELS = {
  1: "Poor",
  2: "Tired / weak",
  3: "Okay",
  4: "Good",
  5: "Very good",
};

export const DEFAULT_GUIDES = ["Laila", "Jakob"];

export const INITIAL_ROUTES = [
  { id: "route-open", name: "Open distance", distance: "", difficulty: "Variable", notes: "Use this when the route or distance changes." },
];

export const HEALTH_EVENT_TYPES = [
  "Health Note",
  "Heat",
  "Injury",
  "Sick",
  "Vet",
  "Paws",
  "Rest",
  "Medication",
  "Deworming",
  "Other",
];

export const TEAM_CATEGORIES = [
  "Tour Team",
  "Training Team",
  "Young Team",
  "Long Run Team",
  "Rehab / Light",
  "Puppy Team",
  "Guest Tour",
  "Custom",
];
