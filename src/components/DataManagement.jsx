import { downloadCsv, dogHeaders, fixedTeamHeaders, healthHeaders, logHeaders, sessionHeaders } from "../utils/exportCsv";
import { downloadJson, readJsonFile, validateImportedState } from "../utils/backup";
import { downloadBeautifulExcel } from "../utils/exportExcel";

export default function DataManagement({ state, onRestoreState, onResetAllData, onBackupDownloaded, onExcelExported, cloudStatus, onSyncCloud, onSaveCloud, cloudAccessCode, onCloudAccessCodeChange }) {
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

  const downloadWorkbook = async () => {
    try {
      await downloadBeautifulExcel(`kennel-training-report-${today}.xlsx`, state);
      onExcelExported?.();
    } catch (error) {
      console.error("Could not create Excel workbook.", error);
      alert("The Excel workbook could not be created. Please try again.");
    }
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

      <section className="panel cloud-sync-panel">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Shared database</p>
            <h3>Cloud Sync</h3>
          </div>
          <span className={cloudStatus?.available ? "status-pill success" : cloudStatus?.loading ? "status-pill warning" : "status-pill danger"}>
            {cloudStatus?.available ? "Connected" : cloudStatus?.loading ? "Checking" : "Local only"}
          </span>
        </div>
        <p className="muted-text">
          Cloud Sync loads and saves the shared kennel data through the website API. Deletions are now protected during sync, so a deleted training should not come back from the cloud. Local browser storage stays as a fallback.
        </p>
        <div className="cloud-status-box">
          <strong>{cloudStatus?.message || "Cloud sync status unknown."}</strong>
          <span>Last synced: {cloudStatus?.lastSyncedAt ? formatDateTime(cloudStatus.lastSyncedAt) : "Not yet"}</span>
          <span>Cloud updated: {cloudStatus?.remoteUpdatedAt ? formatDateTime(cloudStatus.remoteUpdatedAt) : "Unknown"}</span>
        </div>
        <div className="form-grid two">
          <label>
            Optional access code
            <input
              type="password"
              value={cloudAccessCode || ""}
              onChange={(event) => onCloudAccessCodeChange?.(event.target.value)}
              placeholder="Only needed if configured on Vercel"
            />
          </label>
        </div>
        <div className="button-row wrap">
          <button className="primary" onClick={() => onSyncCloud?.()} disabled={cloudStatus?.loading || cloudStatus?.saving}>Sync now</button>
          <button className="secondary" onClick={() => onSaveCloud?.({ mode: "replace" })} disabled={cloudStatus?.loading || cloudStatus?.saving}>Force save this device to cloud</button>
        </div>
        <p className="muted-text">Use <strong>Sync now</strong> for normal work. Use <strong>Force save this device to cloud</strong> only when this device has the correct state and you want the cloud to match it exactly.</p>
      </section>

      <div className="two-column">
        <section className="panel">
          <h3>Excel-friendly exports</h3>
          <p className="muted-text">Download a polished offline workbook with an overview, live workload formulas, rankings and an Enter Training sheet with dog dropdowns.</p>
          <div className="button-stack">
            <button className="primary" onClick={downloadWorkbook}>Download formatted Excel workbook</button>
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
