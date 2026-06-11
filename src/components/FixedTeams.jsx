import { useMemo, useState } from "react";
import { POSITIONS, TEAM_CATEGORIES } from "../data/options";
import { EmptyState, StatusBadge } from "./common";

const createEmptyDraft = () => ({ name: "", category: "Custom", notes: "", members: [] });

export default function FixedTeams({ teams = [], dogs = [], onAddTeam, onUpdateTeam, onDeleteTeam, onDuplicateTeam }) {
  const [draft, setDraft] = useState(createEmptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const dogMap = useMemo(() => new Map(dogs.map((dog) => [dog.id, dog])), [dogs]);
  const filteredDogs = useMemo(() => {
    const value = search.trim().toLowerCase();
    return dogs.filter((dog) => !value || dog.name.toLowerCase().includes(value));
  }, [dogs, search]);

  const startNew = () => {
    setEditingId(null);
    setDraft(createEmptyDraft());
    setSearch("");
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setDraft({
      name: team.name || "",
      category: team.category || "Custom",
      notes: team.notes || "",
      members: Array.isArray(team.members) ? team.members : [],
    });
    setSearch("");
  };

  const toggleDog = (dog) => {
    setDraft((current) => {
      const exists = current.members.some((member) => member.dogId === dog.id);
      return {
        ...current,
        members: exists
          ? current.members.filter((member) => member.dogId !== dog.id)
          : [...current.members, { dogId: dog.id, position: dog.mainPosition || "Team" }],
      };
    });
  };

  const updateMemberPosition = (dogId, position) => {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) => member.dogId === dogId ? { ...member, position } : member),
    }));
  };

  const moveMember = (dogId, direction) => {
    setDraft((current) => {
      const index = current.members.findIndex((member) => member.dogId === dogId);
      if (index < 0) return current;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.members.length) return current;
      const members = [...current.members];
      const [item] = members.splice(index, 1);
      members.splice(nextIndex, 0, item);
      return { ...current, members };
    });
  };

  const removeMember = (dogId) => {
    setDraft((current) => ({ ...current, members: current.members.filter((member) => member.dogId !== dogId) }));
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      alert("Please add a team name.");
      return;
    }
    if (!draft.members.length) {
      alert("Please select at least one dog.");
      return;
    }
    const payload = {
      id: editingId || `team-${Date.now()}`,
      name,
      category: draft.category || "Custom",
      notes: draft.notes.trim(),
      members: draft.members.filter((member) => dogMap.has(member.dogId)),
      updatedAt: new Date().toISOString(),
    };
    if (editingId) onUpdateTeam(payload);
    else onAddTeam(payload);
    startNew();
  };

  const selectedIds = new Set(draft.members.map((member) => member.dogId));
  const groupedTeams = teams
    .filter((team) => categoryFilter === "All" || (team.category || "Custom") === categoryFilter)
    .map((team) => ({
      ...team,
      resolvedMembers: (team.members || []).map((member) => ({ ...member, dog: dogMap.get(member.dogId) })).filter((member) => member.dog),
    }));

  return (
    <section className="page-grid">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Reusable team templates</p>
          <h2>Fixed Teams</h2>
        </div>
        {editingId && <button className="ghost" onClick={startNew}>Cancel edit</button>}
      </div>

      <section className="panel">
        <h3>{editingId ? "Edit fixed team" : "Create fixed team"}</h3>
        <p className="muted-text">Use fixed teams as a starting point for training. You can still adjust dogs, distance and position before saving a training.</p>
        <div className="form-grid">
          <label>Team Name<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Team A / Young team / Long run team" /></label>
          <label>Category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{TEAM_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Search dogs<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dogs" /></label>
          <label className="full-span">Notes<textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional team note" /></label>
        </div>

        {!!draft.members.length && (
          <div className="team-builder">
            <h4>Selected dogs</h4>
            <div className="team-member-list">
              {draft.members.map((member, index) => {
                const dog = dogMap.get(member.dogId);
                if (!dog) return null;
                return (
                  <div className="team-member-row" key={member.dogId}>
                    <div>
                      <strong>{dog.name}</strong>
                      <small>{dog.sex} · {dog.healthStatus}</small>
                    </div>
                    <select value={member.position || dog.mainPosition || "Team"} onChange={(event) => updateMemberPosition(member.dogId, event.target.value)}>
                      {POSITIONS.map((position) => <option key={position}>{position}</option>)}
                    </select>
                    <div className="member-order-buttons">
                      <button className="icon-button" onClick={() => moveMember(member.dogId, "up")} disabled={index === 0} aria-label={`Move ${dog.name} up`}>↑</button>
                      <button className="icon-button" onClick={() => moveMember(member.dogId, "down")} disabled={index === draft.members.length - 1} aria-label={`Move ${dog.name} down`}>↓</button>
                    </div>
                    <button className="icon-button danger" onClick={() => removeMember(member.dogId)} aria-label={`Remove ${dog.name}`}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="select-dog-grid team-select-grid">
          {filteredDogs.map((dog) => {
            const selected = selectedIds.has(dog.id);
            return (
              <button key={dog.id} className={selected ? "select-dog-card selected" : "select-dog-card"} onClick={() => toggleDog(dog)}>
                <span><strong>{dog.name}</strong><small>{dog.sex} · {dog.mainPosition || "Team"}</small></span>
                <span className="selection-indicator">{selected ? "✓" : "+"}</span>
                <StatusBadge value={dog.healthStatus} />
              </button>
            );
          })}
        </div>

        <div className="form-actions">
          <button className="primary" onClick={save}>{editingId ? "Update team" : "Save fixed team"}</button>
          <button className="ghost" onClick={startNew}>Clear</button>
        </div>
      </section>

      <section className="panel">
        <div className="page-header split inner-header">
          <div>
            <h3>Saved fixed teams</h3>
            <p className="muted-text">Filter team templates by category.</p>
          </div>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option>All</option>
            {TEAM_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        {!groupedTeams.length ? (
          <EmptyState title="No fixed teams yet" text="Create a team template above and reuse it when entering a training." />
        ) : (
          <div className="team-card-grid">
            {groupedTeams.map((team) => (
              <article className="team-card" key={team.id}>
                <div className="dog-card-head">
                  <div>
                    <h3>{team.name}</h3>
                    <p>{team.resolvedMembers.length} dogs · {team.category || "Custom"}</p>
                  </div>
                  <div className="compact-buttons button-row">
                    <button className="secondary small-button" onClick={() => startEdit(team)}>Edit</button>
                    <button className="secondary small-button" onClick={() => onDuplicateTeam?.(team.id)}>Duplicate</button>
                    <button className="icon-button danger" onClick={() => onDeleteTeam(team.id)} aria-label={`Delete ${team.name}`}>×</button>
                  </div>
                </div>
                {team.notes && <p className="note-box">{team.notes}</p>}
                <ol className="team-order-list">
                  {team.resolvedMembers.map((member) => <li key={member.dogId}><strong>{member.dog.name}</strong><span>{member.position || member.dog.mainPosition || "Team"}</span></li>)}
                </ol>
                <div className="team-preview saved-team-preview">
                  {POSITIONS.map((position) => {
                    const names = team.resolvedMembers.filter((member) => member.position === position).map((member) => member.dog.name);
                    return <div className="team-preview-slot" key={position}><strong>{position}</strong><span>{names.length ? names.join(", ") : "—"}</span></div>;
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
