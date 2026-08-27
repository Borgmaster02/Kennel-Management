import { calculateAllDogStats } from "./statistics.js";

const COLORS = {
  dark: "243B32",
  green: "3F6E5A",
  light: "EAF3EE",
  cream: "F7F3E8",
  gold: "D9A441",
  red: "B85450",
  white: "FFFFFF",
  text: "26332E",
  muted: "66736D",
};

const thinBorder = {
  top: { style: "thin", color: { argb: "D5DFDA" } },
  left: { style: "thin", color: { argb: "D5DFDA" } },
  bottom: { style: "thin", color: { argb: "D5DFDA" } },
  right: { style: "thin", color: { argb: "D5DFDA" } },
};

function downloadBlob(filename, buffer) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function titleSheet(sheet, title, subtitle, lastColumn) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 22, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.dark } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 36;
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { italic: true, color: { argb: COLORS.muted } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
  sheet.getRow(2).height = 24;
  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.showGridLines = false;
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
}

function addTable(sheet, name, columns, rows, widths) {
  const startRow = 4;
  const safeRows = rows.length ? rows : [columns.map(() => "")];
  sheet.addTable({
    name,
    ref: `A${startRow}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium4", showRowStripes: true, showColumnStripes: false },
    columns: columns.map((name) => ({ name })),
    rows: safeRows,
  });
  sheet.getRow(startRow).height = 28;
  sheet.getRow(startRow).font = { bold: true, color: { argb: COLORS.white } };
  sheet.columns.forEach((column, index) => {
    column.width = widths[index] || 14;
    column.alignment = { vertical: "top", wrapText: true };
  });
  for (let row = startRow + 1; row <= startRow + safeRows.length; row += 1) {
    sheet.getRow(row).height = 22;
  }
  return { startRow, endRow: startRow + safeRows.length };
}

function applyStatusColors(sheet, columnLetter, startRow, endRow) {
  const fills = {
    Active: "DDEFE5", Good: "DDEFE5", Finished: "DDEFE5",
    Watch: "FFF0C9", "In Heat": "FFF0C9", "Light Training": "FFF0C9", "Build-up": "FFF0C9",
    Rest: "F2E6CF", Injured: "F8D7DA", Sick: "F8D7DA", Retired: "E5E7EB", Archived: "E5E7EB",
  };
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = sheet.getCell(`${columnLetter}${row}`);
    const color = fills[String(cell.value || "")];
    if (color) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  }
}

function toDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return Number.isNaN(date.getTime()) ? String(value) : date;
}

export async function createBeautifulExcelBuffer(state) {
  const module = await import("exceljs");
  const ExcelJS = module.default || module;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kennel Training Tracker";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const dogs = calculateAllDogStats(state.dogs || [], state.trainingLog || []).map((dog) => ({ ...dog, name: String(dog.name || "").toLocaleUpperCase() }));
  const activeDogs = dogs.filter((dog) => !dog.archived);
  const sessions = state.trainingSessions || [];
  const logs = state.trainingLog || [];
  const healthEvents = state.healthEvents || [];
  const dogMap = new Map(dogs.map((dog) => [dog.id, dog]));
  const logsByTraining = new Map();
  logs.forEach((log) => logsByTraining.set(log.trainingId, [...(logsByTraining.get(log.trainingId) || []), log]));

  const overview = workbook.addWorksheet("Overview", { properties: { tabColor: { argb: COLORS.gold } } });
  titleSheet(overview, "Kennel Training Overview", `Generated ${new Date().toLocaleString("en-GB")} · Archived dogs are excluded from active KPIs`, "H");
  overview.columns = [{ width: 25 }, { width: 18 }, { width: 4 }, { width: 10 }, { width: 22 }, { width: 14 }, { width: 10 }, { width: 18 }];
  const dogEnd = Math.max(5, 4 + dogs.length);
  const activeEnd = Math.max(5, 4 + activeDogs.length);
  const kpis = [
    ["Active dogs", { formula: `COUNTIF(Dogs!J5:J${dogEnd},"No")`, result: activeDogs.length }],
    ["Archived dogs", { formula: `COUNTIF(Dogs!J5:J${dogEnd},"Yes")`, result: dogs.length - activeDogs.length }],
    ["Season workload", { formula: `SUMIF(Dogs!J5:J${dogEnd},"No",Dogs!K5:K${dogEnd})`, result: activeDogs.reduce((sum, dog) => sum + dog.stats.seasonKm, 0) }],
    ["Average km / active dog", { formula: `IF(B4=0,0,B6/B4)`, result: activeDogs.length ? activeDogs.reduce((sum, dog) => sum + dog.stats.seasonKm, 0) / activeDogs.length : 0 }],
    ["Dogs trained last 7 days", { formula: `COUNTIFS(Dogs!J5:J${dogEnd},"No",Dogs!N5:N${dogEnd},"<=7",Dogs!N5:N${dogEnd},">=0")`, result: activeDogs.filter((dog) => dog.stats.daysSinceLastTraining !== "" && dog.stats.daysSinceLastTraining <= 7).length }],
    ["Health restrictions", { formula: `COUNTIF(Dogs!G5:G${dogEnd},"Rest")+COUNTIF(Dogs!G5:G${dogEnd},"Injured")+COUNTIF(Dogs!G5:G${dogEnd},"Sick")+COUNTIF(Dogs!G5:G${dogEnd},"In Heat")`, result: activeDogs.filter((dog) => ["Rest", "Injured", "Sick", "In Heat"].includes(dog.healthStatus)).length }],
  ];
  kpis.forEach(([label, value], index) => {
    const row = 4 + index;
    overview.getCell(`A${row}`).value = label;
    overview.getCell(`B${row}`).value = value;
    overview.getCell(`A${row}`).font = { bold: true, color: { argb: COLORS.text } };
    overview.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.light } };
    overview.getCell(`B${row}`).font = { bold: true, size: 15, color: { argb: COLORS.green } };
    overview.getCell(`A${row}`).border = overview.getCell(`B${row}`).border = thinBorder;
  });
  overview.getCell("B6").numFmt = "0.0 \"km\"";
  overview.getCell("B7").numFmt = "0.0 \"km\"";
  overview.getCell("D4").value = "All active dogs by season km";
  overview.getCell("D4").font = { bold: true, size: 14, color: { argb: COLORS.white } };
  overview.getCell("D4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  overview.mergeCells("D4:H4");
  ["Rank", "Dog", "Season km", "Runs", "Last training"].forEach((value, index) => { overview.getRow(5).getCell(4 + index).value = value; });
  ["D5", "E5", "F5", "G5", "H5"].forEach((address) => {
    overview.getCell(address).font = { bold: true, color: { argb: COLORS.white } };
    overview.getCell(address).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.dark } };
  });
  const rankedDogs = [...activeDogs].sort((a, b) => a.stats.seasonKm - b.stats.seasonKm || a.name.localeCompare(b.name));
  const rankingCapacity = Math.max(30, dogs.length + 25);
  for (let index = 0; index < rankingCapacity; index += 1) {
    const dog = rankedDogs[index];
    const row = 6 + index;
    overview.getRow(row).getCell(4).value = { formula: `IFERROR(SMALL(Dogs!$Q$5:$Q$504,ROWS($D$6:D${row})),"")`, result: dog ? index + 1 : "" };
    overview.getRow(row).getCell(5).value = { formula: `IF($D${row}="","",INDEX(Dogs!$A$5:$A$504,MATCH($D${row},Dogs!$Q$5:$Q$504,0)))`, result: dog?.name || "" };
    overview.getRow(row).getCell(6).value = { formula: `IF($D${row}="","",INDEX(Dogs!$K$5:$K$504,MATCH($D${row},Dogs!$Q$5:$Q$504,0)))`, result: dog?.stats.seasonKm || "" };
    overview.getRow(row).getCell(7).value = { formula: `IF($D${row}="","",INDEX(Dogs!$L$5:$L$504,MATCH($D${row},Dogs!$Q$5:$Q$504,0)))`, result: dog?.stats.numberOfRuns || "" };
    overview.getRow(row).getCell(8).value = { formula: `IF($D${row}="","",INDEX(Dogs!$M$5:$M$504,MATCH($D${row},Dogs!$Q$5:$Q$504,0)))`, result: dog?.stats.lastTraining ? toDate(dog.stats.lastTraining.date) : "" };
    overview.getCell(`F${row}`).numFmt = "0.0 \"km\"";
    overview.getCell(`H${row}`).numFmt = "dd.mm.yyyy";
    [4, 5, 6, 7, 8].forEach((column) => { overview.getRow(row).getCell(column).border = thinBorder; });
  }
  overview.views = [{ state: "frozen", ySplit: 5 }];

  const instructions = workbook.addWorksheet("How to Use", { properties: { tabColor: { argb: "8E9B94" } } });
  titleSheet(instructions, "Continue Working Offline", "The workbook can be updated directly in Excel without access to the app", "H");
  instructions.columns = [{ width: 5 }, { width: 28 }, { width: 72 }, { width: 4 }, { width: 24 }, { width: 24 }, { width: 18 }, { width: 18 }];
  const steps = [
    ["1", "Add or update dogs", "Use the Dogs table. Enter dog names in uppercase. Green calculated columns update automatically when rows are added inside the table."],
    ["2", "Record a training", "Add one row to Trainings for the overall run. The Training ID should be unique, for example TR-2026-08-27-01."],
    ["3", "Record every dog run", "Add one Dog Runs row per dog that participated. This table drives kilometers, run counts, last training and the live ranking."],
    ["4", "Add health information", "Use the Health table for notes and next checks. Select an existing dog name to keep records connected."],
    ["5", "Review the overview", "The KPIs and ranking recalculate when Excel opens or when formulas calculate. Use Data > Refresh/Recalculate if needed."],
  ];
  instructions.getRow(4).values = ["Step", "Area", "What to do"];
  instructions.getRow(4).font = { bold: true, color: { argb: COLORS.white } };
  instructions.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  steps.forEach((values, index) => {
    const row = 5 + index;
    instructions.getRow(row).values = values;
    instructions.getRow(row).height = 44;
    instructions.getCell(`A${row}`).font = { bold: true, size: 15, color: { argb: COLORS.green } };
    instructions.getCell(`B${row}`).font = { bold: true };
    [1, 2, 3].forEach((column) => { instructions.getRow(row).getCell(column).border = thinBorder; });
  });
  instructions.mergeCells("A12:C12");
  instructions.getCell("A12").value = "Offline shortcut: Use Enter Training. Choose the dogs from the dropdowns; workload and ranking update automatically.";
  instructions.getCell("A12").font = { bold: true, color: { argb: COLORS.red } };
  instructions.getCell("A12").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FCE8E6" } };
  instructions.getRow(12).height = 38;

  const entrySheet = workbook.addWorksheet("Enter Training", { properties: { tabColor: { argb: COLORS.gold } } });
  titleSheet(entrySheet, "Enter Training Offline", "Complete one row per training and select the participating dogs from the dropdown lists", "S");
  const entryColumns = ["Date", "Guide", "Route", "Distance km", "Type", "Team", ...Array.from({ length: 12 }, (_, index) => `Dog ${index + 1}`), "Note"];
  const entryRows = Array.from({ length: 50 }, () => entryColumns.map(() => ""));
  const entryTable = addTable(entrySheet, "TrainingEntryTable", entryColumns, entryRows, [13, 18, 22, 12, 14, 18, ...Array(12).fill(18), 38]);
  entrySheet.getColumn("A").numFmt = "dd.mm.yyyy";
  entrySheet.getColumn("D").numFmt = "0.0 \"km\"";
  for (let row = 5; row <= 504; row += 1) {
    entrySheet.getCell(`E${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Sled,ATV,Quad,Cart,Ski,Other"'] };
    for (let column = 7; column <= 18; column += 1) {
      entrySheet.getRow(row).getCell(column).dataValidation = { type: "list", allowBlank: true, formulae: ["$T$5:$T$504"] };
    }
  }
  activeDogs.forEach((dog, index) => { entrySheet.getCell(`T${5 + index}`).value = dog.name; });
  entrySheet.getColumn("T").hidden = true;
  entrySheet.getColumn("T").width = 2;
  for (let row = 5; row <= entryTable.endRow; row += 1) {
    for (let column = 1; column <= 19; column += 1) {
      entrySheet.getRow(row).getCell(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9E8" } };
    }
  }
  entrySheet.pageSetup.printArea = `A1:S${entryTable.endRow}`;

  const dogSheet = workbook.addWorksheet("Dogs", { properties: { tabColor: { argb: COLORS.green } } });
  titleSheet(dogSheet, "Dogs", "White columns are editable. Green columns calculate automatically from Dog Runs.", "Q");
  const dogRows = dogs.map((dog) => [
    dog.name, dog.sex, toDate(dog.dateOfBirth), dog.mainPosition || "", dog.alternativePosition || "", dog.trainingStatus || "",
    dog.healthStatus || "", Number(dog.form || 0), toDate(dog.lastHeat), dog.archived ? "Yes" : "No",
    dog.stats.seasonKm, dog.stats.numberOfRuns, toDate(dog.stats.lastTraining?.date), dog.stats.daysSinceLastTraining === "" ? "" : dog.stats.daysSinceLastTraining,
    0, dog.notes || "", dog.archived ? "" : 0,
  ]);
  const dogTable = addTable(dogSheet, "DogsTable", ["Dog", "Sex", "Date of birth", "Main position", "Alternative", "Training status", "Health status", "Form", "Last heat", "Archived", "Season km", "Runs", "Last training", "Days since", "Last 30 days km", "Notes", "Workload rank"], dogRows, [20, 11, 14, 15, 15, 16, 16, 9, 14, 11, 13, 9, 14, 11, 15, 38, 14]);
  const rankMap = new Map(rankedDogs.map((dog, index) => [dog.id, index + 1]));
  const entryDogColumns = Array.from({ length: 12 }, (_, index) => String.fromCharCode(71 + index));
  dogs.forEach((dog, index) => {
    const row = 5 + index;
    const recent30Km = logs.filter((log) => log.dogId === dog.id && new Date(`${log.date}T12:00:00Z`) >= new Date(Date.now() - 30 * 86400000)).reduce((sum, log) => sum + Number(log.distance || 0), 0);
    const offlineKm = entryDogColumns.map((column) => `SUMIF('Enter Training'!$${column}$5:$${column}$504,A${row},'Enter Training'!$D$5:$D$504)`).join("+");
    const offlineRuns = entryDogColumns.map((column) => `COUNTIF('Enter Training'!$${column}$5:$${column}$504,A${row})`).join("+");
    const offlineLast = entryDogColumns.map((column) => `IFERROR(LOOKUP(2,1/('Enter Training'!$${column}$5:$${column}$504=A${row}),'Enter Training'!$A$5:$A$504),0)`).join(",");
    const offlineRecent = entryDogColumns.map((column) => `SUMIFS('Enter Training'!$D$5:$D$504,'Enter Training'!$${column}$5:$${column}$504,A${row},'Enter Training'!$A$5:$A$504,">="&TODAY()-30)`).join("+");
    dogSheet.getCell(`K${row}`).value = { formula: `SUMIF('Dog Runs'!$C$5:$C$5004,A${row},'Dog Runs'!$F$5:$F$5004)+${offlineKm}`, result: dog.stats.seasonKm };
    dogSheet.getCell(`L${row}`).value = { formula: `COUNTIF('Dog Runs'!$C$5:$C$5004,A${row})+${offlineRuns}`, result: dog.stats.numberOfRuns };
    dogSheet.getCell(`M${row}`).value = { formula: `IF(L${row}=0,"",MAX(IFERROR(LOOKUP(2,1/('Dog Runs'!$C$5:$C$5004=A${row}),'Dog Runs'!$B$5:$B$5004),0),${offlineLast}))`, result: dog.stats.lastTraining ? toDate(dog.stats.lastTraining.date) : "" };
    dogSheet.getCell(`N${row}`).value = { formula: `IF(M${row}="","",TODAY()-M${row})`, result: dog.stats.daysSinceLastTraining === "" ? "" : dog.stats.daysSinceLastTraining };
    dogSheet.getCell(`O${row}`).value = { formula: `SUMIFS('Dog Runs'!$F$5:$F$5004,'Dog Runs'!$C$5:$C$5004,A${row},'Dog Runs'!$B$5:$B$5004,">="&TODAY()-30)+${offlineRecent}`, result: recent30Km };
    dogSheet.getCell(`Q${row}`).value = { formula: `IF(J${row}="Yes","",COUNTIFS($J$5:$J$504,"No",$K$5:$K$504,"<"&K${row})+COUNTIFS($J$5:J${row},"No",$K$5:K${row},K${row},$A$5:A${row},"<="&A${row}))`, result: rankMap.get(dog.id) || "" };
  });
  ["C", "I", "M"].forEach((column) => { dogSheet.getColumn(column).numFmt = "dd.mm.yyyy"; });
  ["K", "O"].forEach((column) => { dogSheet.getColumn(column).numFmt = "0.0 \"km\""; });
  ["K", "L", "M", "N", "O", "Q"].forEach((column) => { dogSheet.getColumn(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.light } }; });
  applyStatusColors(dogSheet, "G", 5, dogTable.endRow);

  const sessionSheet = workbook.addWorksheet("Trainings", { properties: { tabColor: { argb: "6E8FA3" } } });
  titleSheet(sessionSheet, "Training Sessions", "One row per saved training record; team members are listed for quick review", "K");
  const sessionRows = sessions.map((session) => {
    const team = logsByTraining.get(session.id) || [];
    return [session.id, toDate(session.date), session.route || "", Number(session.distance || 0), session.trainingType || "", session.guide || "", session.fixedTeamName || "Individual", team.length || Number(session.numberOfDogs || 0), team.map((log) => `${log.dogName} (${log.position || "Team"})`).join(", "), session.generalNote || "", session.createdAt || ""];
  });
  addTable(sessionSheet, "TrainingsTable", ["Training ID", "Date", "Route", "Distance km", "Type", "Guide", "Team", "Dogs", "Dog names & positions", "Note", "Created at"], sessionRows, [25, 13, 20, 13, 13, 17, 18, 9, 50, 35, 22]);
  sessionSheet.getColumn("B").numFmt = "dd.mm.yyyy";
  sessionSheet.getColumn("D").numFmt = "0.0 \"km\"";

  const logSheet = workbook.addWorksheet("Dog Runs", { properties: { tabColor: { argb: "769F8C" } } });
  titleSheet(logSheet, "Individual Dog Runs", "Detailed workload record for every dog in every saved training", "Q");
  const logRows = logs.map((log) => [log.trainingId, toDate(log.date), log.dogName || dogMap.get(log.dogId)?.name || "Unknown", log.sex || dogMap.get(log.dogId)?.sex || "", log.route || "", Number(log.distance || 0), log.position || "", log.trainingType || "", log.guide || "", log.fixedTeamName || "", Number(log.form || 0), log.problem ? "Yes" : "No", log.finished === false ? "No" : "Yes", log.removed ? "Yes" : "No", log.removedReason || "", log.dogNote || "", dogMap.get(log.dogId)?.archived ? "Yes" : "No"]);
  addTable(logSheet, "DogRunsTable", ["Training ID", "Date", "Dog", "Sex", "Route", "Distance km", "Position", "Type", "Guide", "Team", "Form", "Problem", "Finished", "Removed", "Removed reason", "Dog note", "Dog archived"], logRows, [25, 13, 19, 10, 20, 13, 13, 13, 17, 18, 9, 11, 11, 11, 24, 36, 13]);
  logSheet.getColumn("B").numFmt = "dd.mm.yyyy";
  logSheet.getColumn("F").numFmt = "0.0 \"km\"";

  const healthSheet = workbook.addWorksheet("Health", { properties: { tabColor: { argb: COLORS.red } } });
  titleSheet(healthSheet, "Health Notes", "Health history is retained for active and archived dogs", "J");
  const healthRows = healthEvents.map((event) => {
    const dog = dogMap.get(event.dogId);
    return [toDate(event.date), dog?.name || event.dogName || "Unknown", dog?.sex || event.sex || "", event.type || "", event.status || "", event.note || "", toDate(event.nextCheck), event.applyToDogProfile ? "Yes" : "No", dog?.archived ? "Yes" : "No", event.updatedAt || event.createdAt || ""];
  });
  const healthTable = addTable(healthSheet, "HealthTable", ["Date", "Dog", "Sex", "Type", "Status", "Note", "Next check", "Profile updated", "Dog archived", "Recorded at"], healthRows, [13, 20, 10, 18, 16, 45, 14, 16, 14, 22]);
  healthSheet.getColumn("A").numFmt = "dd.mm.yyyy";
  healthSheet.getColumn("G").numFmt = "dd.mm.yyyy";
  applyStatusColors(healthSheet, "E", 5, healthTable.endRow);

  const teamSheet = workbook.addWorksheet("Fixed Teams", { properties: { tabColor: { argb: "A9855A" } } });
  titleSheet(teamSheet, "Fixed Teams", "Saved team templates with positions and archive visibility", "F");
  const teamRows = (state.fixedTeams || []).map((team) => {
    const members = (team.members || []).map((member) => ({ member, dog: dogMap.get(member.dogId) })).filter(({ dog }) => dog);
    return [team.name, team.category || "Custom", members.filter(({ dog }) => !dog.archived).length, members.length, members.map(({ member, dog }) => `${dog.name}${dog.archived ? " [archived]" : ""} (${member.position || dog.mainPosition || "Team"})`).join(", "), team.notes || ""];
  });
  addTable(teamSheet, "FixedTeamsTable", ["Team", "Category", "Active dogs", "All saved dogs", "Dogs & positions", "Notes"], teamRows, [22, 18, 13, 15, 58, 38]);

  workbook.worksheets.forEach((sheet) => {
    sheet.headerFooter.oddFooter = "Kennel Training Tracker · &D · Page &P of &N";
    sheet.eachRow((row) => row.eachCell((cell) => {
      if (!cell.font?.name) cell.font = { ...cell.font, name: "Aptos", color: cell.font?.color || { argb: COLORS.text } };
      cell.alignment = { vertical: "top", wrapText: true, ...cell.alignment };
    }));
  });

  // Keep formulas bounded to the exported data range and ensure the ranking fits the visible print area.
  overview.autoFilter = activeDogs.length ? `D5:H${5 + activeDogs.length}` : undefined;
  overview.pageSetup.printArea = `A1:H${Math.max(12, 5 + activeDogs.length)}`;
  dogSheet.pageSetup.printArea = `A1:Q${dogEnd}`;
  if (activeEnd < 5) overview.getCell("D6").value = "No active dogs";

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function downloadBeautifulExcel(filename, state) {
  const buffer = await createBeautifulExcelBuffer(state);
  downloadBlob(filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`, buffer);
}
