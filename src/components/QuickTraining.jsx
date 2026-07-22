import { useEffect, useMemo, useState } from "react";
import { TRAINING_TYPES } from "../data/options";
import { todayIso } from "../utils/dateUtils";
import { EmptyState, StatusBadge } from "./common";

const QUICK_KM = [3, 5, 8, 10, 12, 15, 20, 25];

function makeTrainingId() {
  return `TR-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}`;
}

export default function QuickTraining({ dogs, routes = [], guides = [], fixedTeams = [], lastQuickTraining = null, backupStatus = null, onSave, onOpenFullTraining }) {
  const [date, setDate] = useState(todayIso());
  const [trainingType, setTrainingType] = useState(lastQuickTraining?.trainingType || "ATV");
  const [routeName, setRouteName] = useState(lastQuickTraining?.routeName || "");
  const [distance, setDistance] = useState(lastQuickTraining?.distance ? String(lastQuickTraining.distance) : "");
  const [guide, setGuide] = useState(lastQuickTraining?.guide || guides[0] || "");
  const [teamId, setTeamId] = useState(lastQuickTraining?.teamId || "");
  const [teamMode, setTeamMode] = useState(lastQuickTraining?.dogIds?.length ? "individual" : "fixed");
  const [selectedDogIds, setSelectedDogIds] = useState(lastQuickTraining?.dogIds || []);
  const [dogSearch, setDogSearch] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState("route");


  useEffect(() => {
    if (!lastQuickTraining) return;
    if (!teamId && lastQuickTraining.teamId && fixedTeams.some((team) => team.id === lastQuickTraining.teamId)) {
      setTeamId(lastQuickTraining.teamId);
    }
    if (!guide && lastQuickTraining.guide) setGuide(lastQuickTraining.guide);
    if (!routeName && lastQuickTraining.routeName) setRouteName(lastQuickTraining.routeName);
    if (!distance && lastQuickTraining.distance) setDistance(String(lastQuickTraining.distance));
    if (lastQuickTraining.trainingType) setTrainingType(lastQuickTraining.trainingType);
  }, [lastQuickTraining, fixedTeams, teamId, guide, routeName, distance]);

  const useLastSetup = () => {
    if (!lastQuickTraining) return;
    setTrainingType(lastQuickTraining.trainingType || "ATV");
    setRouteName(lastQuickTraining.routeName || "");
    setDistance(lastQuickTraining.distance ? String(lastQuickTraining.distance) : "");
    setGuide(lastQuickTraining.guide || guides[0] || "");
    setTeamId(lastQuickTraining.teamId || "");
    setTeamMode(lastQuickTraining.dogIds?.length ? "individual" : "fixed");
    setSelectedDogIds(lastQuickTraining.dogIds || []);
    setStep("save");
  };

  const selectableRoutes = useMemo(() => routes.filter((route) => route.name !== "Open distance"), [routes]);
  const selectedTeam = fixedTeams.find((team) => team.id === teamId) || null;
  const teamDogs = useMemo(() => {
    if (teamMode === "individual") {
      return selectedDogIds.map((dogId) => dogs.find((dog) => dog.id === dogId)).filter(Boolean)
        .map((dog) => ({ dog, position: dog.mainPosition || "Team" }));
    }
    if (!selectedTeam) return [];
    return (selectedTeam.members || [])
      .map((member) => ({ ...member, dog: dogs.find((dog) => dog.id === member.dogId) }))
      .filter((member) => member.dog);
  }, [teamMode, selectedDogIds, selectedTeam, dogs]);

  const filteredDogs = useMemo(() => {
    const query = dogSearch.trim().toLowerCase();
    return [...dogs]
      .filter((dog) => !query || dog.name.toLowerCase().includes(query))
      .sort((a, b) => Number(a.stats?.seasonKm || 0) - Number(b.stats?.seasonKm || 0));
  }, [dogs, dogSearch]);

  const toggleDog = (dogId) => setSelectedDogIds((current) => current.includes(dogId)
    ? current.filter((id) => id !== dogId)
    : [...current, dogId]);

  const chooseRoute = (route) => {
    setRouteName(route?.name || "");
    if (route?.distance !== undefined && route.distance !== "") setDistance(String(route.distance));
    setStep("km");
  };

  const teamName = teamMode === "individual" ? "Individual" : selectedTeam?.name || "";
  const canSave = date && trainingType && Number(distance) > 0 && guide.trim() && teamDogs.length > 0 && (teamMode === "individual" || selectedTeam);

  const save = () => {
    if (!canSave) {
      alert("Please choose date, training type, distance, guide and at least one dog.");
      return;
    }
    const confirmed = window.confirm(`Save quick training with ${teamName} and ${teamDogs.length} dogs?`);
    if (!confirmed) return;

    const trainingId = makeTrainingId();
    const timestamp = new Date().toISOString();
    const session = {
      id: trainingId,
      date,
      route: routeName || "Open distance",
      distance: Number(distance || 0),
      trainingType,
      guide: guide.trim(),
      fixedTeamId: teamMode === "fixed" ? selectedTeam.id : "",
      fixedTeamName: teamName,
      numberOfDogs: teamDogs.length,
      generalNote: note,
      createdAt: timestamp,
      updatedAt: "",
    };

    const logEntries = teamDogs.map((member, index) => ({
      id: `${trainingId}-${member.dog.id}-${index}`,
      trainingId,
      date: session.date,
      dogId: member.dog.id,
      dogName: member.dog.name,
      sex: member.dog.sex,
      route: session.route,
      distance: Number(distance || 0),
      position: member.position || member.dog.mainPosition || "Team",
      trainingType: session.trainingType,
      guide: session.guide,
      fixedTeamId: teamMode === "fixed" ? selectedTeam.id : "",
      fixedTeamName: teamName,
      form: Number(member.dog.form || 3),
      problem: false,
      dogNote: "",
      finished: true,
      removed: false,
      removedReason: "",
      createdAt: timestamp,
      updatedAt: "",
    }));

    onSave({
      session,
      logEntries,
      quickMeta: {
        lastQuickTraining: {
          routeName,
          distance: Number(distance || 0),
          guide: session.guide,
          teamId: teamMode === "fixed" ? selectedTeam.id : "",
          teamName,
          dogIds: teamMode === "individual" ? teamDogs.map((member) => member.dog.id) : [],
          trainingType: session.trainingType,
          savedAt: timestamp,
        },
      },
    });
    setDate(todayIso());
    setRouteName("");
    setDistance("");
    setTeamId("");
    setTeamMode("fixed");
    setSelectedDogIds([]);
    setDogSearch("");
    setNote("");
    setStep("route");
  };

  return (
    <section className="page-grid quick-training-page">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Fastest phone entry</p>
          <h2>Quick Training</h2>
          <p className="muted-text">Use a fixed team or quickly pick individual dogs. Details can be edited afterwards in Sessions.</p>
        </div>
        <button className="secondary" onClick={onOpenFullTraining}>Open full training entry</button>
      </div>

      {lastQuickTraining && (
        <section className="panel last-used-panel">
          <div>
            <p className="eyebrow">Last used setup</p>
            <h3>{lastQuickTraining.routeName || "Open distance"} · {lastQuickTraining.distance || "—"} km · {lastQuickTraining.teamName || "Team"}</h3>
            <p className="muted-text">Guide: {lastQuickTraining.guide || "—"} · Type: {lastQuickTraining.trainingType || "ATV"}</p>
          </div>
          <button className="primary" onClick={useLastSetup}>Use last setup</button>
        </section>
      )}

      {backupStatus?.sessionsSinceBackup >= 5 && (
        <section className="panel warning-panel backup-dashboard-warning quick-backup-warning">
          <h3>Backup soon</h3>
          <p>You have saved {backupStatus.sessionsSinceBackup} trainings since the last JSON backup. It is safest to download a backup before uploading a new website version.</p>
        </section>
      )}

      <section className="panel quick-training-summary">
        <div className="quick-summary-grid">
          <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Type<select value={trainingType} onChange={(event) => setTrainingType(event.target.value)}>{TRAINING_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Distance km<input inputMode="decimal" type="number" min="0" step="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} placeholder="e.g. 10" /></label>
          <label>Guide<input list="quick-guide-options" value={guide} onChange={(event) => setGuide(event.target.value)} placeholder="Guide" /><datalist id="quick-guide-options">{guides.map((item) => <option key={item} value={item} />)}</datalist></label>
        </div>
        <div className="quick-pill-row">
          <span className="pill">Route: {routeName || "Open distance"}</span>
          <span className="pill">Team: {teamDogs.length ? teamName : "Not selected"}</span>
          <span className="pill">Dogs: {teamDogs.length}</span>
        </div>
      </section>

      <div className="quick-step-nav">
        {["route", "km", "team", "guide", "save"].map((item) => (
          <button key={item} className={step === item ? "status-chip active" : "status-chip"} onClick={() => setStep(item)}>{item}</button>
        ))}
      </div>

      {step === "route" && (
        <section className="panel">
          <h3>1 · Choose route</h3>
          <div className="selection-card-grid">
            <button className={!routeName ? "selection-card selected" : "selection-card"} onClick={() => chooseRoute(null)}>
              <strong>Open distance</strong><small>Use custom km</small>
            </button>
            {selectableRoutes.map((route) => (
              <button key={route.id} className={routeName === route.name ? "selection-card selected" : "selection-card"} onClick={() => chooseRoute(route)}>
                <strong>{route.name}</strong><small>{route.distance ? `${route.distance} km` : "Custom km"} · {route.difficulty || "Variable"}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "km" && (
        <section className="panel">
          <h3>2 · Enter kilometers</h3>
          <div className="quick-distance-big">
            <button className="secondary" onClick={() => setDistance(String(Math.max(0, Number(distance || 0) - 1)))}>−1</button>
            <input inputMode="decimal" type="number" min="0" step="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} placeholder="km" />
            <button className="secondary" onClick={() => setDistance(String(Number(distance || 0) + 1))}>+1</button>
          </div>
          <div className="quick-distance-row">
            {QUICK_KM.map((km) => <button key={km} className="status-chip" onClick={() => setDistance(String(km))}>{km} km</button>)}
          </div>
          <button className="primary" onClick={() => setStep("team")}>Next: team</button>
        </section>
      )}

      {step === "team" && (
        <section className="panel">
          <div className="team-mode-switch" role="group" aria-label="Team selection mode">
            <button className={teamMode === "fixed" ? "status-chip active" : "status-chip"} onClick={() => setTeamMode("fixed")}>Fixed team</button>
            <button className={teamMode === "individual" ? "status-chip active" : "status-chip"} onClick={() => { setTeamMode("individual"); setTeamId(""); }}>Individual</button>
          </div>
          <h3>3 · {teamMode === "individual" ? "Choose individual dogs" : "Choose fixed team"}</h3>
          {teamMode === "fixed" && (!fixedTeams.length ? (
            <EmptyState title="No fixed teams yet" text="Choose Individual to select dogs yourself." />
          ) : (
            <div className="selection-card-grid">
              {fixedTeams.map((team) => (
                <button key={team.id} className={teamId === team.id ? "selection-card selected" : "selection-card"} onClick={() => { setTeamId(team.id); setStep("guide"); }}>
                  <strong>{team.name}</strong>
                  <small>{team.category || "Custom"} · {(team.members || []).length} dogs</small>
                  <span className="muted-text">{(team.members || []).slice(0, 6).map((member) => dogs.find((dog) => dog.id === member.dogId)?.name).filter(Boolean).join(", ")}</span>
                </button>
              ))}
            </div>
          ))}
          {teamMode === "individual" && (
            <div className="individual-dog-picker">
              <div className="individual-picker-head">
                <label>Find dog<input type="search" value={dogSearch} onChange={(event) => setDogSearch(event.target.value)} placeholder="Search by name" /></label>
                <span className="pill">{selectedDogIds.length} selected</span>
              </div>
              <p className="muted-text">Dogs with the fewest season kilometers are shown first.</p>
              <div className="quick-dog-grid">
                {filteredDogs.map((dog) => {
                  const selected = selectedDogIds.includes(dog.id);
                  return (
                    <button type="button" key={dog.id} aria-pressed={selected} className={selected ? "select-dog-card selected" : "select-dog-card"} onClick={() => toggleDog(dog.id)}>
                      <span className="quick-dog-card-head"><strong>{dog.name}</strong><StatusBadge value={dog.healthStatus} /></span>
                      <small>{Number(dog.stats?.seasonKm || 0).toFixed(1)} km this season · {dog.stats?.numberOfRuns || 0} runs</small>
                      <small>{dog.stats?.daysSinceLastTraining === "" ? "Never trained" : `${dog.stats.daysSinceLastTraining} days since last training`}</small>
                    </button>
                  );
                })}
              </div>
              <button className="primary" disabled={!selectedDogIds.length} onClick={() => setStep("guide")}>Next: guide ({selectedDogIds.length})</button>
            </div>
          )}
        </section>
      )}

      {step === "guide" && (
        <section className="panel">
          <h3>4 · Choose guide</h3>
          <div className="selection-card-grid compact-selection">
            {guides.map((item) => (
              <button key={item} className={guide === item ? "selection-card selected" : "selection-card"} onClick={() => { setGuide(item); setStep("save"); }}><strong>{item}</strong></button>
            ))}
          </div>
          <label className="full-span">Or type guide name<input value={guide} onChange={(event) => setGuide(event.target.value)} placeholder="Guide name" /></label>
          <label className="full-span">Optional note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Weather, trail, quick note" /></label>
          <button className="primary" onClick={() => setStep("save")}>Next: save</button>
        </section>
      )}

      {step === "save" && (
        <section className="panel">
          <h3>5 · Save quick training</h3>
          <div className="confirmation-card">
            <dl className="details-list">
              <div><dt>Date</dt><dd>{date}</dd></div>
              <div><dt>Type</dt><dd>{trainingType}</dd></div>
              <div><dt>Route</dt><dd>{routeName || "Open distance"}</dd></div>
              <div><dt>Distance</dt><dd>{distance || "—"} km</dd></div>
              <div><dt>Guide</dt><dd>{guide || "—"}</dd></div>
              <div><dt>Team</dt><dd>{teamDogs.length ? teamName : "—"}</dd></div>
            </dl>
            <div className="team-overview-grid">
              {teamDogs.map((member) => <span className="pill" key={member.dog.id}>{member.position || member.dog.mainPosition || "Team"}: {member.dog.name} <StatusBadge value={member.dog.healthStatus} /></span>)}
            </div>
            {note && <p className="note-box">{note}</p>}
          </div>
          <div className="form-actions sticky-actions">
            <button className="primary" disabled={!canSave} onClick={save}>Quick save training</button>
            <button className="secondary" onClick={onOpenFullTraining}>Use full entry instead</button>
          </div>
        </section>
      )}
    </section>
  );
}
