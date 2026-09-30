import { formatDate } from "../utils/dateUtils";
import { EmptyState } from "./common";

export default function RecentTrainings({ sessions = [], logs = [], onEditTraining, onDeleteTraining, onOpenSessions, limit = 5 }) {
  const sorted = [...sessions]
    .sort((a, b) => {
      const dateDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      if (dateDiff) return dateDiff;
      return String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || ""));
    })
    .slice(0, limit);

  const logsBySession = new Map();
  (logs || []).forEach((log) => {
    if (!log.trainingId) return;
    const list = logsBySession.get(log.trainingId) || [];
    list.push(log);
    logsBySession.set(log.trainingId, list);
  });

  return (
    <section className="panel recent-trainings-panel">
      <div className="panel-heading-row">
        <div>
          <p className="eyebrow">Fast access</p>
          <h3>Recent trainings</h3>
        </div>
        {onOpenSessions && <button className="secondary small-button" onClick={onOpenSessions}>Open sessions</button>}
      </div>
      {!sorted.length ? (
        <EmptyState title="No trainings yet" text="The last trainings will appear here after saving." />
      ) : (
        <div className="recent-training-list">
          {sorted.map((session) => {
            const teamLogs = logsBySession.get(session.id) || [];
            const dogs = teamLogs.map((log) => log.dogName).filter(Boolean).slice(0, 8).join(", ");
            return (
              <article className="recent-training-card" key={session.id}>
                <div className="recent-training-main">
                  <strong>{formatDate(session.date)} · {session.route || "Open distance"}</strong>
                  <span>{Number(session.distance || 0).toFixed(1)} km · {session.trainingType || "Training"} · {session.guide || "No guide"}</span>
                  <small>{session.fixedTeamName || `${session.numberOfDogs || teamLogs.length || 0} dogs`}{dogs ? ` · ${dogs}` : ""}</small>
                </div>
                <div className="recent-training-actions">
                  <button className="secondary small-button" onClick={() => onEditTraining?.(session.id)}>Edit</button>
                  <button className="danger-button small-button" onClick={() => onDeleteTraining?.(session.id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="muted-text recent-sync-note">After deleting or editing, the change is kept during Cloud Sync and will not be restored from the cloud.</p>
    </section>
  );
}
