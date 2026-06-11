import { useState } from "react";
import { EmptyState } from "./common";

const emptyRoute = { name: "", distance: "", difficulty: "Easy", notes: "" };

export default function Routes({ routes, onAddRoute, onUpdateRoute, onDeleteRoute }) {
  const [form, setForm] = useState(emptyRoute);
  const [editingId, setEditingId] = useState(null);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const startEdit = (route) => {
    setEditingId(route.id);
    setForm({
      name: route.name || "",
      distance: route.distance || "",
      difficulty: route.difficulty || "Easy",
      notes: route.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyRoute);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return alert("Route name is required.");
    const route = {
      ...form,
      id: editingId || `route-${Date.now()}`,
      name: form.name.trim(),
      distance: form.distance === "" ? "" : Number(form.distance),
    };
    if (editingId) onUpdateRoute(route);
    else onAddRoute(route);
    resetForm();
  };

  return (
    <section className="page-grid">
      <div className="page-header">
        <div>
          <p className="eyebrow">Prepared for fixed routes</p>
          <h2>Routes</h2>
        </div>
      </div>

      <form className="form-card" onSubmit={submit}>
        <h3>{editingId ? "Edit Route" : "Add Route"}</h3>
        <div className="form-grid">
          <label>Route Name<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Route name" /></label>
          <label>Distance km<input type="number" step="0.1" min="0" value={form.distance} onChange={(event) => update("distance", event.target.value)} /></label>
          <label>Difficulty<select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option><option>Variable</option></select></label>
          <label className="full-span">Notes<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
        </div>
        <div className="form-actions">
          <button className="primary">{editingId ? "Save Route" : "Add Route"}</button>
          {editingId && <button type="button" className="ghost" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      {!routes.length ? <EmptyState title="No routes" text="Add your first route above." /> : (
        <div className="dog-card-grid">
          {routes.map((route) => (
            <article className="dog-card" key={route.id}>
              <h3>{route.name}</h3>
              <dl className="details-list">
                <div><dt>Distance</dt><dd>{route.distance ? `${route.distance} km` : "Variable"}</dd></div>
                <div><dt>Difficulty</dt><dd>{route.difficulty}</dd></div>
              </dl>
              {route.notes && <p className="note-box">{route.notes}</p>}
              <div className="button-row">
                <button type="button" className="secondary" onClick={() => startEdit(route)}>Edit</button>
                {route.id !== "route-open" && <button type="button" className="ghost danger-text" onClick={() => onDeleteRoute(route.id)}>Delete</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
