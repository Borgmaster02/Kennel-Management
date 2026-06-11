const RESTRICTED_HEALTH_STATUSES = ["Rest", "Injured", "Sick", "In Heat", "Retired"];

export function isDogEligibleForTeam(dog) {
  return !RESTRICTED_HEALTH_STATUSES.includes(dog.healthStatus) && dog.trainingStatus !== "Retired";
}

function sortForFairWorkload(a, b) {
  const kmDiff = Number(a.stats?.seasonKm || 0) - Number(b.stats?.seasonKm || 0);
  if (kmDiff !== 0) return kmDiff;
  const aDays = a.stats?.daysSinceLastTraining === "" ? 999 : Number(a.stats?.daysSinceLastTraining || 0);
  const bDays = b.stats?.daysSinceLastTraining === "" ? 999 : Number(b.stats?.daysSinceLastTraining || 0);
  if (aDays !== bDays) return bDays - aDays;
  return String(a.name).localeCompare(String(b.name));
}

function matchesPosition(dog, position) {
  return dog.mainPosition === position || dog.alternativePosition === position;
}

export function getSuggestedTeam(dogs, teamSize = 8) {
  const eligibleDogs = dogs.filter(isDogEligibleForTeam).sort(sortForFairWorkload);
  const picked = [];
  const pickedIds = new Set();

  const plan = [
    { position: "Lead", count: 2 },
    { position: "Swing", count: 2 },
    { position: "Wheel", count: 2 },
    { position: "Team", count: 2 },
  ];

  plan.forEach(({ position, count }) => {
    const candidates = eligibleDogs
      .filter((dog) => !pickedIds.has(dog.id) && matchesPosition(dog, position))
      .slice(0, count);

    candidates.forEach((dog) => {
      picked.push({ ...dog, suggestedPosition: position });
      pickedIds.add(dog.id);
    });
  });

  eligibleDogs.forEach((dog) => {
    if (picked.length >= teamSize) return;
    if (pickedIds.has(dog.id)) return;
    picked.push({ ...dog, suggestedPosition: dog.mainPosition || "Team" });
    pickedIds.add(dog.id);
  });

  return picked.slice(0, teamSize);
}

export function getTeamWarnings(suggestedTeam, teamSize = 8) {
  const warnings = [];
  if (suggestedTeam.length < teamSize) {
    warnings.push(`Only ${suggestedTeam.length} eligible dogs found for a ${teamSize}-dog team.`);
  }
  const leadCount = suggestedTeam.filter((dog) => dog.suggestedPosition === "Lead" || matchesPosition(dog, "Lead")).length;
  if (leadCount < 1 && suggestedTeam.length) {
    warnings.push("No clear lead dog found in the suggested team.");
  }
  return warnings;
}
