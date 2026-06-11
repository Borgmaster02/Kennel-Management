import { useMemo, useState } from "react";
import DogForm from "./DogForm";
import { StatusBadge, EmptyState } from "./common";
import { calculateAge, formatDate } from "../utils/dateUtils";
import { downloadCsv, dogHeaders } from "../utils/exportCsv";
import { POSITIONS, HEALTH_STATUSES } from "../data/options";

export default function Dogs({ dogs, logs = [], healthEvents = [], onAddDog, onUpdateDog, onAddHealthEvent }) {
  const [query, setQuery] = useState("");
  const [sexFilter, setSexFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingDog, setEditingDog] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDogId, setSelectedDogId] = useState("");

  const filteredDogs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return dogs.filter((dog) => {
      const matchesSearch = !search || dog.name.toLowerCase().includes(search);
      const matchesSex = sexFilter === "All" || dog.sex === sexFilter;
      const matchesPosition = positionFilter === "All" || dog.mainPosition === positionFilter || dog.alternativePosition === positionFilter;
      const matchesStatus = statusFilter === "All" || dog.healthStatus === statusFilter || dog.trainingStatus === statusFilter;
      return matchesSearch && matchesSex && matchesPosition && matchesStatus;
    });
  }, [dogs, query, sexFilter, positionFilter, statusFilter]);

  const dogHealthCounts = useMemo(() => {
    const counts = new Map();
    healthEvents.forEach((event) => {
      if (!event.dogId) return;
      counts.set(event.dogId, (counts.get(event.dogId) || 0) + 1);
    });
    return counts;
  }, [healthEvents]);

  const selectedDog = dogs.find((dog) => dog.id === selectedDogId) || null;

  const saveDog = (dog) => {
    if (editingDog) onUpdateDog(dog);
    else onAddDog(dog);
    setEditingDog(null);
    setShowAddForm(false);
  };

  const resetFilters = () => {
    setQuery("");
    setSexFilter("All");
    setPositionFilter("All");
    setStatusFilter("All");
  };

  return (
    <section className="page-grid">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Kennel</p>
          <h2>Dogs</h2>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => downloadCsv("dogs.csv", dogs, dogHeaders)}>Export Dogs CSV</button>
          <button className="primary" onClick={() => { setEditingDog(null); setShowAddForm(true); }}><span aria-hidden="true">+</span> Add Dog</button>
        </div>
      </div>

      {selectedDog && (
        <DogProfile
          dog={selectedDog}
          logs={logs.filter((log) => log.dogId === selectedDog.id)}
          healthEvents={healthEvents.filter((event) => event.dogId === selectedDog.id)}
          onClose={() => setSelectedDogId("")}
          onEdit={() => { setEditingDog(selectedDog); setShowAddForm(false); }}
          onAddHealthEvent={onAddHealthEvent}
        />
      )}

      {(showAddForm || editingDog) && (
        <DogForm dog={editingDog} onSave={saveDog} onCancel={() => { setShowAddForm(false); setEditingDog(null); }} />
      )}

      <div className="quick-filter-row">
        {["Active", "Watch", "Rest", "Injured", "Sick", "In Heat", "Build-up", "Retired"].map((status) => (
          <button key={status} className={statusFilter === status ? "status-chip active" : "status-chip"} onClick={() => setStatusFilter(status)}>{status}</button>
        ))}
        <button className="status-chip" onClick={resetFilters}>Reset</button>
      </div>

      <div className="filter-card">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dogs by name" />
        <select value={sexFilter} onChange={(event) => setSexFilter(event.target.value)}>
          <option>All</option><option>Male</option><option>Female</option>
        </select>
        <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)}>
          <option>All</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All</option><option>Active</option><option>Watch</option><option>Rest</option><option>Injured</option><option>Sick</option><option>In Heat</option><option>Build-up</option><option>Retired</option>
        </select>
      </div>

      {!filteredDogs.length ? (
        <EmptyState title="No dogs match the filters" text="Try another search or reset the filters." />
      ) : (
        <div className="dog-card-grid">
          {filteredDogs.map((dog) => (
            <article className="dog-card" key={dog.id}>
              <div className="dog-card-head">
                <div>
                  <h3>{dog.name}</h3>
                  <p>{dog.sex} {dog.dateOfBirth ? `· ${calculateAge(dog.dateOfBirth)} yrs` : ""}</p>
                </div>
                <StatusBadge value={dog.healthStatus} />
              </div>
              <div className="mini-stats">
                <span><b>{dog.stats.seasonKm.toFixed(1)}</b> km</span>
                <span><b>{dog.stats.numberOfRuns}</b> runs</span>
                <span><b>{dog.stats.last10Km.toFixed(1)}</b> last 10</span>
                <span><b>{dog.stats.daysSinceLastTraining === "" ? "—" : dog.stats.daysSinceLastTraining}</b> days</span>
              </div>
              <dl className="details-list">
                <div><dt>Main position</dt><dd>{dog.mainPosition || "—"}</dd></div>
                <div><dt>Alternative</dt><dd>{dog.alternativePosition || "—"}</dd></div>
                <div><dt>Last training</dt><dd>{dog.stats.lastTraining ? `${formatDate(dog.stats.lastTraining.date)} · ${dog.stats.lastTraining.distance} km` : "—"}</dd></div>
                <div><dt>Condition</dt><dd>{dog.stats.condition}</dd></div>
                <div><dt>Health notes</dt><dd>{dogHealthCounts.get(dog.id) || 0}</dd></div>
                {dog.sex === "Female" && <div><dt>Last heat</dt><dd>{dog.lastHeat ? formatDate(dog.lastHeat) : "—"}</dd></div>}
              </dl>
              {dog.notes && <p className="note-box">{dog.notes}</p>}
              <div className="button-row">
                <button className="secondary" onClick={() => setSelectedDogId(dog.id)}>View profile</button>
                <button className="ghost" onClick={() => setEditingDog(dog)}>Edit dog</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DogProfile({ dog, logs, healthEvents, onClose, onEdit, onAddHealthEvent }) {
  const sortedLogs = [...logs].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const sortedHealth = [...healthEvents].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const last10 = sortedLogs.slice(0, 10);
  const recentHealth = sortedHealth.slice(0, 8);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [healthDraft, setHealthDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "Health Note",
    status: dog.healthStatus || "Watch",
    nextCheck: "",
    note: "",
    applyToDogProfile: true,
  });

  const monthRows = useMemo(() => {
    const map = new Map();
    sortedLogs.forEach((log) => {
      const key = String(log.date || "").slice(0, 7) || "Unknown";
      const row = map.get(key) || { month: key, km: 0, runs: 0 };
      row.km += Number(log.distance || 0);
      row.runs += 1;
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  }, [sortedLogs]);

  const formTrend = useMemo(() => {
    const forms = sortedLogs.map((log) => Number(log.form || 0)).filter(Boolean);
    const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const recent = avg(forms.slice(0, 5));
    const previous = avg(forms.slice(5, 10));
    const chartRows = forms.slice(0, 10).map((value, index) => ({
      label: `Run ${index + 1}`,
      value,
      detail: `${value}/5`,
    }));
    if (!recent) return { label: "No form data", recent: 0, previous: 0, chartRows };
    if (!previous) return { label: `Recent avg ${recent.toFixed(1)}`, recent, previous, chartRows };
    const diff = recent - previous;
    return { label: `${recent.toFixed(1)} recent avg · ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} trend`, recent, previous, chartRows };
  }, [sortedLogs]);

  const addHealthFromProfile = () => {
    if (!onAddHealthEvent) return;
    const event = {
      id: `health-${Date.now()}`,
      dogId: dog.id,
      dogName: dog.name,
      sex: dog.sex,
      date: healthDraft.date,
      type: healthDraft.type,
      status: healthDraft.status,
      note: healthDraft.note,
      nextCheck: healthDraft.nextCheck,
      applyToDogProfile: Boolean(healthDraft.applyToDogProfile),
      createdAt: new Date().toISOString(),
      updatedAt: "",
    };
    onAddHealthEvent(event);
    setHealthDraft({ date: new Date().toISOString().slice(0, 10), type: "Health Note", status: dog.healthStatus || "Watch", nextCheck: "", note: "", applyToDogProfile: true });
    setShowHealthForm(false);
  };

  return (
    <section className="panel dog-profile-panel">
      <div className="page-header split inner-header">
        <div>
          <p className="eyebrow">Dog profile</p>
          <h2>{dog.name}</h2>
          <div className="button-row compact-buttons">
            <StatusBadge value={dog.healthStatus} />
            <span className="pill">{dog.trainingStatus || "Active"}</span>
            <span className="pill">{dog.sex}</span>
          </div>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => setShowHealthForm((value) => !value)}>Add health note</button>
          <button className="secondary" onClick={onEdit}>Edit dog</button>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="stats-grid compact-stats">
        <div className="stat-card"><span>Season km</span><strong>{dog.stats.seasonKm.toFixed(1)}</strong></div>
        <div className="stat-card"><span>Runs</span><strong>{dog.stats.numberOfRuns}</strong></div>
        <div className="stat-card"><span>Last 10 km</span><strong>{dog.stats.last10Km.toFixed(1)}</strong></div>
        <div className="stat-card"><span>Days since run</span><strong>{dog.stats.daysSinceLastTraining === "" ? "—" : dog.stats.daysSinceLastTraining}</strong></div>
        <div className="stat-card"><span>Form trend</span><strong>{formTrend.label}</strong></div>
      </div>

      {showHealthForm && (
        <section className="profile-section inline-health-form">
          <h3>Add health note for {dog.name}</h3>
          <div className="form-grid">
            <label>Date<input type="date" value={healthDraft.date} onChange={(event) => setHealthDraft((current) => ({ ...current, date: event.target.value }))} /></label>
            <label>Type<select value={healthDraft.type} onChange={(event) => setHealthDraft((current) => ({ ...current, type: event.target.value, status: event.target.value === "Heat" ? "In Heat" : current.status }))}>{["Health Note", "Heat", "Injury", "Sick", "Vet", "Paws", "Rest", "Medication", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Status<select value={healthDraft.status} onChange={(event) => setHealthDraft((current) => ({ ...current, status: event.target.value }))}>{HEALTH_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>Next check<input type="date" value={healthDraft.nextCheck} onChange={(event) => setHealthDraft((current) => ({ ...current, nextCheck: event.target.value }))} /></label>
            <label className="full-span">Note<textarea value={healthDraft.note} onChange={(event) => setHealthDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Short note" /></label>
            <label className="checkbox-line full-span"><input type="checkbox" checked={healthDraft.applyToDogProfile} onChange={(event) => setHealthDraft((current) => ({ ...current, applyToDogProfile: event.target.checked }))} /> Update dog profile with this status</label>
          </div>
          <div className="form-actions"><button className="primary" onClick={addHealthFromProfile}>Save health note</button><button className="ghost" onClick={() => setShowHealthForm(false)}>Cancel</button></div>
        </section>
      )}

      <div className="two-column">
        <div className="profile-section">
          <h3>Details</h3>
          <dl className="details-list">
            <div><dt>Date of birth</dt><dd>{dog.dateOfBirth ? formatDate(dog.dateOfBirth) : "—"}</dd></div>
            <div><dt>Age</dt><dd>{dog.dateOfBirth ? `${calculateAge(dog.dateOfBirth)} years` : "—"}</dd></div>
            <div><dt>Main position</dt><dd>{dog.mainPosition || "—"}</dd></div>
            <div><dt>Alternative</dt><dd>{dog.alternativePosition || "—"}</dd></div>
            <div><dt>Condition</dt><dd>{dog.stats.condition || "—"}</dd></div>
            {dog.sex === "Female" && <div><dt>Last heat</dt><dd>{dog.lastHeat ? formatDate(dog.lastHeat) : "—"}</dd></div>}
          </dl>
          {dog.notes && <p className="note-box">{dog.notes}</p>}
        </div>

        <div className="profile-section">
          <h3>Monthly kilometers</h3>
          {!monthRows.length ? <EmptyState title="No monthly data" text="Monthly kilometers appear after trainings are saved." /> : (
            <div className="profile-list">
              {monthRows.map((row) => <div className="profile-list-row" key={row.month}><div><strong>{row.month}</strong><small>{row.runs} runs</small></div><span className="pill">{row.km.toFixed(1)} km</span></div>)}
            </div>
          )}
        </div>
      </div>

      <div className="two-column">
        <div className="profile-section">
          <h3>Health status history</h3>
          {!recentHealth.length ? (
            <EmptyState title="No health notes" text="Health notes for this dog will appear here." />
          ) : (
            <div className="profile-list">
              {recentHealth.map((event) => (
                <div className="profile-list-row" key={event.id}>
                  <div><strong>{formatDate(event.date)} · {event.type}</strong><small>{event.note || "No note"}</small>{event.nextCheck && <small>Next check: {formatDate(event.nextCheck)}</small>}</div>
                  <StatusBadge value={event.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>Form trend</h3>
          <p className="note-box">{formTrend.label}</p>
          {!!formTrend.chartRows?.length && (
            <MiniBarChart rows={formTrend.chartRows} maxValue={5} compact />
          )}
          <p className="muted-text">Compares the latest 5 form scores with the previous 5. This is only a simple helper, not a medical or performance diagnosis.</p>
        </div>
      </div>

      <div className="profile-section">
        <h3>Last 10 trainings</h3>
        {!last10.length ? (
          <EmptyState title="No trainings yet" text="Training history for this dog will appear after the first saved run." />
        ) : (
          <div className="responsive-table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Route</th><th>Km</th><th>Type</th><th>Position</th><th>Guide</th><th>Form</th><th>Problem</th><th>Note</th></tr></thead>
              <tbody>
                {last10.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.date)}</td>
                    <td>{log.route}</td>
                    <td>{Number(log.distance || 0).toFixed(1)}</td>
                    <td>{log.trainingType}</td>
                    <td>{log.position}</td>
                    <td>{log.guide || "—"}</td>
                    <td>{log.form}</td>
                    <td>{log.problem ? "Yes" : "No"}</td>
                    <td>{log.dogNote || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function MiniBarChart({ rows, maxValue = 1, compact = false }) {
  const safeMax = Math.max(Number(maxValue || 1), 1);
  return (
    <div className={compact ? "mini-chart compact" : "mini-chart"}>
      {rows.map((row) => {
        const width = Math.max(4, Math.min(100, (Number(row.value || 0) / safeMax) * 100));
        return (
          <div className="mini-chart-row" key={row.label}>
            <div className="mini-chart-label"><strong>{row.label}</strong><small>{row.detail}</small></div>
            <div className="mini-chart-track" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
