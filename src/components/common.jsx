import { STATUS_META } from "../data/options";

export function StatusBadge({ value }) {
  const meta = STATUS_META[value] || { tone: "neutral", label: value || "—" };
  return <span className={`badge ${meta.tone}`}>{meta.label}</span>;
}

export function StatCard({ label, value, hint }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
