function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

export function toCsv(rows, headers) {
  const headerLine = headers.map((header) => escapeCsv(header.label)).join(",");
  const lines = rows.map((row) => headers.map((header) => escapeCsv(row[header.key])).join(","));
  return [headerLine, ...lines].join("\n");
}

export function downloadCsv(filename, rows, headers) {
  const csv = toCsv(rows, headers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const dogHeaders = [
  { key: "name", label: "Dog Name" },
  { key: "sex", label: "Sex" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "mainPosition", label: "Main Position" },
  { key: "alternativePosition", label: "Alternative Position" },
  { key: "trainingStatus", label: "Training Status" },
  { key: "healthStatus", label: "Health Status" },
  { key: "form", label: "Form" },
  { key: "lastHeat", label: "Last Heat" },
  { key: "archived", label: "Archived" },
  { key: "archivedAt", label: "Archived At" },
  { key: "notes", label: "Notes" },
];

export const sessionHeaders = [
  { key: "id", label: "Training ID" },
  { key: "date", label: "Date" },
  { key: "route", label: "Route" },
  { key: "distance", label: "Distance" },
  { key: "trainingType", label: "Training Type" },
  { key: "guide", label: "Guide" },
  { key: "fixedTeamName", label: "Fixed Team" },
  { key: "numberOfDogs", label: "Number of Dogs" },
  { key: "generalNote", label: "General Note" },
];

export const logHeaders = [
  { key: "trainingId", label: "Training ID" },
  { key: "date", label: "Date" },
  { key: "dogName", label: "Dog Name" },
  { key: "sex", label: "Sex" },
  { key: "route", label: "Route" },
  { key: "distance", label: "Distance" },
  { key: "position", label: "Position" },
  { key: "trainingType", label: "Training Type" },
  { key: "guide", label: "Guide" },
  { key: "fixedTeamName", label: "Fixed Team" },
  { key: "form", label: "Form" },
  { key: "problem", label: "Problem" },
  { key: "dogNote", label: "Dog Note" },
  { key: "finished", label: "Finished" },
  { key: "removed", label: "Removed" },
  { key: "removedReason", label: "Removed Reason" },
];

export const healthHeaders = [
  { key: "date", label: "Date" },
  { key: "dogName", label: "Dog Name" },
  { key: "sex", label: "Sex" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "note", label: "Note" },
  { key: "nextCheck", label: "Next Check" },
];

export const fixedTeamHeaders = [
  { key: "name", label: "Team Name" },
  { key: "category", label: "Category" },
  { key: "memberCount", label: "Number of Dogs" },
  { key: "memberNames", label: "Dogs" },
  { key: "notes", label: "Notes" },
];

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function worksheetHtml(name, rows, headers) {
  const head = headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join("");
  const body = rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header.key])}</td>`).join("")}</tr>`).join("\n");
  return `<h2>${escapeHtml(name)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function downloadExcelWorkbook(filename, sheets) {
  const content = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><style>table{border-collapse:collapse;margin-bottom:32px}th,td{border:1px solid #999;padding:6px 10px}th{background:#eee}h2{font-family:Arial,sans-serif}</style></head>
<body>${sheets.map((sheet) => worksheetHtml(sheet.name, sheet.rows, sheet.headers)).join("\n")}</body></html>`;
  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
