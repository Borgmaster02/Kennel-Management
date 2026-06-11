import { useMemo, useState } from "react";
import { EmptyState } from "./common";
import { formatDate } from "../utils/dateUtils";
import { downloadCsv, logHeaders } from "../utils/exportCsv";
import { POSITIONS, TRAINING_TYPES } from "../data/options";

export default function TrainingLog({ logs = [], sessions = [] }) {
  const [query, setQuery] = useState("");
  const [dogFilter, setDogFilter] = useState("All");
  const [guideFilter, setGuideFilter] = useState("All");
  const [routeFilter, setRouteFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [fixedTeamFilter, setFixedTeamFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [problemOnly, setProblemOnly] = useState(false);

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);

  const enrichedLogs = useMemo(() => logs.map((log) => {
    const session = sessionMap.get(log.trainingId);
    return {
      ...log,
      fixedTeamName: session?.fixedTeamName || log.fixedTeamName || "",
      fixedTeamId: session?.fixedTeamId || log.fixedTeamId || "",
    };
  }), [logs, sessionMap]);

  const options = useMemo(() => {
    const unique = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    return {
      dogs: unique(enrichedLogs.map((log) => log.dogName)),
      guides: unique(enrichedLogs.map((log) => log.guide)),
      routes: unique(enrichedLogs.map((log) => log.route)),
      fixedTeams: unique(enrichedLogs.map((log) => log.fixedTeamName)),
    };
  }, [enrichedLogs]);

  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return enrichedLogs.filter((log) => {
      const matchesSearch = !search || [log.dogName, log.route, log.guide, log.trainingType, log.position, log.fixedTeamName, log.dogNote]
        .some((value) => String(value || "").toLowerCase().includes(search));
      const matchesDog = dogFilter === "All" || log.dogName === dogFilter;
      const matchesGuide = guideFilter === "All" || log.guide === guideFilter;
      const matchesRoute = routeFilter === "All" || log.route === routeFilter;
      const matchesType = typeFilter === "All" || log.trainingType === typeFilter;
      const matchesPosition = positionFilter === "All" || log.position === positionFilter;
      const matchesFixedTeam = fixedTeamFilter === "All" || log.fixedTeamName === fixedTeamFilter;
      const matchesFrom = !dateFrom || String(log.date || "") >= dateFrom;
      const matchesTo = !dateTo || String(log.date || "") <= dateTo;
      const matchesProblem = !problemOnly || log.problem || log.removed || !log.finished;
      return matchesSearch && matchesDog && matchesGuide && matchesRoute && matchesType && matchesPosition && matchesFixedTeam && matchesFrom && matchesTo && matchesProblem;
    });
  }, [enrichedLogs, query, dogFilter, guideFilter, routeFilter, typeFilter, positionFilter, fixedTeamFilter, dateFrom, dateTo, problemOnly]);

  const resetFilters = () => {
    setQuery("");
    setDogFilter("All");
    setGuideFilter("All");
    setRouteFilter("All");
    setTypeFilter("All");
    setPositionFilter("All");
    setFixedTeamFilter("All");
    setDateFrom("");
    setDateTo("");
    setProblemOnly(false);
  };

  const totalKm = filteredLogs.reduce((sum, log) => sum + Number(log.distance || 0), 0);

  return (
    <section className="page-grid">
      <div className="page-header split">
        <div>
          <p className="eyebrow">One row per dog per training</p>
          <h2>Training Log</h2>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => downloadCsv("training-log-filtered.csv", filteredLogs, logHeaders)}>Export Filtered CSV</button>
          <button className="secondary" onClick={() => downloadCsv("training-log.csv", enrichedLogs, logHeaders)}>Export All CSV</button>
        </div>
      </div>

      <div className="filter-card advanced-filter-card">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dog, route, guide, note..." />
        <select value={dogFilter} onChange={(event) => setDogFilter(event.target.value)}><option>All</option>{options.dogs.map((dog) => <option key={dog}>{dog}</option>)}</select>
        <select value={guideFilter} onChange={(event) => setGuideFilter(event.target.value)}><option>All</option>{options.guides.map((guide) => <option key={guide}>{guide}</option>)}</select>
        <select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}><option>All</option>{options.routes.map((route) => <option key={route}>{route}</option>)}</select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All</option>{TRAINING_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
        <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)}><option>All</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</select>
        <select value={fixedTeamFilter} onChange={(event) => setFixedTeamFilter(event.target.value)}><option>All</option>{options.fixedTeams.map((team) => <option key={team}>{team}</option>)}</select>
        <label>Date from<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label>Date to<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <label className="inline-checkbox"><input type="checkbox" checked={problemOnly} onChange={(event) => setProblemOnly(event.target.checked)} /> Problems only</label>
        <button className="ghost" onClick={resetFilters}>Reset filters</button>
      </div>

      <section className="panel compact-log-summary">
        <strong>{filteredLogs.length}</strong> log rows · <strong>{totalKm.toFixed(1)}</strong> dog workload km in current filter
      </section>

      {!filteredLogs.length ? (
        <EmptyState title="No log entries" text="Dog-specific log rows will appear here after saving a training, or adjust your filters." />
      ) : (
        <div className="responsive-table-wrap panel no-padding">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Dog</th><th>Sex</th><th>Route</th><th>Distance</th><th>Position</th><th>Type</th><th>Guide</th><th>Fixed Team</th><th>Form</th><th>Problem</th><th>Finished</th><th>Removed</th><th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.date)}</td>
                  <td>{log.dogName}</td>
                  <td>{log.sex}</td>
                  <td>{log.route}</td>
                  <td>{log.distance} km</td>
                  <td>{log.position}</td>
                  <td>{log.trainingType}</td>
                  <td>{log.guide}</td>
                  <td>{log.fixedTeamName || "—"}</td>
                  <td>{log.form}</td>
                  <td>{log.problem ? "Yes" : "No"}</td>
                  <td>{log.finished ? "Yes" : "No"}</td>
                  <td>{log.removed ? `Yes · ${log.removedReason || "No reason"}` : "No"}</td>
                  <td>{log.dogNote || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
