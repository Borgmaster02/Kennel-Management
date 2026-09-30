import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "./components/Dashboard";
import Dogs from "./components/Dogs";
import NewTraining from "./components/NewTraining";
import QuickTraining from "./components/QuickTraining";
import TrainingSessions from "./components/TrainingSessions";
import TrainingLog from "./components/TrainingLog";
import Routes from "./components/Routes";
import DataManagement from "./components/DataManagement";
import TeamPlanner from "./components/TeamPlanner";
import Guides from "./components/Guides";
import FixedTeams from "./components/FixedTeams";
import HealthNotes from "./components/HealthNotes";
import ErrorBoundary from "./components/ErrorBoundary";
import { defaultState, loadState, saveState } from "./utils/storage";
import { fetchCloudState, saveCloudState, getCloudAccessCode, setCloudAccessCode, describeCloudError } from "./utils/cloudSync";
import { mergeStates } from "./utils/stateMerge";
import { calculateAllDogStats } from "./utils/statistics";

const PRIMARY_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "quick-training", label: "Quick", icon: "⚡" },
  { id: "dogs", label: "Dogs", icon: "🐕" },
  { id: "team-planner", label: "Planner", icon: "🧭" },
  { id: "fixed-teams", label: "Teams", icon: "🐾" },
  { id: "health", label: "Health", icon: "🩺" },
  { id: "data", label: "Data", icon: "💾" },
];

