import { useMemo, useState } from "react";
import { EmptyState, StatusBadge } from "./common";
import { formatDate, todayIso } from "../utils/dateUtils";
import { downloadCsv, healthHeaders } from "../utils/exportCsv";

const EVENT_TYPES = ["Health Note", "Heat", "Injury", "Sick", "Vet", "Paws", "Rest", "Medication", "Other"];
const PROFILE_STATUSES = ["Rest", "Injured", "Sick", "In Heat", "Light Training", "Watch", "Active", "Build-up", "Retired"];

function emptyDraft(dogs) {
  return {
    id: "",
    dogId: dogs?.[0]?.id || "",
    date: todayIso(),
    type: "Health Note",
    status: "Watch",
    note: "",
    nextCheck: "",
    applyToDogProfile: false,
  };
}

export default function HealthNotes({ dogs = [], healthEvents = [], onAddEvent, onUpdateEvent, onDeleteEvent }) {
  const [draft, setDraft] = useState(() => emptyDraft(dogs));
  const [editingId, setEditingId] = useState(null);
  const [dogFilter, setDogFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [query, setQuery] = useState("");

  const dogMap = useMemo(() => new Map(dogs.map((dog) => [dog.id, dog])), [dogs]);

  const preparedEvents = useMemo(() => healthEvents.map((event) => {
    const dog = dogMap.get(event.dogId);
    return {
      ...event,
      dogName: dog?.name || event.dogName || "Unknown dog",
      sex: dog?.sex || event.sex || "",
    };
  }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))), [healthEvents, dogMap]);

  const filteredEvents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return preparedEvents.filter((event) => {
      const matchesDog = dogFilter === "All" || event.dogId === dogFilter;
      const matchesType = typeFilter === "All" || event.type === typeFilter;
      const matchesSearch = !search || [event.dogName, event.type, event.status, event.note, event.nextCheck]
        .some((value) => String(value || "").toLowerCase().includes(search));
      return matchesDog && matchesType && matchesSearch;
    });
  }, [preparedEvents, dogFilter, typeFilter, query]);

  const femaleDogs = dogs.filter((dog) => dog.sex === "Female");
  const heatRows = femaleDogs.map((dog) => {
    const heatEvents = preparedEvents.filter((event) => event.dogId === dog.id && event.type === "Heat");
    const latestHeat = [dog.lastHeat, ...heatEvents.map((event) => event.date)].filter(Boolean).sort().at(-1) || "";
    return { dog, latestHeat, heatCount: heatEvents.length };
  }).sort((a, b) => String(a.latestHeat || "").localeCompare(String(b.latestHeat || "")));

  const startEdit = (event) => {
    setEditingId(event.id);
    setDraft({
      id: event.id,
      dogId: event.dogId || dogs?.[0]?.id || "",
      date: event.date || todayIso(),
      type: event.type || "Health Note",
      status: event.status || "Watch",
      note: event.note || "",
      nextCheck: event.nextCheck || "",
      applyToDogProfile: Boolean(event.applyToDogProfile),
    });
  };

  const clearDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft(dogs));
  };

  const save = () => {
    if (!draft.dogId) {
      alert("Please choose a dog.");
      return;
    }
    if (!draft.note.trim() && draft.type !== "Heat") {
      alert("Please add a short note.");
      return;
    }
    const dog = dogMap.get(draft.dogId);
    const now = new Date().toISOString();
    const applyToDogProfile = Boolean(draft.applyToDogProfile);
    const payload = {
      ...draft,
      id: editingId || `health-${Date.now()}`,
      dogName: dog?.name || "",
      sex: dog?.sex || "",
      note: draft.note.trim(),
      nextCheck: draft.nextCheck || "",
      applyToDogProfile,
      createdAt: editingId ? (healthEvents.find((item) => item.id === editingId)?.createdAt || now) : now,
      updatedAt: editingId ? now : "",
    };
    if (editingId) onUpdateEvent(payload);
    else onAddEvent(payload);
    clearDraft();
  };

  return (
    <section className="page-grid">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Simple kennel health overview</p>
          <h2>Health Notes & Heat Calendar</h2>
        </div>
        <button className="secondary" onClick={() => downloadCsv("health-notes.csv", preparedEvents, healthHeaders)}>Export Health CSV</button>
      </div>

      <div className="two-column">
        <section className="panel">
          <h3>{editingId ? "Edit health note" : "Add health note"}</h3>
          <p className="muted-text">Keep this simple: use it for heat dates, paw problems, vet notes, rest reasons or short health observations.</p>
          <div className="form-grid">
            <label>Dog<select value={draft.dogId} onChange={(event) => setDraft((current) => ({ ...current, dogId: event.target.value }))}>{dogs.map((dog) => <option key={dog.id} value={dog.id}>{dog.name}</option>)}</select></label>
            <label>Date<input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label>
            <label>Type<select value={draft.type} onChange={(event) => {
              const type = event.target.value;
              setDraft((current) => ({
                ...current,
                type,
                status: type === "Heat" ? "In Heat" : type === "Injury" ? "Injured" : type === "Sick" ? "Sick" : type === "Rest" ? "Rest" : current.status,
                applyToDogProfile: ["Heat", "Injury", "Sick", "Rest"].includes(type) ? true : current.applyToDogProfile,
              }));
            }}>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option>Active</option><option>Watch</option><option>Light Training</option><option>Rest</option><option>Injured</option><option>Sick</option><option>In Heat</option><option>Build-up</option><option>Retired</option></select></label>
            <label>Next check<input type="date" value={draft.nextCheck} onChange={(event) => setDraft((current) => ({ ...current, nextCheck: event.target.value }))} /></label>
            <label className="checkbox-field full-span">
              <input type="checkbox" checked={Boolean(draft.applyToDogProfile)} onChange={(event) => setDraft((current) => ({ ...current, applyToDogProfile: event.target.checked }))} />
              Update dog profile with this status
            </label>
            {draft.applyToDogProfile && !PROFILE_STATUSES.includes(draft.status) && <p className="warning-text full-span">Choose a profile status like Rest, Injured, Sick, In Heat, Watch or Active.</p>}
            {draft.applyToDogProfile && draft.type === "Heat" && <p className="helper-text full-span">Saving this will also update Last Heat for this female dog.</p>}
            <label className="full-span">Note<textarea value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Short note, e.g. front paw slightly sore, check tomorrow" /></label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={save}>{editingId ? "Update note" : "Save note"}</button>
            <button className="ghost" onClick={clearDraft}>Clear</button>
          </div>
        </section>

        <section className="panel">
          <h3>Heat calendar</h3>
          <p className="muted-text">Shows female dogs and their latest heat date from dog profile or health notes.</p>
          {!heatRows.length ? (
            <EmptyState title="No female dogs" text="Female dogs will appear here automatically." />
          ) : (
            <div className="heat-list">
              {heatRows.map(({ dog, latestHeat, heatCount }) => (
                <div className="heat-row" key={dog.id}>
                  <div><strong>{dog.name}</strong><small>{heatCount} heat notes</small></div>
                  <span>{latestHeat ? formatDate(latestHeat) : "No date yet"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="page-header split inner-header">
          <div>
            <h3>Health note history</h3>
            <p className="muted-text">{filteredEvents.length} notes shown</p>
          </div>
        </div>
        <div className="filter-card">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" />
          <select value={dogFilter} onChange={(event) => setDogFilter(event.target.value)}><option value="All">All dogs</option>{dogs.map((dog) => <option key={dog.id} value={dog.id}>{dog.name}</option>)}</select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All</option>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
          <button className="ghost" onClick={() => { setQuery(""); setDogFilter("All"); setTypeFilter("All"); }}>Reset</button>
        </div>

        {!filteredEvents.length ? (
          <EmptyState title="No health notes" text="Add a note above when something should be remembered." />
        ) : (
          <div className="health-note-grid">
            {filteredEvents.map((event) => (
              <article className="health-card" key={event.id}>
                <div className="dog-card-head">
                  <div>
                    <h3>{event.dogName}</h3>
                    <p>{formatDate(event.date)} · {event.type}</p>
                  </div>
                  <StatusBadge value={event.status} />
                </div>
                {event.note && <p className="note-box">{event.note}</p>}
                {event.nextCheck && <p className="muted-text"><strong>Next check:</strong> {formatDate(event.nextCheck)}</p>}
                {event.applyToDogProfile && <p className="helper-text">Dog profile was updated with this status.</p>}
                <div className="button-row">
                  <button className="secondary small-button" onClick={() => startEdit(event)}>Edit</button>
                  <button className="icon-button danger" onClick={() => onDeleteEvent(event.id)} aria-label="Delete health note">×</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
