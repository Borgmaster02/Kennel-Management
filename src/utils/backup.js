import { migrateState } from "./storage";

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(migrateState(data), null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "{}")));
      } catch {
        reject(new Error("This file is not valid JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsText(file);
  });
}

export function validateImportedState(value) {
  if (!value || typeof value !== "object") {
    throw new Error("The backup file does not contain app data.");
  }
  return migrateState(value);
}
