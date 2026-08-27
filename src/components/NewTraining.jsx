import { useEffect, useMemo, useState } from "react";
import { POSITIONS, TRAINING_TYPES, FORM_LABELS } from "../data/options";
import { todayIso } from "../utils/dateUtils";
import { StatusBadge } from "./common";
import { getSuggestedTeam, isDogEligibleForTeam } from "../utils/teamSuggestion";
import { makeTrainingId } from "../utils/ids";

const RESTRICTED_STATUSES = ["Rest", "Injured", "Sick", "In Heat", "Retired"];

const createInitialBasics = () => ({
  date: todayIso(),
  trainingType: "ATV",
  route: "",
  distance: "",
  guide: "",
  generalNote: "",
});

function basicsFromSession(session) {
  if (!session) return createInitialBasics();
  return {
    date: session.date || todayIso(),
    trainingType: session.trainingType || "ATV",
    route: session.route === "Open distance" ? "" : session.route || "",
    distance: session.distance ?? "",
    guide: session.guide || "",
    generalNote: session.generalNote || "",
  };
}

function reviewsFromLogs(logs, defaultDistance) {
  return logs.reduce((acc, log) => {
    acc[log.dogId] = {
      position: log.position || "Team",
      distance: log.distance ?? defaultDistance ?? "",
      form: log.form || 3,
      problem: Boolean(log.problem),
      dogNote: log.dogNote || "",
      finished: log.finished !== false,
      removed: Boolean(log.removed),
      removedReason: log.removedReason || "",
    };
    return acc;
  }, {});
}

