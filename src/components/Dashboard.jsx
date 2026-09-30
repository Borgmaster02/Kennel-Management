import { useMemo, useState } from "react";
import { getDashboardStats } from "../utils/statistics";
import { formatDate } from "../utils/dateUtils";
import { StatusBadge, StatCard, EmptyState } from "./common";
import RecentTrainings from "./RecentTrainings";

export default function Dashboard({ dogs, sessions, logs, healthEvents = [], meta = {}, onEditTraining, onDeleteTraining, onOpenSessions }) {
  const stats = useMemo(() => getDashboardStats(dogs, sessions, logs, healthEvents, meta), [dogs, sessions, logs, healthEvents, meta]);
  const [kmSort, setKmSort] = useState("asc");
  const dogsByKm = useMemo(() => [...stats.dogsWithStats].sort((a, b) => {
    const difference = Number(a.stats.seasonKm || 0) - Number(b.stats.seasonKm || 0);
    return kmSort === "asc" ? difference : -difference;
  }), [stats.dogsWithStats, kmSort]);

  return (
    <section className="page-grid">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Season dashboard</h2>
        </div>
      </div>


      {stats.backupRecommended && (
        <section className="panel warning-panel backup-dashboard-warning">
          <h3>Backup recommended</h3>
          <p>You have saved {stats.sessionsSinceBackup} training sessions since the last full JSON backup. Download a backup in the Data tab before uploading a new website version.</p>
        </section>
      )}


      <RecentTrainings
        sessions={sessions}
        logs={logs}
        onEditTraining={onEditTraining}
        onDeleteTraining={onDeleteTraining}
        onOpenSessions={onOpenSessions}
        limit={5}
      />

      <div className="stats-grid">
        <StatCard label="Active dogs" value={stats.activeDogCount} hint="Archived dogs are not counted" />
        <StatCard label="Season workload" value={`${stats.totalDogWorkloadKm.toFixed(1)} km`} hint="Kilometers across all active dogs" />
        <StatCard label="Average per dog" value={`${stats.averageKmPerDog.toFixed(1)} km`} hint="Season workload divided by active dogs" />
        <StatCard label="Trained in last 7 days" value={`${stats.dogsTrainedLast7} / ${stats.activeDogCount}`} hint="Unique active dogs, independent of grouped sessions" />
        <StatCard label="Trained in last 30 days" value={`${stats.dogsTrainedLast30} / ${stats.activeDogCount}`} hint="Unique active dogs, independent of grouped sessions" />
        <StatCard label="Need training" value={stats.dogsNeedingTraining} hint="Eligible dogs with no run or 7+ days since last run" />
        <StatCard label="Restricted dogs" value={stats.dogsOnRest.length} hint="Rest, injured, sick or in heat" />
        <StatCard label="Last 7 days workload" value={`${stats.last7DogWorkloadKm.toFixed(1)} km`} hint="Dog kilometers, not number of session records" />
      </div>

      <Panel title="Recent workload split">
        <div className="stats-grid compact-stats">
          <article className="stat-card"><span>Last 7 days dog workload</span><strong>{stats.last7DogWorkloadKm.toFixed(1)} km</strong></article>
          <article className="stat-card"><span>Last 30 days dog workload</span><strong>{stats.last30DogWorkloadKm.toFixed(1)} km</strong></article>
        </div>
        <p className="muted-text">These totals use the individual dog records, so they remain useful when several trainings are entered together.</p>
      </Panel>

      <Panel title="All dogs by season km">
        <div className="ranking-toolbar">
          <p className="muted-text">All {dogsByKm.length} dogs are shown.</p>
          <button className="secondary" onClick={() => setKmSort((current) => current === "asc" ? "desc" : "asc")}>
            Kilometers: {kmSort === "asc" ? "lowest first ↑" : "highest first ↓"}
          </button>
        </div>
        {dogsByKm.length ? (
          <div className="responsive-table-wrap">
            <table className="dog-km-table">
              <thead><tr><th>#</th><th>Dog</th><th>Season km</th><th>Runs</th><th>Last training</th><th>Status</th></tr></thead>
              <tbody>
                {dogsByKm.map((dog, index) => (
                  <tr key={dog.id}>
                    <td>{index + 1}</td>
                    <td><strong>{dog.name}</strong><small>{dog.stats.mostUsedPosition || dog.mainPosition || dog.sex}</small></td>
                    <td><strong>{dog.stats.seasonKm.toFixed(1)} km</strong></td>
                    <td>{dog.stats.numberOfRuns}</td>
                    <td>{dog.stats.lastTraining ? `${formatDate(dog.stats.lastTraining.date)} · ${dog.stats.lastTraining.distance} km` : "—"}</td>
                    <td><StatusBadge value={dog.healthStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No dogs yet" text="Add dogs to see the kilometer ranking." />}
      </Panel>

      <div className="two-column">
        <Panel title="Dogs not trained for a long time">
          {stats.notTrainedLong.length ? (
            <CompactDogList dogs={stats.notTrainedLong.slice(0, 10)} mode="days" />
          ) : (
            <EmptyState title="All good" text="No dog has crossed the warning threshold." />
          )}
        </Panel>

        <Panel title="Dogs on rest or warning status">
          {stats.dogsOnRest.length ? (
            <div className="list-stack">
              {stats.dogsOnRest.map((dog) => (
                <div className="list-row" key={dog.id}>
                  <div>
                    <strong>{dog.name}</strong>
                    <small>{dog.sex}</small>
                  </div>
                  <StatusBadge value={dog.healthStatus} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No restrictions" text="No dog is currently marked as Rest, Injured, Sick or In Heat." />
          )}
        </Panel>
      </div>


      <div className="two-column">
        <Panel title="Health notes this week">
          {stats.recentHealthEvents.length ? (
            <div className="list-stack">
              {stats.recentHealthEvents.map((event) => (
                <div className="list-row" key={event.id}>
                  <div>
                    <strong>{event.dogName}</strong>
                    <small>{formatDate(event.date)} · {event.type}</small>
                  </div>
                  <StatusBadge value={event.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No recent health notes" text="Health notes from the last 7 days will appear here." />
          )}
        </Panel>

        <Panel title="Upcoming health checks">
          {stats.upcomingHealthChecks.length ? (
            <div className="list-stack">
              {stats.upcomingHealthChecks.map((event) => (
                <div className="list-row" key={event.id}>
                  <div>
                    <strong>{event.dogName}</strong>
                    <small>{event.type} · check {formatDate(event.nextCheck)}</small>
                  </div>
                  <StatusBadge value={event.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming checks" text="Next checks in the next 14 days will appear here." />
          )}
        </Panel>
      </div>

      <Panel title="Last 10 runs overview">
        <div className="responsive-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dog</th>
                <th>Last training</th>
                <th>Days ago</th>
                <th>Last 10 runs km</th>
                <th>Runs</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.dogsWithStats.map((dog) => (
                <tr key={dog.id}>
                  <td>{dog.name}</td>
                  <td>{dog.stats.lastTraining ? `${formatDate(dog.stats.lastTraining.date)} · ${dog.stats.lastTraining.distance} km` : "—"}</td>
                  <td>{dog.stats.daysSinceLastTraining === "" ? "—" : dog.stats.daysSinceLastTraining}</td>
                  <td>{dog.stats.last10Km.toFixed(1)}</td>
                  <td>{dog.stats.numberOfRuns}</td>
                  <td><StatusBadge value={dog.healthStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function CompactDogList({ dogs, mode }) {
  return (
    <div className="list-stack">
      {dogs.map((dog) => (
        <div className="list-row" key={dog.id}>
          <div>
            <strong>{dog.name}</strong>
            <small>{dog.stats.mostUsedPosition || dog.mainPosition || dog.sex}</small>
          </div>
          <span className="pill">
            {mode === "days"
              ? dog.stats.daysSinceLastTraining === ""
                ? "No run yet"
                : `${dog.stats.daysSinceLastTraining} days`
              : `${dog.stats.seasonKm.toFixed(1)} km`}
          </span>
        </div>
      ))}
    </div>
  );
}
