import { daysBetween } from "./dateUtils";

export function sortLogsNewestFirst(logs) {
  return [...logs].sort((a, b) => {
    if (a.date === b.date) return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    return String(b.date).localeCompare(String(a.date));
  });
}

export function getDogLogs(dogId, logs) {
  return sortLogsNewestFirst(logs.filter((log) => log.dogId === dogId));
}

export function getDogStats(dog, logs) {
  const dogLogs = getDogLogs(dog.id, logs);
  const completedLogs = dogLogs.filter((log) => Number(log.distance) > 0);
  const seasonKm = completedLogs.reduce((sum, log) => sum + Number(log.distance || 0), 0);
  const lastTraining = dogLogs[0] || null;
  const last10 = dogLogs.slice(0, 10);
  const last10Km = last10.reduce((sum, log) => sum + Number(log.distance || 0), 0);
  const averageForm = dogLogs.length
    ? dogLogs.reduce((sum, log) => sum + Number(log.form || 0), 0) / dogLogs.length
    : Number(dog.form || 0);
  const mostUsedPosition = getMostFrequent(dogLogs.map((log) => log.position).filter(Boolean));

  return {
    seasonKm,
    numberOfRuns: dogLogs.length,
    lastTraining,
    daysSinceLastTraining: lastTraining ? daysBetween(lastTraining.date) : "",
    last10Km,
    averageForm: averageForm ? Number(averageForm.toFixed(1)) : "",
    condition: calculateCondition(dog, dogLogs, seasonKm, averageForm),
    mostUsedPosition,
    hasRecentProblem: last10.some((log) => log.problem || log.removed),
  };
}

export function calculateAllDogStats(dogs, logs) {
  return dogs.map((dog) => ({ ...dog, stats: getDogStats(dog, logs) }));
}

function getMostFrequent(values) {
  if (!values.length) return "";
  const counts = values.reduce((acc, value) => ({ ...acc, [value]: (acc[value] || 0) + 1 }), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function calculateCondition(dog, dogLogs, seasonKm, averageForm) {
  if (["Rest", "Injured", "Sick", "Retired", "In Heat"].includes(dog.healthStatus)) return "Restricted";
  if (!dogLogs.length) return "No data";
  const daysSince = daysBetween(dogLogs[0].date);
  if (daysSince !== "" && daysSince > 10) return "Low recent work";
  if (averageForm >= 4 && seasonKm > 0) return "Good";
  if (averageForm < 3) return "Watch";
  return "Okay";
}

function isWithinDays(dateString, days) {
  if (!dateString) return false;
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (today - date) / 86400000;
  return diff >= 0 && diff < days;
}

function isUpcomingWithinDays(dateString, days) {
  if (!dateString) return false;
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (date - today) / 86400000;
  return diff >= 0 && diff <= days;
}

function enrichHealthEvents(events, dogs) {
  const dogMap = new Map(dogs.map((dog) => [dog.id, dog]));
  return (Array.isArray(events) ? events : []).map((event) => {
    const dog = dogMap.get(event.dogId);
    return {
      ...event,
      dogName: dog?.name || event.dogName || "Unknown dog",
      sex: dog?.sex || event.sex || "",
    };
  });
}

function countUniqueWeeks(sessions) {
  const weeks = new Set();
  sessions.forEach((session) => {
    const date = new Date(`${session.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((((date - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
    weeks.add(`${date.getFullYear()}-${week}`);
  });
  return weeks.size;
}

export function getDashboardStats(dogs, sessions, logs, healthEvents = [], meta = {}) {
  const dogsWithStats = calculateAllDogStats(dogs, logs);
  const totalDogWorkloadKm = logs.reduce((sum, log) => sum + Number(log.distance || 0), 0);
  const totalTrainingKm = sessions.reduce((sum, session) => sum + Number(session.distance || 0), 0);
  const averageKmPerDog = dogs.length ? totalDogWorkloadKm / dogs.length : 0;
  const averageTrainingKm = sessions.length ? totalTrainingKm / sessions.length : 0;
  const topDogs = [...dogsWithStats].sort((a, b) => b.stats.seasonKm - a.stats.seasonKm).slice(0, 10);
  const lowKmDogs = [...dogsWithStats]
    .filter((dog) => !["Retired"].includes(dog.healthStatus))
    .sort((a, b) => a.stats.seasonKm - b.stats.seasonKm)
    .slice(0, 10);
  const notTrainedLong = dogsWithStats
    .filter((dog) => dog.stats.daysSinceLastTraining === "" || dog.stats.daysSinceLastTraining >= 7)
    .sort((a, b) => (b.stats.daysSinceLastTraining || 999) - (a.stats.daysSinceLastTraining || 999));
  const dogsOnRest = dogsWithStats.filter((dog) => ["Rest", "Injured", "Sick", "In Heat"].includes(dog.healthStatus));
  const weeks = getWeekCount(sessions);
  const uniqueTrainingWeeks = countUniqueWeeks(sessions);
  const last7TrainingKm = sessions.filter((session) => isWithinDays(session.date, 7)).reduce((sum, session) => sum + Number(session.distance || 0), 0);
  const last30TrainingKm = sessions.filter((session) => isWithinDays(session.date, 30)).reduce((sum, session) => sum + Number(session.distance || 0), 0);
  const last7DogWorkloadKm = logs.filter((log) => isWithinDays(log.date, 7)).reduce((sum, log) => sum + Number(log.distance || 0), 0);
  const last30DogWorkloadKm = logs.filter((log) => isWithinDays(log.date, 30)).reduce((sum, log) => sum + Number(log.distance || 0), 0);
  const averageDogsPerSession = sessions.length ? logs.length / sessions.length : 0;
  const preparedHealthEvents = enrichHealthEvents(healthEvents, dogs);
  const recentHealthEvents = preparedHealthEvents
    .filter((event) => isWithinDays(event.date, 7))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 8);
  const upcomingHealthChecks = preparedHealthEvents
    .filter((event) => isUpcomingWithinDays(event.nextCheck, 14))
    .sort((a, b) => String(a.nextCheck || "").localeCompare(String(b.nextCheck || "")))
    .slice(0, 8);
  const sessionsSinceBackup = Math.max(0, sessions.length - Number(meta?.lastBackupSessionCount || 0));
  const backupRecommended = sessionsSinceBackup >= 3 || (!meta?.lastBackupAt && sessions.length > 0);

  return {
    totalSeasonKm: totalDogWorkloadKm,
    totalDogWorkloadKm,
    totalTrainingKm,
    numberOfTrainingSessions: sessions.length,
    averageKmPerDog,
    averageTrainingKm,
    trainingFrequencyPerWeek: weeks ? sessions.length / weeks : sessions.length,
    uniqueTrainingWeeks,
    last7TrainingKm,
    last30TrainingKm,
    last7DogWorkloadKm,
    last30DogWorkloadKm,
    averageDogsPerSession,
    recentHealthEvents,
    upcomingHealthChecks,
    sessionsSinceBackup,
    backupRecommended,
    topDogs,
    lowKmDogs,
    notTrainedLong,
    dogsOnRest,
    dogsWithStats,
  };
}

function getWeekCount(sessions) {
  if (!sessions.length) return 0;
  const dates = sessions.map((session) => new Date(`${session.date}T00:00:00`)).filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return 0;
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  return Math.max(1, Math.ceil((max - min + 86400000) / (7 * 86400000)));
}
