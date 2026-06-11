export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : "";
}

export function daysBetween(dateString, toDate = new Date()) {
  if (!dateString) return "";
  const start = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(toDate.toISOString().slice(0, 10) + "T00:00:00");
  return Math.max(0, Math.round((end - start) / 86400000));
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