export default function NewTraining({ dogs, routes, guides = [], fixedTeams = [], initialTeam = null, onInitialTeamUsed, onSave, editSession = null, editLogs = [], onCancelEdit }) {
  const isEditing = Boolean(editSession);
  const [step, setStep] = useState(1);
  const [basics, setBasics] = useState(() => basicsFromSession(editSession));
  const [selectedDogIds, setSelectedDogIds] = useState(() => editLogs.map((log) => log.dogId).filter(Boolean));
  const [dogReviews, setDogReviews] = useState(() => reviewsFromLogs(editLogs, editSession?.distance || ""));
  const [selectedTeamId, setSelectedTeamId] = useState(() => editSession?.fixedTeamId || "");
  const [search, setSearch] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    if (isEditing || !initialTeam?.members?.length) return;
    const validMembers = initialTeam.members
      .map((member) => ({ ...member, dog: dogs.find((dog) => dog.id === member.dogId) }))
      .filter((member) => member.dog);
    if (!validMembers.length) return;
    setStep(2);
    setSelectedTeamId("");
    setSelectedDogIds(validMembers.map((member) => member.dog.id));
    setDogReviews(() => {
      const next = {};
      validMembers.forEach((member) => {
        next[member.dog.id] = createDefaultReview(member.dog, { position: member.position || member.dog.mainPosition || "Team" });
      });
      return next;
    });
    setReviewIndex(0);
    onInitialTeamUsed?.();
  // This effect consumes a one-time team prefill. Re-running it for form changes would reset the user's selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTeam?.id]);

  const selectedDogs = useMemo(
    () => selectedDogIds.map((id) => dogs.find((dog) => dog.id === id)).filter(Boolean),
    [selectedDogIds, dogs]
  );

  const filteredDogs = useMemo(() => {
    const value = search.trim().toLowerCase();
    return dogs.filter((dog) => (!dog.archived || selectedDogIds.includes(dog.id)) && (!value || dog.name.toLowerCase().includes(value)));
  }, [dogs, search, selectedDogIds]);

  const selectedByPosition = useMemo(() => {
    return POSITIONS.map((position) => ({
      position,
      dogs: selectedDogs.filter((dog) => (dogReviews[dog.id]?.position || dog.mainPosition || "Team") === position),
    }));
  }, [selectedDogs, dogReviews]);

  const updateBasics = (key, value) => {
    if (key === "route") {
      const route = routes.find((item) => item.name === value);
      setBasics((current) => ({ ...current, route: value, distance: route?.distance || current.distance }));
      return;
    }
    setBasics((current) => ({ ...current, [key]: value }));
  };


  const setQuickDistance = (distance) => {
    setBasics((current) => ({ ...current, distance: String(distance) }));
  };

  const adjustQuickDistance = (amount) => {
    setBasics((current) => {
      const currentDistance = Number(current.distance || 0);
      const nextDistance = Math.max(0, Math.round((currentDistance + amount) * 10) / 10);
      return { ...current, distance: String(nextDistance) };
    });
  };

  const createDefaultReview = (dog, overrides = {}) => ({
    position: dog?.suggestedPosition || dog?.mainPosition || "Team",
    distance: basics.distance || "",
    form: dog?.form || 3,
    problem: false,
    dogNote: "",
    finished: true,
    removed: false,
    removedReason: "",
    ...overrides,
  });

  const toggleDog = (dog) => {
    setSelectedTeamId("");
    setSelectedDogIds((current) => {
      const exists = current.includes(dog.id);
      const next = exists ? current.filter((id) => id !== dog.id) : [...current, dog.id];
      if (!exists) {
        setDogReviews((reviews) => ({ ...reviews, [dog.id]: createDefaultReview(dog) }));
      }
      if (exists) {
        setDogReviews((reviews) => {
          const nextReviews = { ...reviews };
          delete nextReviews[dog.id];
          return nextReviews;
        });
      }
      return next;
    });
  };

  const updateReview = (dogId, key, value) => {
    const dog = dogs.find((item) => item.id === dogId);
    setDogReviews((current) => ({
      ...current,
      [dogId]: {
        ...createDefaultReview(dog),
        ...(current[dogId] || {}),
        [key]: value,
      },
    }));
  };

  const selectVisibleActiveDogs = () => {
    setSelectedTeamId("");
    const safeDogs = filteredDogs.filter(isDogEligibleForTeam);
    setSelectedDogIds((current) => Array.from(new Set([...current, ...safeDogs.map((dog) => dog.id)])));
    setDogReviews((current) => {
      const next = { ...current };
      safeDogs.forEach((dog) => {
        if (!next[dog.id]) next[dog.id] = createDefaultReview(dog);
      });
      return next;
    });
  };

  const applyFixedTeam = (teamId) => {
    setSelectedTeamId(teamId);
    const team = fixedTeams.find((item) => item.id === teamId);
    if (!team) return;
    const members = Array.isArray(team.members) ? team.members : [];
    const validMembers = members
      .map((member) => ({ ...member, dog: dogs.find((dog) => dog.id === member.dogId) }))
      .filter((member) => member.dog && !member.dog.archived);

    setSelectedDogIds(validMembers.map((member) => member.dog.id));
    setDogReviews(() => {
      const next = {};
      validMembers.forEach((member) => {
        next[member.dog.id] = createDefaultReview(member.dog, { position: member.position || member.dog.mainPosition || "Team" });
      });
      return next;
    });
    setReviewIndex(0);
  };

  const selectSuggestedTeam = () => {
    const suggested = getSuggestedTeam(filteredDogs, 8);
    setSelectedTeamId("");
    setSelectedDogIds(suggested.map((dog) => dog.id));
    setDogReviews(() => {
      const next = {};
      suggested.forEach((dog) => {
        next[dog.id] = createDefaultReview(dog, { position: dog.suggestedPosition || dog.mainPosition || "Team" });
      });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedTeamId("");
    setSelectedDogIds([]);
    setDogReviews({});
    setReviewIndex(0);
  };

  const applySessionDistanceToAllDogs = () => {
    setDogReviews((current) => {
      const next = { ...current };
      selectedDogIds.forEach((dogId) => {
        const dog = dogs.find((item) => item.id === dogId);
        next[dogId] = { ...createDefaultReview(dog), ...(next[dogId] || {}), distance: basics.distance || "" };
      });
      return next;
    });
  };

  const resetFlow = () => {
    const confirmed = window.confirm(isEditing ? "Clear your unsaved edits and return to Sessions?" : "Clear this unsaved training entry?");
    if (!confirmed) return;
    if (isEditing) {
      onCancelEdit?.();
      return;
    }
    setStep(1);
    setBasics(createInitialBasics());
    setSelectedTeamId("");
    setSelectedDogIds([]);
    setDogReviews({});
    setSearch("");
    setReviewIndex(0);
  };

  const canGoNext = () => {
    if (step === 1) return basics.date && basics.trainingType && basics.distance && basics.guide;
    if (step === 2) return selectedDogIds.length > 0;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) {
      alert(step === 1 ? "Please add date, training type, distance and guide." : "Please select at least one dog.");
      return;
    }
    if (step === 1 && selectedTeamId && selectedDogIds.length === 0) applyFixedTeam(selectedTeamId);
    if (step === 2) setReviewIndex(0);
    setStep((current) => Math.min(4, current + 1));
  };

  const saveQuickFixedTeam = (teamId = selectedTeamId) => {
    if (isEditing) return;
    if (!basics.date || !basics.trainingType || !basics.distance || !basics.guide) {
      alert("Please add date, training type, distance and guide first.");
      return;
    }
    const team = fixedTeams.find((item) => item.id === teamId);
    if (!team) {
      alert("Please select a fixed team for quick save.");
      return;
    }
    const members = (team.members || [])
      .map((member) => ({ ...member, dog: dogs.find((dog) => dog.id === member.dogId) }))
      .filter((member) => member.dog && !member.dog.archived);
    if (!members.length) {
      alert("This fixed team has no valid dogs.");
      return;
    }
    const confirmed = window.confirm(`Quick save ${team.name} with ${members.length} dogs? You can edit the training later if needed.`);
    if (!confirmed) return;
    const trainingId = makeTrainingId();
    const timestamp = new Date().toISOString();
    const session = {
      id: trainingId,
      date: basics.date,
      route: basics.route || "Open distance",
      distance: Number(basics.distance || 0),
      trainingType: basics.trainingType,
      guide: basics.guide,
      fixedTeamId: team.id,
      fixedTeamName: team.name,
      numberOfDogs: members.length,
      generalNote: basics.generalNote,
      createdAt: timestamp,
      updatedAt: "",
    };
    const logEntries = members.map((member, index) => ({
      id: `${trainingId}-${member.dog.id}-${index}`,
      trainingId,
      date: session.date,
      dogId: member.dog.id,
      dogName: member.dog.name,
      sex: member.dog.sex,
      route: session.route,
      distance: Number(basics.distance || 0),
      position: member.position || member.dog.mainPosition || "Team",
      trainingType: session.trainingType,
      guide: session.guide,
      fixedTeamId: team.id,
      fixedTeamName: team.name,
      form: Number(member.dog.form || 3),
      problem: false,
      dogNote: "",
      finished: true,
      removed: false,
      removedReason: "",
      createdAt: timestamp,
      updatedAt: "",
    }));
    onSave({ session, logEntries });
    setStep(1);
    setBasics(createInitialBasics());
    setSelectedTeamId("");
    setSelectedDogIds([]);
    setDogReviews({});
    setSearch("");
    setReviewIndex(0);
  };

  const save = () => {
    const confirmed = window.confirm(`${isEditing ? "Update" : "Save"} this training with ${selectedDogs.length} dogs?`);
    if (!confirmed) return;
    const trainingId = editSession?.id || makeTrainingId();
    const timestamp = new Date().toISOString();
    const session = {
      id: trainingId,
      date: basics.date,
      route: basics.route || "Open distance",
      distance: Number(basics.distance || 0),
      trainingType: basics.trainingType,
      guide: basics.guide,
      fixedTeamId: selectedTeamId,
      fixedTeamName: fixedTeams.find((team) => team.id === selectedTeamId)?.name || "",
      numberOfDogs: selectedDogs.length,
      generalNote: basics.generalNote,
      createdAt: editSession?.createdAt || timestamp,
      updatedAt: isEditing ? timestamp : "",
    };
    const logEntries = selectedDogs.map((dog, index) => {
      const review = dogReviews[dog.id] || {};
      const oldLog = editLogs.find((log) => log.dogId === dog.id);
      return {
        id: oldLog?.id || `${trainingId}-${dog.id}-${index}`,
        trainingId,
        date: session.date,
        dogId: dog.id,
        dogName: dog.name,
        sex: dog.sex,
        route: session.route,
        distance: Number(review.distance || basics.distance || 0),
        position: review.position || dog.mainPosition || "Team",
        trainingType: session.trainingType,
        guide: session.guide,
        fixedTeamId: session.fixedTeamId,
        fixedTeamName: session.fixedTeamName,
        form: Number(review.form || 3),
        problem: Boolean(review.problem),
        dogNote: review.dogNote || "",
        finished: review.finished !== false,
        removed: Boolean(review.removed),
        removedReason: review.removedReason || "",
        createdAt: oldLog?.createdAt || timestamp,
        updatedAt: isEditing ? timestamp : "",
      };
    });
    onSave({ session, logEntries });
    if (!isEditing) {
      setStep(1);
      setBasics(createInitialBasics());
      setSelectedTeamId("");
      setSelectedDogIds([]);
      setDogReviews({});
      setSearch("");
      setReviewIndex(0);
    }
  };

  const currentDog = selectedDogs[reviewIndex];

  return (
    <section className="page-grid training-flow">
      <div className="page-header split">
        <div>
          <p className="eyebrow">{isEditing ? "Edit saved training" : "Fast mobile entry"}</p>
          <h2>{isEditing ? `Edit Training ${editSession.id}` : "New Training Entry"}</h2>
        </div>
        {isEditing && <button className="ghost" onClick={onCancelEdit}>Cancel edit</button>}
      </div>

      <div className="stepper">
        {["Basics", "Dogs", "Review", isEditing ? "Update" : "Save"].map((label, index) => (
          <div className={step === index + 1 ? "step active" : step > index + 1 ? "step done" : "step"} key={label}>
            <span>{index + 1}</span>{label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <section className="panel flow-panel">
          <h3>Step 1 · Training basics</h3>
          <div className="form-grid">
            <label>Date<input type="date" value={basics.date} onChange={(event) => updateBasics("date", event.target.value)} /></label>
            <label>Training Type<select value={basics.trainingType} onChange={(event) => updateBasics("trainingType", event.target.value)}>{TRAINING_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Route<select value={basics.route} onChange={(event) => updateBasics("route", event.target.value)}><option value="">Open distance</option>{routes.map((route) => <option key={route.id} value={route.name}>{route.name}</option>)}</select></label>
            <label>Distance in km<input inputMode="decimal" type="number" min="0" step="0.1" value={basics.distance} onChange={(event) => updateBasics("distance", event.target.value)} placeholder="e.g. 8.5" /></label>
            <label>Guide
              <input list="guide-options" value={basics.guide} onChange={(event) => updateBasics("guide", event.target.value)} placeholder="Guide name" />
              <datalist id="guide-options">{guides.map((guide) => <option key={guide} value={guide} />)}</datalist>
            </label>
            <label className="full-span">General training note<textarea value={basics.generalNote} onChange={(event) => updateBasics("generalNote", event.target.value)} placeholder="Weather, trail condition, general notes" /></label>
          </div>
          {!isEditing && (
            <div className="quick-mobile-flow">
              <div>
                <h4>Quick mobile flow</h4>
                <p className="muted-text">Tap route, team and guide cards for a faster phone entry. You can still use the fields above if you need custom values.</p>
              </div>
              {!!routes.length && (
                <div>
                  <strong className="mini-label">1 · Route</strong>
                  <div className="quick-card-row">
                    <button type="button" className={!basics.route ? "mini-choice selected" : "mini-choice"} onClick={() => updateBasics("route", "")}>Open distance</button>
                    {routes.filter((route) => route.name !== "Open distance").map((route) => (
                      <button type="button" key={route.id} className={basics.route === route.name ? "mini-choice selected" : "mini-choice"} onClick={() => updateBasics("route", route.name)}>
                        {route.name}<small>{route.distance ? `${route.distance} km` : "custom km"}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <strong className="mini-label">2 · Distance</strong>
                <div className="quick-distance-row">
                  <button type="button" className="mini-choice" onClick={() => adjustQuickDistance(-1)}>−1 km</button>
                  <input
                    className="quick-distance-input"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.1"
                    value={basics.distance}
                    onChange={(event) => updateBasics("distance", event.target.value)}
                    placeholder="km"
                  />
                  <button type="button" className="mini-choice" onClick={() => adjustQuickDistance(1)}>+1 km</button>
                  {[5, 8, 10, 12, 15, 20].map((distance) => (
                    <button type="button" key={distance} className={Number(basics.distance) === distance ? "mini-choice selected" : "mini-choice"} onClick={() => setQuickDistance(distance)}>{distance} km</button>
                  ))}
                </div>
              </div>
              {!!guides.length && (
                <div>
                  <strong className="mini-label">3 · Guide</strong>
                  <div className="quick-card-row">
                    {guides.map((guide) => (
                      <button type="button" key={guide} className={basics.guide === guide ? "mini-choice selected" : "mini-choice"} onClick={() => updateBasics("guide", guide)}>{guide}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!isEditing && !!fixedTeams.length && (
            <div className="quick-training-card">
              <div>
                <h4>Quick training with fixed team</h4>
                <p className="muted-text">For simple runs: choose route, distance, guide and a fixed team, then save immediately. Individual dog notes can still be edited later.</p>
                <div className="quick-save-distance">
                  <strong>Quick distance</strong>
                  <div className="quick-distance-row compact">
                    <button type="button" className="mini-choice" onClick={() => adjustQuickDistance(-1)}>−1</button>
                    <input inputMode="decimal" type="number" min="0" step="0.1" value={basics.distance} onChange={(event) => updateBasics("distance", event.target.value)} placeholder="km" />
                    <button type="button" className="mini-choice" onClick={() => adjustQuickDistance(1)}>+1</button>
                  </div>
                </div>
              </div>
              <div className="quick-team-card-grid">
                {fixedTeams.map((team) => (
                  <button
                    type="button"
                    key={team.id}
                    className={selectedTeamId === team.id ? "quick-team-card selected" : "quick-team-card"}
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    <strong>{team.name}</strong>
                    <span>{team.category || "Custom"} · {(team.members || []).filter((member) => dogs.some((dog) => dog.id === member.dogId && !dog.archived)).length} active dogs</span>
                    {team.notes && <small>{team.notes}</small>}
                  </button>
                ))}
              </div>
              <div className="quick-training-actions">
                <button className="secondary" onClick={() => selectedTeamId && applyFixedTeam(selectedTeamId)} disabled={!selectedTeamId}>Load team for review</button>
                <button className="primary" onClick={() => saveQuickFixedTeam()} disabled={!selectedTeamId}>Quick save training</button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="panel flow-panel">
          <h3>Step 2 · Select dogs</h3>
          {!!fixedTeams.length && (
            <label className="fixed-team-select">Fixed team template
              <select value={selectedTeamId} onChange={(event) => applyFixedTeam(event.target.value)}>
                <option value="">No fixed team selected</option>
                {fixedTeams.map((team) => <option key={team.id} value={team.id}>{team.name} · {(team.members || []).filter((member) => dogs.some((dog) => dog.id === member.dogId && !dog.archived)).length} active dogs</option>)}
              </select>
            </label>
          )}
          <input className="large-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dogs" />
          <div className="selection-tools">
            <p className="helper-text">Selected dogs: {selectedDogIds.length}</p>
            <div className="button-row">
              <button className="secondary" onClick={selectSuggestedTeam}>Suggest 8 dogs</button>
              <button className="secondary" onClick={selectVisibleActiveDogs}>Select visible active dogs</button>
              <button className="ghost" onClick={clearSelection}>Clear selection</button>
              <button className="primary" onClick={() => setStep(4)} disabled={!canGoNext()}>Skip review</button>
            </div>
          </div>
          {!!selectedDogs.length && <TeamPreview selectedByPosition={selectedByPosition} />}
          <div className="select-dog-grid">
            {filteredDogs.map((dog) => {
              const selected = selectedDogIds.includes(dog.id);
              const restricted = !isDogEligibleForTeam(dog);
              return (
                <button key={dog.id} className={selected ? "select-dog-card selected" : "select-dog-card"} onClick={() => toggleDog(dog)}>
                  <span><strong>{dog.name}</strong><small>{dog.sex} · {dog.mainPosition || "Team"}</small></span>
                  <span className="selection-indicator">{selected ? "✓" : "+"}</span>
                  {restricted && <StatusBadge value={dog.healthStatus} />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 3 && currentDog && (
        <section className="panel flow-panel dog-review-panel">
          <div className="review-head">
            <div>
              <p className="eyebrow">Dog {reviewIndex + 1} of {selectedDogs.length}</p>
              <h3>{currentDog.name}</h3>
              <StatusBadge value={currentDog.healthStatus} />
              {RESTRICTED_STATUSES.includes(currentDog.healthStatus) && <p className="warning-text">Check this dog carefully before using it in training.</p>}
            </div>
            <div className="review-nav">
              <button className="ghost" disabled={reviewIndex === 0} onClick={() => setReviewIndex((value) => Math.max(0, value - 1))}>‹ Previous</button>
              <button className="ghost" disabled={reviewIndex === selectedDogs.length - 1} onClick={() => setReviewIndex((value) => Math.min(selectedDogs.length - 1, value + 1))}>Next ›</button>
            </div>
          </div>

          <div className="button-row review-tools">
            <button className="secondary" onClick={applySessionDistanceToAllDogs}>Apply session distance to all selected dogs</button>
          </div>
          <div className="review-dog-jump-list" aria-label="Selected dogs">
            {selectedDogs.map((dog, index) => (
              <button
                key={dog.id}
                className={index === reviewIndex ? "dog-jump active" : "dog-jump"}
                onClick={() => setReviewIndex(index)}
                type="button"
              >
                <span>{index + 1}</span>{dog.name}
              </button>
            ))}
          </div>
          <DogReviewForm dog={currentDog} review={dogReviews[currentDog.id] || {}} updateReview={updateReview} defaultDistance={basics.distance} />
        </section>
      )}

      {step === 4 && (
        <section className="panel flow-panel">
          <h3>Step 4 · Confirm and {isEditing ? "update" : "save"}</h3>
          <div className="summary-card">
            <p><strong>Date:</strong> {basics.date}</p>
            <p><strong>Type:</strong> {basics.trainingType}</p>
            <p><strong>Route:</strong> {basics.route || "Open distance"}</p>
            <p><strong>Distance:</strong> {basics.distance} km</p>
            <p><strong>Guide:</strong> {basics.guide}</p>
            <p><strong>Dogs:</strong> {selectedDogs.length}</p>
            <p><strong>Fixed team:</strong> {fixedTeams.find((team) => team.id === selectedTeamId)?.name || "—"}</p>
          </div>
          <TeamPreview selectedByPosition={selectedByPosition} />
          <button className="primary save-button" onClick={save}>✓ {isEditing ? "Update training" : "Save training"}</button>
        </section>
      )}

      <div className="flow-actions">
        <button className="ghost" onClick={resetFlow}>{isEditing ? "Cancel" : "Clear"}</button>
        <button className="ghost" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>Back</button>
        {step < 4 && <button className="primary" onClick={goNext}>Next</button>}
      </div>
    </section>
  );
}

function TeamPreview({ selectedByPosition }) {
  return (
    <div className="team-preview">
      {selectedByPosition.map(({ position, dogs }) => (
        <div className="team-preview-slot" key={position}>
          <strong>{position}</strong>
          <span>{dogs.length ? dogs.map((dog) => dog.name).join(", ") : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function DogReviewForm({ dog, review, updateReview, defaultDistance }) {
  const value = (key, fallback) => review[key] ?? fallback;
  return (
    <div className="dog-review-form">
      <label>Position<select value={value("position", dog.mainPosition || "Team")} onChange={(event) => updateReview(dog.id, "position", event.target.value)}>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</select></label>
      <label>Distance km<input type="number" min="0" step="0.1" value={value("distance", defaultDistance || "")} onChange={(event) => updateReview(dog.id, "distance", event.target.value)} /></label>
      <label>Form<select value={value("form", 3)} onChange={(event) => updateReview(dog.id, "form", Number(event.target.value))}>{Object.entries(FORM_LABELS).map(([score, label]) => <option value={score} key={score}>{score} · {label}</option>)}</select></label>
      <div className="checkbox-row full-span">
        <label><input type="checkbox" checked={Boolean(value("problem", false))} onChange={(event) => updateReview(dog.id, "problem", event.target.checked)} /> Problem</label>
        <label><input type="checkbox" checked={Boolean(value("finished", true))} onChange={(event) => updateReview(dog.id, "finished", event.target.checked)} /> Finished</label>
        <label><input type="checkbox" checked={Boolean(value("removed", false))} onChange={(event) => updateReview(dog.id, "removed", event.target.checked)} /> Removed</label>
      </div>
      {value("removed", false) && <label className="full-span">Removed Reason<input value={value("removedReason", "")} onChange={(event) => updateReview(dog.id, "removedReason", event.target.value)} placeholder="Reason if removed" /></label>}
      <label className="full-span">Dog Note<textarea value={value("dogNote", "")} onChange={(event) => updateReview(dog.id, "dogNote", event.target.value)} placeholder="Short note for this dog" /></label>
    </div>
  );
}
