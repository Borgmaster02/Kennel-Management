import { useMemo, useState } from "react";
import { EmptyState } from "./common";
import { formatDate } from "../utils/dateUtils";
import { downloadCsv, sessionHeaders } from "../utils/exportCsv";
import { TRAINING_TYPES } from "../data/options";

export default function TrainingSessions({ sessions = [], onDeleteTraining, onEditTraining, onCreateTeamFromTraining }) {
  const [query, setQuery] = useState("");
  const [guideFilter, setGuideFilter] = useState("All");
  const [routeFilter, setRouteFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [fixedTeamFilter, setFixedTeamFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const options = useMemo(() => {
    const unique = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    return {
      guides: unique(sessions.map((session) => session.guide)),
      routes: unique(sessions.map((session) => session.route)),
      fixedTeams: unique(sessions.map((session) => session.fixedTeamName)),
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesSearch = !search || [session.id, session.date, session.route, session.guide, session.trainingType, session.fixedTeamName, session.generalNote]
        .some((value) => String(value || "").toLowerCase().includes(search));
      const matchesGuide = guideFilter === "All" || session.guide === guideFilter;
      const matchesRoute = routeFilter === "All" || session.route === routeFilter;
      const matchesType = typeFilter === "All" || session.trainingType === typeFilter;
      const matchesFixedTeam = fixedTeamFilter === "All" || session.fixedTeamName === fixedTeamFilter;
      const matchesFrom = !dateFrom || String(session.date || "") >= dateFrom;
      const matchesTo = !dateTo || String(session.date || "") <= dateTo;
      return matchesSearch && matchesGuide && matchesRoute && matchesType && matchesFixedTeam && matchesFrom && matchesTo;
    });
  }, [sessions, query, guideFilter, routeFilter, typeFilter, fixedTeamFilter, dateFrom, dateTo]);

  const resetFilters = () => {
    setQuery("");
    setGuideFilter("All");
    setRouteFilter("All");
    setTypeFilter("All");
    setFixedTeamFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  const trainingKm = filteredSessions.reduce((sum, session) => sum + Number(session.distance || 0), 0);
  const dogStarts = filteredSessions.reduce((sum, session) => sum + Number(session.numberOfDogs || 0), 0);

  return (
    <section className="page-grid">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Training history</p>
          <h2>Training Sessions</h2>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => downloadCsv("training-sessions-filtered.csv", filteredSessions, sessionHeaders)}>Export Filtered CSV</button>
          <button className="secondary" onClick={() => downloadCsv("training-sessions.csv", sessions, sessionHeaders)}>Export All CSV</button>
        </div>
      </div>

      <div className="filter-card advanced-filter-card">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, route, guide, note..." />
        <select value={guideFilter} onChange={(event) => setGuideFilter(event.target.value)}><option>All</option>{options.guides.map((guide) => <option key={guide}>{guide}</option>)}</select>
        <select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}><option>All</option>{options.routes.map((route) => <option key={route}>{route}</option>)}</select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All</option>{TRAINING_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
        <select value={fixedTeamFilter} onChange={(event) => setFixedTeamFilter(event.target.value)}><option>All</option>{options.fixedTeams.map((team) => <option key={team}>{team}</option>)}</select>
        <label>Date from<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label>Date to<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <button className="ghost" onClick={resetFilters}>Reset filters</button>
      </div>

      <section className="panel compact-log-summary">
        <strong>{filteredSessions.length}</strong> sessions · <strong>{trainingKm.toFixed(1)}</strong> training km · <strong>{dogStarts}</strong> dog starts in current filter
      </section>

      {!filteredSessions.length ? (
        <EmptyState title="No sessions" text="New training sessions will appear here after saving, or adjust your filters." />
      ) : (
        <div className="responsive-table-wrap panel no-padding">
          <table>
            <thead>
              <tr>
                <th>Training ID</th><th>Date</th><th>Route</th><th>Distance</th><th>Type</th><th>Guide</th><th>Fixed Team</th><th>Dogs</th><th>Note</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.id}</td>
                  <td>{formatDate(session.date)}</td>
                  <td>{session.route}</td>
                  <td>{session.distance} km</td>
                  <td>{session.trainingType}</td>
                  <td>{session.guide}</td>
                  <td>{session.fixedTeamName || "—"}</td>
                  <td>{session.numberOfDogs}</td>
                  <td>{session.generalNote || "—"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="secondary small-button" onClick={() => onEditTraining(session.id)}>Edit</button>
                      <button className="secondary small-button" onClick={() => onCreateTeamFromTraining?.(session.id)}>Create team</button>
                      <button className="icon-button danger" onClick={() => onDeleteTraining(session.id)} aria-label="Delete training"><span aria-hidden="true">×</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
