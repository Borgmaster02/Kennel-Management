import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import { initialDogs } from "../src/data/initialDogs.js";
import { createBeautifulExcelBuffer } from "../src/utils/exportExcel.js";

const sampleDogs = initialDogs.slice(0, 4).map((dog, index) => ({ ...dog, archived: index === 3 }));
const session = {
  id: "TR-QA-001", date: "2026-08-25", route: "Forest Loop", distance: 12, trainingType: "ATV",
  guide: "QA Guide", fixedTeamName: "Morning Team", numberOfDogs: 3, generalNote: "Cool weather, good trail.", createdAt: "2026-08-25T08:00:00Z",
};
const trainingLog = sampleDogs.slice(0, 3).map((dog, index) => ({
  id: `TR-QA-001-${dog.id}`, trainingId: session.id, date: session.date, dogId: dog.id, dogName: dog.name,
  sex: dog.sex, route: session.route, distance: session.distance, position: ["Lead", "Team", "Wheel"][index],
  trainingType: session.trainingType, guide: session.guide, fixedTeamName: session.fixedTeamName, form: 4,
  problem: false, finished: true, removed: false, dogNote: "",
}));
const state = {
  dogs: sampleDogs,
  trainingSessions: [session],
  trainingLog,
  fixedTeams: [{ id: "team-qa", name: "Morning Team", category: "Training Team", members: trainingLog.map((log) => ({ dogId: log.dogId, position: log.position })), notes: "QA team" }],
  healthEvents: [{ id: "health-qa", dogId: sampleDogs[0].id, dogName: sampleDogs[0].name, sex: sampleDogs[0].sex, date: "2026-08-24", type: "Health Note", status: "Watch", note: "Check paw after next run.", nextCheck: "2026-08-28" }],
};

const buffer = await createBeautifulExcelBuffer(state);
const outputDir = new URL("../outputs/excel-qa/", import.meta.url);
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(new URL("kennel-training-report-sample.xlsx", outputDir), Buffer.from(buffer));

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
const expectedSheets = ["Overview", "How to Use", "Enter Training", "Dogs", "Trainings", "Dog Runs", "Health", "Fixed Teams"];
if (workbook.worksheets.map((sheet) => sheet.name).join("|") !== expectedSheets.join("|")) throw new Error("Unexpected worksheet structure");
if (workbook.getWorksheet("Dogs").getCell(`A${4 + sampleDogs.length}`).value !== sampleDogs.at(-1).name) throw new Error("Dog table row count is incorrect");
if (workbook.getWorksheet("Dog Runs").getCell(`C${4 + trainingLog.length}`).value !== trainingLog.at(-1).dogName) throw new Error("Dog run table row count is incorrect");
if (!workbook.getWorksheet("Overview").getCell("B4").formula) throw new Error("Overview KPI formula is missing");
if (!workbook.getWorksheet("Overview").getCell("E6").formula) throw new Error("Live ranking formula is missing");
if (!workbook.getWorksheet("Dogs").getCell("K5").formula || !workbook.getWorksheet("Dogs").getCell("Q5").formula) throw new Error("Dog workload formulas are missing");
if (!workbook.getWorksheet("Dogs").getCell("K5").formula.includes("Enter Training")) throw new Error("Offline training formula is missing");
if (workbook.getWorksheet("Enter Training").getCell("G5").dataValidation?.type !== "list") throw new Error("Dog dropdown is missing");
if (workbook.getWorksheet("Dogs").getColumn("K").numFmt !== '0.0 "km"') throw new Error("Kilometer formatting is missing");
if (!workbook.getWorksheet("Health").views[0]?.state) throw new Error("Frozen header configuration is missing");
if (workbook.getWorksheet("Trainings").getCell("B5").value.toISOString().slice(0, 10) !== session.date) throw new Error("Training date shifted during export");
if (workbook.getWorksheet("Health").getCell("A5").value.toISOString().slice(0, 10) !== "2026-08-24") throw new Error("Health date shifted during export");
console.log(`Excel export verified: ${expectedSheets.length} sheets, ${buffer.byteLength} bytes.`);
