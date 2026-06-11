import { useMemo, useState } from "react";
import { POSITIONS } from "../data/options";
import { getSuggestedTeam, getTeamWarnings, isDogEligibleForTeam } from "../utils/teamSuggestion";
import { StatusBadge, EmptyState } from "./common";
import { formatDate } from "../utils/dateUtils";

function createTeamPayload(name, dogs) {
  return {
    id: `team-${Date.now()}`,
    name,
    category: "Training Team",
    notes: "Created from Team Planner suggestion.",
    members: dogs.map((dog) => ({
      dogId: dog.id,
      position: dog.suggestedPosition || dog.mainPosition || "Team",
    })),
    updatedAt: new Date().toISOString(),
  };
}

export default function TeamPlanner({ dogs, onStartTraining, onStartTrainingWithTeam, onSaveFixedTeam }) {
  const [teamSize, setTeamSize] = useState(8);
  const [positionFilter, setPositionFilter] = useState("All");

  const eligibleDogs = useMemo(() => dogs.filter(isDogEligibleForTeam), [dogs]);
  const suggestedTeam = useMemo(() => getSuggestedTeam(dogs, Number(teamSize || 8)), [dogs, teamSize]);
  const warnings = useMemo(() => getTeamWarnings(suggestedTeam, Number(teamSize || 8)), [suggestedTeam, teamSize]);

  const positionGroups = useMemo(() => {
    const groups = { Lead: [], Swing: [], Team: [], Wheel: [] };
    suggestedTeam.forEach((dog) => {
      const position = groups[dog.suggestedPosition] ? dog.suggestedPosition : "Team";
      groups[position].push(dog);
    });
    return groups;
  }, [suggestedTeam]);

  const filteredEligible = useMemo(() => {
    return eligibleDogs
      .filter((dog) => positionFilter === "All" || dog.mainPosition === positionFilter || dog.alternativePosition === positionFilter)
      .sort((a, b) => Number(a.stats?.seasonKm || 0) - Number(b.stats?.seasonKm || 0));
  }, [eligibleDogs, positionFilter]);

  const saveSuggestionAsFixedTeam = () => {
    if (!suggestedTeam.length) return;
    const name = window.prompt("Name this fixed team template:", `Suggested ${teamSize}-dog team`);
    if (!name || !name.trim()) return;
    onSaveFixedTeam?.(createTeamPayload(name.trim(), suggestedTeam));
  };

  const startTrainingWithSuggestion = () => {
    if (!suggestedTeam.length) return;
    onStartTrainingWithTeam?.(createTeamPayload(`Suggested ${teamSize}-dog team`, suggestedTeam));
  };

  return (
    <section className="page-grid">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Balanced workload helper</p>
          <h2>Team Planner</h2>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={saveSuggestionAsFixedTeam} disabled={!suggestedTeam.length}>Save as Fixed Team</button>
          <button className="secondary" onClick={startTrainingWithSuggestion} disabled={!suggestedTeam.length}>Use Suggestion in Training</button>
          <button className="primary" onClick={onStartTraining}>Start Empty Training</button>
        </div>
      </div>

      <section className="panel planner-intro">
        <div>
          <h3>Suggested training team</h3>
          <p className="muted-text">
            This suggestion avoids dogs with restricted health status and prefers dogs with fewer season kilometers or a longer break since their last run.
            It is only a helper, not an automatic decision.
          </p>
        </div>
        <label className="small-field">Team size
          <input type="number" min="1" max="16" value={teamSize} onChange={(event) => setTeamSize(event.target.value)} />
        </label>
      </section>

      {warnings.length > 0 && (
        <section className="panel warning-panel">
          <h3>Warnings</h3>
          <ul>
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </section>
      )}

      {!suggestedTeam.length ? (
        <EmptyState title="No eligible dogs" text="All dogs are restricted or retired. Check the dog health and training statuses." />
      ) : (
        <div className="position-board">
          {POSITIONS.map((position) => (
            <section className="panel position-column" key={position}>
              <h3>{position}</h3>
              <div className="list-stack">
                {positionGroups[position].length ? positionGroups[position].map((dog) => (
                  <DogPlannerRow dog={dog} key={dog.id} />
                )) : <p className="muted-text">No dog suggested here.</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="panel">
        <div className="page-header split compact-header">
          <div>
            <h3>Eligible dogs by workload</h3>
            <p className="muted-text">Use this list when you want to adjust the team manually.</p>
          </div>
          <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)}>
            <option>All</option>
            {POSITIONS.map((position) => <option key={position}>{position}</option>)}
          </select>
        </div>

        <div className="responsive-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dog</th><th>Sex</th><th>Main</th><th>Alt</th><th>Season km</th><th>Last training</th><th>Days</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEligible.map((dog) => (
                <tr key={dog.id}>
                  <td>{dog.name}</td>
                  <td>{dog.sex}</td>
                  <td>{dog.mainPosition || "—"}</td>
                  <td>{dog.alternativePosition || "—"}</td>
                  <td>{dog.stats.seasonKm.toFixed(1)}</td>
                  <td>{dog.stats.lastTraining ? `${formatDate(dog.stats.lastTraining.date)} · ${dog.stats.lastTraining.distance} km` : "—"}</td>
                  <td>{dog.stats.daysSinceLastTraining === "" ? "—" : dog.stats.daysSinceLastTraining}</td>
                  <td><StatusBadge value={dog.healthStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function DogPlannerRow({ dog }) {
  return (
    <div className="list-row planner-row">
      <div>
        <strong>{dog.name}</strong>
        <small>{dog.sex} · {dog.stats.seasonKm.toFixed(1)} season km · {dog.stats.numberOfRuns} runs</small>
      </div>
      <StatusBadge value={dog.healthStatus} />
    </div>
  );
}