const SECONDARY_TABS = [
  { id: "new-training", label: "Full Entry", icon: "＋" },
  { id: "sessions", label: "Sessions", icon: "📋" },
  { id: "log", label: "Training Log", icon: "⬇" },
  { id: "routes", label: "Routes", icon: "🗺" },
  { id: "guides", label: "Guides", icon: "👤" },
];

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [state, setState] = useState(() => loadState());
  const [toast, setToast] = useState("");
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [prefillTeam, setPrefillTeam] = useState(null);
  const [cloudAccessCode, setCloudAccessCodeValue] = useState(() => getCloudAccessCode());
  const [cloudStatus, setCloudStatus] = useState({
    ready: false,
    available: false,
    saving: false,
    loading: true,
    needsCode: false,
    lastSyncedAt: "",
    remoteUpdatedAt: "",
    message: "Checking cloud sync...",
  });
  const stateRef = useRef(state);
  const cloudReadyRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateCloudAccessCode = useCallback((value) => {
    setCloudAccessCodeValue(value);
    setCloudAccessCode(value);
    setCloudStatus((current) => ({ ...current, needsCode: false, message: "Cloud access code saved. Sync again to check it." }));
  }, []);

  const syncWithCloud = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setCloudStatus((current) => ({ ...current, loading: true, message: "Syncing with cloud..." }));
    }

    try {
      const remote = await fetchCloudState(cloudAccessCode);
      const merged = remote?.state ? mergeStates(remote.state, stateRef.current) : stateRef.current;
      setState(merged);
      const saved = await saveCloudState(merged, cloudAccessCode, "merge");
      const syncedAt = new Date().toISOString();
      cloudReadyRef.current = true;
      setCloudStatus({
        ready: true,
        available: true,
        saving: false,
        loading: false,
        needsCode: false,
        lastSyncedAt: syncedAt,
        remoteUpdatedAt: saved?.updatedAt || remote?.updatedAt || "",
        message: "Cloud sync active.",
      });
      if (!silent) setToast("Cloud sync complete.");
      return merged;
    } catch (error) {
      const message = describeCloudError(error);
      cloudReadyRef.current = false;
      setCloudStatus((current) => ({
        ...current,
        ready: false,
        available: false,
        saving: false,
        loading: false,
        needsCode: error?.status === 401,
        message,
      }));
      if (!silent) setToast(message);
      return null;
    }
  }, [cloudAccessCode]);

  const saveCurrentStateToCloud = useCallback(async ({ silent = false } = {}) => {
    try {
      setCloudStatus((current) => ({ ...current, saving: true, message: "Saving to cloud..." }));
      const saved = await saveCloudState(stateRef.current, cloudAccessCode, "merge");
      const syncedAt = new Date().toISOString();
      cloudReadyRef.current = true;
      setCloudStatus((current) => ({
        ...current,
        ready: true,
        available: true,
        saving: false,
        loading: false,
        needsCode: false,
        lastSyncedAt: syncedAt,
        remoteUpdatedAt: saved?.updatedAt || current.remoteUpdatedAt || "",
        message: "Saved to cloud.",
      }));
      if (!silent) setToast("Saved to cloud.");
    } catch (error) {
      const message = describeCloudError(error);
      if (error?.status !== 404) cloudReadyRef.current = false;
      setCloudStatus((current) => ({
        ...current,
        ready: false,
        available: false,
        saving: false,
        loading: false,
        needsCode: error?.status === 401,
        message,
      }));
      if (!silent) setToast(message);
    }
  }, [cloudAccessCode]);

  useEffect(() => {
    syncWithCloud({ silent: true });
  }, [syncWithCloud]);

  useEffect(() => {
    if (!cloudReadyRef.current) return undefined;
    const timer = setTimeout(() => {
      saveCurrentStateToCloud({ silent: true });
    }, 1200);
    return () => clearTimeout(timer);
  }, [state, saveCurrentStateToCloud]);

  const dogsWithStats = useMemo(
    () => calculateAllDogStats(state.dogs, state.trainingLog),
    [state.dogs, state.trainingLog]
  );
  const activeDogsWithStats = useMemo(() => dogsWithStats.filter((dog) => !dog.archived), [dogsWithStats]);

  const editingSession = editingTrainingId
    ? state.trainingSessions.find((session) => session.id === editingTrainingId) || null
    : null;
  const editingLogs = editingTrainingId
    ? state.trainingLog.filter((log) => log.trainingId === editingTrainingId)
    : [];

  const backupStatus = {
    sessionsSinceBackup: Math.max(0, state.trainingSessions.length - Number(state.meta?.lastBackupSessionCount || 0)),
    lastBackupAt: state.meta?.lastBackupAt || "",
  };

  const openTab = (tabId) => {
    if (tabId !== "new-training") {
      setEditingTrainingId(null);
      setPrefillTeam(null);
    }
    setActiveTab(tabId);
  };

  const updateDog = (dog) => {
    setState((current) => ({
      ...current,
      dogs: current.dogs.map((item) => (item.id === dog.id ? dog : item)),
    }));
    setToast("Dog updated.");
  };

  const addDog = (dog) => {
    setState((current) => ({ ...current, dogs: [...current.dogs, dog] }));
    setToast("New dog added.");
  };

  const setDogArchived = (dogId, archived) => {
    setState((current) => ({
      ...current,
      dogs: current.dogs.map((dog) => dog.id === dogId
        ? { ...dog, archived, archivedAt: archived ? new Date().toISOString() : "", updatedAt: new Date().toISOString() }
        : dog),
    }));
    setToast(archived ? "Dog archived. Training history was kept." : "Dog restored.");
  };

  const saveTraining = ({ session, logEntries, quickMeta }) => {
    setState((current) => {
      const guide = String(session.guide || "").trim();
      const guides = guide ? Array.from(new Set([...(current.guides || []), guide])) : current.guides || [];
      return {
        ...current,
        guides,
        meta: {
          ...(current.meta || {}),
          ...(quickMeta?.lastQuickTraining ? { lastQuickTraining: quickMeta.lastQuickTraining } : {}),
        },
        trainingSessions: [session, ...current.trainingSessions],
        trainingLog: [...logEntries, ...current.trainingLog],
      };
    });
    setEditingTrainingId(null);
    setPrefillTeam(null);
    setActiveTab("dashboard");
    setToast("Training saved successfully.");
  };

  const updateTraining = ({ session, logEntries }) => {
    setState((current) => {
      const guide = String(session.guide || "").trim();
      const guides = guide ? Array.from(new Set([...(current.guides || []), guide])) : current.guides || [];
      return {
        ...current,
        guides,
        trainingSessions: current.trainingSessions.map((item) => (item.id === session.id ? session : item)),
        trainingLog: [...logEntries, ...current.trainingLog.filter((log) => log.trainingId !== session.id)],
      };
    });
    setEditingTrainingId(null);
    setPrefillTeam(null);
    setActiveTab("sessions");
    setToast("Training updated.");
  };

  const startEditTraining = (trainingId) => {
    setPrefillTeam(null);
    setEditingTrainingId(trainingId);
    setActiveTab("new-training");
  };

  const cancelEditTraining = () => {
    setEditingTrainingId(null);
    setPrefillTeam(null);
    setActiveTab("sessions");
  };

  const deleteTraining = (trainingId) => {
    const confirmed = window.confirm("Delete this training session and all connected dog log entries?");
    if (!confirmed) return;
    setState((current) => ({
      ...current,
      trainingSessions: current.trainingSessions.filter((session) => session.id !== trainingId),
      trainingLog: current.trainingLog.filter((log) => log.trainingId !== trainingId),
    }));
    if (editingTrainingId === trainingId) setEditingTrainingId(null);
    setToast("Training deleted.");
  };

  const addRoute = (route) => {
    setState((current) => ({ ...current, routes: [...current.routes, route] }));
    setToast("Route added.");
  };

  const updateRoute = (route) => {
    setState((current) => ({
      ...current,
      routes: current.routes.map((item) => (item.id === route.id ? route : item)),
    }));
    setToast("Route updated.");
  };

  const deleteRoute = (routeId) => {
    const confirmed = window.confirm("Delete this route? Existing training records will stay unchanged.");
    if (!confirmed) return;
    setState((current) => ({ ...current, routes: current.routes.filter((route) => route.id !== routeId) }));
    setToast("Route deleted.");
  };

  const addGuide = (name) => {
    const guide = String(name || "").trim();
    if (!guide) return;
    setState((current) => ({ ...current, guides: Array.from(new Set([...(current.guides || []), guide])) }));
    setToast("Guide added.");
  };

  const updateGuide = (oldName, newName) => {
    const clean = String(newName || "").trim();
    if (!clean) return;
    setState((current) => ({
      ...current,
      guides: Array.from(new Set((current.guides || []).map((guide) => (guide === oldName ? clean : guide)))),
      trainingSessions: current.trainingSessions.map((session) => session.guide === oldName ? { ...session, guide: clean } : session),
      trainingLog: current.trainingLog.map((log) => log.guide === oldName ? { ...log, guide: clean } : log),
    }));
    setToast("Guide updated.");
  };

  const deleteGuide = (name) => {
    const used = state.trainingSessions.some((session) => session.guide === name) || state.trainingLog.some((log) => log.guide === name);
    const message = used
      ? "This guide is used in saved trainings. Remove it from the guide list anyway? Existing trainings will keep the guide name."
      : "Delete this guide?";
    if (!window.confirm(message)) return;
    setState((current) => ({ ...current, guides: (current.guides || []).filter((guide) => guide !== name) }));
    setToast("Guide removed from list.");
  };

  const addFixedTeam = (team) => {
    setState((current) => ({ ...current, fixedTeams: [team, ...(current.fixedTeams || [])] }));
    setToast("Fixed team saved.");
  };

  const startTrainingWithTeam = (team) => {
    setEditingTrainingId(null);
    setPrefillTeam({
      id: team.id || `prefill-${Date.now()}`,
      name: team.name || "Suggested team",
      members: Array.isArray(team.members) ? team.members : [],
    });
    setActiveTab("new-training");
    setToast("Suggested team loaded into New Training.");
  };

  const clearPrefillTeam = () => setPrefillTeam(null);

  const updateFixedTeam = (team) => {
    setState((current) => ({
      ...current,
      fixedTeams: (current.fixedTeams || []).map((item) => item.id === team.id ? team : item),
    }));
    setToast("Fixed team updated.");
  };

  const deleteFixedTeam = (teamId) => {
    const team = (state.fixedTeams || []).find((item) => item.id === teamId);
    const used = state.trainingSessions.some((session) => session.fixedTeamId === teamId);
    const message = used
      ? `Delete ${team?.name || "this fixed team"} from templates? Saved trainings will keep the team name.`
      : `Delete ${team?.name || "this fixed team"}?`;
    if (!window.confirm(message)) return;
    setState((current) => ({ ...current, fixedTeams: (current.fixedTeams || []).filter((item) => item.id !== teamId) }));
    setToast("Fixed team deleted.");
  };

  const duplicateFixedTeam = (teamId) => {
    const team = (state.fixedTeams || []).find((item) => item.id === teamId);
    if (!team) return;
    const name = window.prompt("Name the duplicated fixed team:", `${team.name} copy`);
    if (!name || !name.trim()) return;
    const timestamp = new Date().toISOString();
    const copy = {
      ...team,
      id: `team-${Date.now()}`,
      name: name.trim(),
      members: Array.isArray(team.members) ? team.members.map((member) => ({ ...member })) : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setState((current) => ({ ...current, fixedTeams: [copy, ...(current.fixedTeams || [])] }));
    setToast("Fixed team duplicated.");
  };

  const createFixedTeamFromSession = (trainingId) => {
    const session = state.trainingSessions.find((item) => item.id === trainingId);
    const logs = state.trainingLog.filter((log) => log.trainingId === trainingId);
    if (!session || !logs.length) return;
    const name = window.prompt("Name this fixed team template:", session.fixedTeamName || `${session.route} ${session.date}`);
    if (!name || !name.trim()) return;
    const timestamp = new Date().toISOString();
    const team = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      category: "Training Team",
      notes: `Created from training ${session.id} (${session.date}, ${session.route}).`,
      members: logs.map((log) => ({ dogId: log.dogId, position: log.position || "Team" })).filter((member) => member.dogId),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setState((current) => ({ ...current, fixedTeams: [team, ...(current.fixedTeams || [])] }));
    setToast("Fixed team created from training.");
  };

  const applyHealthEventToDog = (dogs, event) => {
    if (!event?.applyToDogProfile || !event.dogId) return dogs;
    return dogs.map((dog) => {
      if (dog.id !== event.dogId) return dog;
      return {
        ...dog,
        healthStatus: event.status || dog.healthStatus,
        lastHeat: event.type === "Heat" ? event.date || dog.lastHeat : dog.lastHeat,
        notes: event.note ? `${dog.notes ? `${dog.notes}\n` : ""}${event.date || ""} ${event.type || "Health"}: ${event.note}` : dog.notes,
      };
    });
  };

  const addHealthEvent = (event) => {
    setState((current) => ({
      ...current,
      dogs: applyHealthEventToDog(current.dogs, event),
      healthEvents: [event, ...(current.healthEvents || [])],
    }));
    setToast(event.applyToDogProfile ? "Health note saved and dog status updated." : "Health note saved.");
  };


  const addHealthEvents = (events = []) => {
    const cleanEvents = Array.isArray(events) ? events.filter(Boolean) : [];
    if (!cleanEvents.length) return;
    setState((current) => ({
      ...current,
      dogs: cleanEvents.reduce((dogs, event) => applyHealthEventToDog(dogs, event), current.dogs),
      healthEvents: [...cleanEvents, ...(current.healthEvents || [])],
    }));
    setToast(`${cleanEvents.length} health notes saved.`);
  };

  const updateHealthEvent = (event) => {
    setState((current) => ({
      ...current,
      dogs: applyHealthEventToDog(current.dogs, event),
      healthEvents: (current.healthEvents || []).map((item) => item.id === event.id ? event : item),
    }));
    setToast(event.applyToDogProfile ? "Health note updated and dog status updated." : "Health note updated.");
  };

  const deleteHealthEvent = (eventId) => {
    if (!window.confirm("Delete this health note?")) return;
    setState((current) => ({ ...current, healthEvents: (current.healthEvents || []).filter((item) => item.id !== eventId) }));
    setToast("Health note deleted.");
  };

  const markBackupDownloaded = () => {
    setState((current) => ({
      ...current,
      meta: { ...(current.meta || {}), lastBackupAt: new Date().toISOString(), lastBackupSessionCount: current.trainingSessions.length },
    }));
  };

  const markExcelExported = () => {
    setState((current) => ({
      ...current,
      meta: { ...(current.meta || {}), lastExcelExportAt: new Date().toISOString() },
    }));
  };

  const restoreState = (newState) => {
    setState(newState);
    setEditingTrainingId(null);
    setPrefillTeam(null);
    setToast("Data restored from backup.");
  };

  const resetAllData = () => {
    const confirmed = window.confirm("Reset all local data to the initial dog list? This deletes local trainings and added routes.");
    if (!confirmed) return;
    setState(cloneDefaultState());
    setEditingTrainingId(null);
    setPrefillTeam(null);
    setActiveTab("dashboard");
    setToast("Local data reset.");
  };

  return (
    <ErrorBoundary onReset={resetAllData}>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Kennel Training Management</p>
            <h1>Dog Training Tracker</h1>
          </div>
          <div className="topbar-actions">
            <div className={cloudStatus.available ? "cloud-pill online" : cloudStatus.loading ? "cloud-pill loading" : "cloud-pill offline"} title={cloudStatus.message}>
              <span aria-hidden="true">{cloudStatus.available ? "☁️" : cloudStatus.loading ? "⏳" : "⚠️"}</span>
              <span>{cloudStatus.available ? "Cloud on" : cloudStatus.loading ? "Cloud..." : "Local"}</span>
            </div>
            <button className="secondary compact-button" onClick={() => syncWithCloud()} disabled={cloudStatus.loading || cloudStatus.saving}>Sync</button>
            <button className="primary mobile-main-action" onClick={() => openTab("quick-training")}>Quick Training</button>
          </div>
        </header>

        <nav className="tabbar clean-tabbar" aria-label="Main navigation">
          <div className="primary-tabs">
            {PRIMARY_TABS.map((tab) => (
              <button key={tab.id} className={activeTab === tab.id ? "tab active" : "tab"} onClick={() => openTab(tab.id)}>
                <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <details className="more-menu">
            <summary className={SECONDARY_TABS.some((tab) => tab.id === activeTab) ? "tab active" : "tab"}>
              <span className="tab-icon" aria-hidden="true">☰</span><span>More</span>
            </summary>
            <div className="more-menu-panel">
              {SECONDARY_TABS.map((tab) => (
                <button key={tab.id} className={activeTab === tab.id ? "tab active" : "tab"} onClick={() => openTab(tab.id)}>
                  <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </details>
        </nav>

        <main className="main-content">
          {activeTab === "dashboard" && <Dashboard dogs={activeDogsWithStats} sessions={state.trainingSessions} logs={state.trainingLog} healthEvents={state.healthEvents || []} meta={state.meta || {}} />}
          {activeTab === "quick-training" && (
            <QuickTraining
              dogs={activeDogsWithStats}
              routes={state.routes}
              guides={state.guides || []}
              fixedTeams={state.fixedTeams || []}
              onSave={saveTraining}
              lastQuickTraining={state.meta?.lastQuickTraining || null}
              backupStatus={backupStatus}
              onOpenFullTraining={() => openTab("new-training")}
            />
          )}
          {activeTab === "new-training" && (
            <NewTraining
              key={editingSession?.id || "new-training"}
              dogs={dogsWithStats}
              routes={state.routes}
              guides={state.guides || []}
              fixedTeams={state.fixedTeams || []}
              initialTeam={prefillTeam}
              onInitialTeamUsed={clearPrefillTeam}
              onSave={editingSession ? updateTraining : saveTraining}
              editSession={editingSession}
              editLogs={editingLogs}
              onCancelEdit={cancelEditTraining}
            />
          )}
          {activeTab === "dogs" && <Dogs dogs={dogsWithStats} logs={state.trainingLog} healthEvents={state.healthEvents || []} onAddDog={addDog} onUpdateDog={updateDog} onSetArchived={setDogArchived} onAddHealthEvent={addHealthEvent} />}
          {activeTab === "team-planner" && <TeamPlanner dogs={activeDogsWithStats} onStartTraining={() => openTab("new-training")} onStartTrainingWithTeam={startTrainingWithTeam} onSaveFixedTeam={addFixedTeam} />}
          {activeTab === "fixed-teams" && <FixedTeams teams={state.fixedTeams || []} dogs={activeDogsWithStats} onAddTeam={addFixedTeam} onUpdateTeam={updateFixedTeam} onDeleteTeam={deleteFixedTeam} onDuplicateTeam={duplicateFixedTeam} />}
          {activeTab === "health" && <HealthNotes dogs={activeDogsWithStats} healthEvents={state.healthEvents || []} onAddEvent={addHealthEvent} onAddEvents={addHealthEvents} onUpdateEvent={updateHealthEvent} onDeleteEvent={deleteHealthEvent} />}
          {activeTab === "sessions" && <TrainingSessions sessions={state.trainingSessions} logs={state.trainingLog} onDeleteTraining={deleteTraining} onEditTraining={startEditTraining} onCreateTeamFromTraining={createFixedTeamFromSession} />}
          {activeTab === "log" && <TrainingLog logs={state.trainingLog} dogs={state.dogs} sessions={state.trainingSessions} />}
          {activeTab === "routes" && <Routes routes={state.routes} onAddRoute={addRoute} onUpdateRoute={updateRoute} onDeleteRoute={deleteRoute} />}
          {activeTab === "guides" && <Guides guides={state.guides || []} onAddGuide={addGuide} onUpdateGuide={updateGuide} onDeleteGuide={deleteGuide} />}
          {activeTab === "data" && <DataManagement state={state} onRestoreState={restoreState} onResetAllData={resetAllData} onBackupDownloaded={markBackupDownloaded} onExcelExported={markExcelExported} cloudStatus={cloudStatus} onSyncCloud={syncWithCloud} onSaveCloud={saveCurrentStateToCloud} cloudAccessCode={cloudAccessCode} onCloudAccessCodeChange={updateCloudAccessCode} />}
        </main>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </ErrorBoundary>
  );
}
