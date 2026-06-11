import { useEffect, useState } from "react";
import { HEALTH_STATUSES, POSITIONS, TRAINING_STATUSES } from "../data/options";

const emptyDog = {
  name: "",
  sex: "Male",
  dateOfBirth: "",
  mainPosition: "Team",
  alternativePosition: "",
  trainingStatus: "Active",
  healthStatus: "Active",
  form: 3,
  lastHeat: "",
  notes: "",
};

export default function DogForm({ dog, onSave, onCancel }) {
  const [form, setForm] = useState(dog || emptyDog);

  useEffect(() => {
    setForm(dog || emptyDog);
  }, [dog]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return alert("Dog name is required.");
    onSave({
      ...form,
      id: form.id || `dog-${Date.now()}-${form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: form.name.trim(),
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Dog Name
          <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Dog name" />
        </label>
        <label>
          Sex
          <select value={form.sex} onChange={(event) => update("sex", event.target.value)}>
            <option>Male</option>
            <option>Female</option>
          </select>
        </label>
        <label>
          Date of Birth
          <input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
        </label>
        <label>
          Main Position
          <select value={form.mainPosition} onChange={(event) => update("mainPosition", event.target.value)}>
            {POSITIONS.map((position) => <option key={position}>{position}</option>)}
          </select>
        </label>
        <label>
          Alternative Position
          <select value={form.alternativePosition} onChange={(event) => update("alternativePosition", event.target.value)}>
            <option value="">None</option>
            {POSITIONS.map((position) => <option key={position}>{position}</option>)}
          </select>
        </label>
        <label>
          Training Status
          <select value={form.trainingStatus} onChange={(event) => update("trainingStatus", event.target.value)}>
            {TRAINING_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Health Status
          <select value={form.healthStatus} onChange={(event) => update("healthStatus", event.target.value)}>
            {HEALTH_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Base Form
          <select value={form.form} onChange={(event) => update("form", Number(event.target.value))}>
            <option value={1}>1 · Poor</option>
            <option value={2}>2 · Tired / weak</option>
            <option value={3}>3 · Okay</option>
            <option value={4}>4 · Good</option>
            <option value={5}>5 · Very good</option>
          </select>
        </label>
        {form.sex === "Female" && (
          <label>
            Last Heat
            <input type="date" value={form.lastHeat || ""} onChange={(event) => update("lastHeat", event.target.value)} />
          </label>
        )}
        <label className="full-span">
          Notes
          <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Important notes about this dog" />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary">Save dog</button>
      </div>
    </form>
  );
}
