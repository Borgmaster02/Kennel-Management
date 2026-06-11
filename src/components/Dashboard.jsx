import { getDashboardStats } from "../utils/statistics";
import { formatDate } from "../utils/dateUtils";
import { StatusBadge, StatCard, EmptyState } from "./common";

export default function Dashboard({ dogs, sessions, logs, healthEvents = [], meta = {} }) {
  const stats = getDashboardStats(dogs, sessions, logs, healthEvents, meta);

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

      <div className="stats-grid">
        <StatCard label="Training km" value={`${stats.totalTrainingKm.toFixed(1)} km`} hint="Route/team kilometers, counted once per session" />
        <StatCard label="Training sessions" value={stats.numberOfTrainingSessions} />
        <StatCard label="Dog workload km" value={`${stats.totalDogWorkloadKm.toFixed(1)} km`} hint="All dog log kilometers combined" />
        <StatCard label="Average km / session" value={`${stats.averageTrainingKm.toFixed(1)} km`} />
        <StatCard label="Last 7 days training km" value={`${stats.last7TrainingKm.toFixed(1)} km`} hint="Route/team kilometers in the last 7 days" />
        <StatCard label="Last 30 days training km" value={`${stats.last30TrainingKm.toFixed(1)} km`} hint="Route/team kilometers in the last 30 days" />
        <StatCard label="Training frequency" value={`${stats.trainingFrequencyPerWeek.toFixed(1)} / week`} hint={`${stats.uniqueTrainingWeeks || 0} active training weeks`} />
        <StatCard label="Average dogs / session" value={stats.averageDogsPerSession.toFixed(1)} />
      </div>

      <div className="two-column">
        <Panel title="Recent workload split">
          <div className="stats-grid compact-stats">
            <article className="stat-card"><span>Last 7 days dog workload</span><strong>{stats.last7DogWorkloadKm.toFixed(1)} km</strong></article>
            <article className="stat-card"><span>Last 30 days dog workload</span><strong>{stats.last30DogWorkloadKm.toFixed(1)} km</strong></article>
          </div>
          <p className="muted-text">Training km counts the route once. Dog workload km counts every dog in the team and is better for individual workload.</p>
        </Panel>

        <Panel title="Top 10 dogs by season km">
          {stats.topDogs.length ? (
            <CompactDogList dogs={stats.topDogs} mode="km" />
          ) : (
            <EmptyState title="No trainings yet" text="Save the first training to start the ranking." />
          )}
        </Panel>

        <Panel title="Dogs with lowest km">
          <CompactDogList dogs={stats.lowKmDogs} mode="km" />
        </Panel>
      </div>

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
