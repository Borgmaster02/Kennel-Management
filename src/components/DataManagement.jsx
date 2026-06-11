import { downloadCsv, downloadExcelWorkbook, dogHeaders, fixedTeamHeaders, healthHeaders, logHeaders, sessionHeaders } from "../utils/exportCsv";
import { downloadJson, readJsonFile, validateImportedState } from "../utils/backup";

export default function DataManagement({ state, onRestoreState, onResetAllData, onBackupDownloaded, onExcelExported }) {
  const today = new Date().toISOString().slice(0, 10);
  const preparedLogs = prepareLogsForExport(state.trainingLog || [], state.trainingSessions || []);
  const preparedTeams = prepareFixedTeamsForExport(state.fixedTeams || [], state.dogs || []);
  const preparedHealth = prepareHealthForExport(state.healthEvents || [], state.dogs || []);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const imported = await readJsonFile(file);
      const validated = validateImportedState(imported);
      const confirmed = window.confirm("Import this backup and replace the current local data?");
      if (confirmed) onRestoreState(validated);
    } catch (error) {
      alert(error.message || "Could not import the selected backup file.");
    }
  };

  const downloadBackup = () => {
    const payload = {
      ...state,
      meta: { ...(state.meta || {}), lastBackupAt: new Date().toISOString(), lastBackupSessionCount: (state.trainingSessions || []).length },
    };
    downloadJson(`dog-training-tracker-backup-${today}.json`, payload);
    onBackupDownloaded?.();
  };

  const downloadWorkbook = () => {
    downloadExcelWorkbook(`dog-training-tracker-workbook-${today}.xls`, [
      { name: "Dogs", rows: state.dogs || [], headers: dogHeaders },
      { name: "Training Sessions", rows: state.trainingSessions || [], headers: sessionHeaders },
      { name: "Training Log", rows: preparedLogs, headers: logHeaders },
      { name: "Fixed Teams", rows: preparedTeams, headers: fixedTeamHeaders },
      { name: "Health Notes", rows: preparedHealth, headers: healthHeaders },
    ]);
    onExcelExported?.();
  };

  return (
    <section className="page-grid">
      <div className="page-header">
        <div>
          <p className="eyebrow">Export and backup</p>
          <h2>Data Management</h2>
        </div>
      </div>

      <section className="panel backup-reminder">
        <h3>Backup reminder</h3>
        <div className="stats-grid compact-stats">
          <article className="stat-card"><span>Last full backup</span><strong>{state.meta?.lastBackupAt ? formatDateTime(state.meta.lastBackupAt) : "Never"}</strong></article>
          <article className="stat-card"><span>Last Excel-style export</span><strong>{state.meta?.lastExcelExportAt ? formatDateTime(state.meta.lastExcelExportAt) : "Never"}</strong></article>
        </div>
        <p className="muted-text">Local browser storage can be lost when a preview environment is reset. Download a JSON backup regularly, especially before uploading a new website version. Sessions since backup: {Math.max(0, (state.trainingSessions || []).length - Number(state.meta?.lastBackupSessionCount || 0))}.</p>
      </section>

      <div className="two-column">
        <section className="panel">
          <h3>Excel-friendly exports</h3>
          <p className="muted-text">CSV files are clean table exports. The workbook export is an Excel-openable .xls file with several tables in one file.</p>
          <div className="button-stack">
            <button className="primary" onClick={downloadWorkbook}>Export Excel-style Workbook</button>
            <button className="secondary" onClick={() => downloadCsv(`dogs-${today}.csv`, state.dogs, dogHeaders)}>Export Dogs CSV</button>
            <button className="secondary" onClick={() => downloadCsv(`training-sessions-${today}.csv`, state.trainingSessions, sessionHeaders)}>Export Training Sessions CSV</button>
            <button className="secondary" onClick={() => downloadCsv(`training-log-${today}.csv`, preparedLogs, logHeaders)}>Export Training Log CSV</button>
            <button className="secondary" onClick={() => downloadCsv(`fixed-teams-${today}.csv`, preparedTeams, fixedTeamHeaders)}>Export Fixed Teams CSV</button>
            <button className="secondary" onClick={() => downloadCsv(`health-notes-${today}.csv`, preparedHealth, healthHeaders)}>Export Health Notes CSV</button>
          </div>
        </section>

        <section className="panel">
          <h3>Full app backup</h3>
          <p className="muted-text">A JSON backup keeps dogs, guides, fixed teams, trainings, logs and routes together. It is the best way to move data to a newer website version.</p>
          <div className="button-stack">
            <button className="primary" onClick={downloadBackup}>Download Full Backup</button>
            <label className="file-button">
              <span aria-hidden="true">⇧</span> Import Backup JSON
              <input type="file" accept="application/json,.json" onChange={handleImport} />
            </label>
            <button className="ghost danger-text" onClick={onResetAllData}><span aria-hidden="true">↻</span> Reset Local Data</button>
          </div>
        </section>
      </div>

      <section className="panel">
        <h3>Current local data</h3>
        <div className="stats-grid compact-stats">
          <article className="stat-card"><span>Dogs</span><strong>{state.dogs.length}</strong></article>
          <article className="stat-card"><span>Training sessions</span><strong>{state.trainingSessions.length}</strong></article>
          <article className="stat-card"><span>Dog log entries</span><strong>{state.trainingLog.length}</strong></article>
          <article className="stat-card"><span>Routes</span><strong>{state.routes.length}</strong></article>
          <article className="stat-card"><span>Guides</span><strong>{(state.guides || []).length}</strong></article>
          <article className="stat-card"><span>Fixed teams</span><strong>{(state.fixedTeams || []).length}</strong></article>
          <article className="stat-card"><span>Health notes</span><strong>{(state.healthEvents || []).length}</strong></article>
        </div>
      </section>
    </section>
  );
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function prepareFixedTeamsForExport(teams, dogs) {
  const dogMap = new Map(dogs.map((dog) => [dog.id, dog]));
  return teams.map((team) => {
    const members = Array.isArray(team.members) ? team.members : [];
    const memberNames = members
      .map((member) => {
        const dog = dogMap.get(member.dogId);
        return dog ? `${dog.name} (${member.position || dog.mainPosition || "Team"})` : "";
      })
      .filter(Boolean);
    return {
      ...team,
      memberCount: memberNames.length,
      memberNames: memberNames.join("; "),
    };
  });
}

function prepareLogsForExport(logs, sessions) {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  return logs.map((log) => {
    const session = sessionMap.get(log.trainingId);
    return {
      ...log,
      fixedTeamName: session?.fixedTeamName || log.fixedTeamName || "",
      fixedTeamId: session?.fixedTeamId || log.fixedTeamId || "",
    };
  });
}


function prepareHealthForExport(events, dogs) {
  const dogMap = new Map(dogs.map((dog) => [dog.id, dog]));
  return events.map((event) => {
    const dog = dogMap.get(event.dogId);
    return {
      ...event,
      dogName: dog?.name || event.dogName || "Unknown dog",
      sex: dog?.sex || event.sex || "",
    };
  });
}
