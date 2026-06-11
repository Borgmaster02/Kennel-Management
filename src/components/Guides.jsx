import { useState } from "react";
import { EmptyState } from "./common";

export default function Guides({ guides, onAddGuide, onUpdateGuide, onDeleteGuide }) {
  const [newGuide, setNewGuide] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  const submitNewGuide = (event) => {
    event.preventDefault();
    onAddGuide(newGuide);
    setNewGuide("");
  };

  const startEdit = (guide) => {
    setEditing(guide);
    setEditValue(guide);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    onUpdateGuide(editing, editValue);
    setEditing(null);
    setEditValue("");
  };

  return (
    <section className="page-grid">
      <div className="page-header">
        <div>
          <p className="eyebrow">Guide list</p>
          <h2>Guides</h2>
        </div>
      </div>

      <section className="panel">
        <h3>Add guide</h3>
        <form className="inline-form" onSubmit={submitNewGuide}>
          <input value={newGuide} onChange={(event) => setNewGuide(event.target.value)} placeholder="Guide name" />
          <button className="primary" type="submit">Add Guide</button>
        </form>
      </section>

      <section className="panel">
        <h3>Saved guides</h3>
        {!guides.length ? (
          <EmptyState title="No guides yet" text="Add guides here so they can be selected quickly in New Training." />
        ) : (
          <div className="list-stack">
            {guides.map((guide) => (
              <div className="list-row guide-row" key={guide}>
                {editing === guide ? (
                  <form className="inline-form grow" onSubmit={saveEdit}>
                    <input value={editValue} onChange={(event) => setEditValue(event.target.value)} />
                    <button className="secondary" type="submit">Save</button>
                    <button className="ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <strong>{guide}</strong>
                    <div className="button-row compact-buttons">
                      <button className="secondary" onClick={() => startEdit(guide)}>Edit</button>
                      <button className="ghost danger-text" onClick={() => onDeleteGuide(guide)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
