import { useEffect, useState } from "react";
import { listFilings, createFiling, submitFiling, deleteFiling } from "./api";

const emptyItem = () => ({ description: "", quantity: "1", unit_value: "" });

const emptyForm = {
  shipment_id: "",
  invoice_no: "",
  port: "",
  value: "",
  items: [emptyItem()],
};

function validate(form) {
  const errors = {};
  if (!form.shipment_id.trim()) errors.shipment_id = "Shipment ID is required";
  if (!form.invoice_no.trim()) errors.invoice_no = "Invoice number is required";
  if (!form.port.trim()) errors.port = "Port of entry is required";
  const value = parseFloat(form.value);
  if (!form.value || isNaN(value) || value <= 0) {
    errors.value = "Enter a total value greater than 0";
  }

  const itemErrors = form.items.map((item) => {
    const e = {};
    if (!item.description.trim()) e.description = "Required";
    const qty = parseInt(item.quantity, 10);
    if (!item.quantity || isNaN(qty) || qty <= 0) e.quantity = "Required";
    const uv = parseFloat(item.unit_value);
    if (item.unit_value === "" || isNaN(uv) || uv < 0) e.unit_value = "Required";
    return e;
  });
  if (itemErrors.some((e) => Object.keys(e).length > 0)) {
    errors.items = itemErrors;
  }

  return errors;
}

function StatusStamp({ status }) {
  return <span className={`stamp ${status}`}>{status}</span>;
}

export default function App() {
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formBanner, setFormBanner] = useState(null);

  const [rowBusyId, setRowBusyId] = useState(null);

  async function refresh() {
    try {
      setLoadError("");
      const data = await listFilings();
      setFilings(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function updateField(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function updateItem(index, field, val) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: val };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  }

  function removeItem(index) {
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFormBanner({ type: "error", text: "Fix the highlighted fields before submitting." });
      return;
    }

    setSubmitting(true);
    setFormBanner(null);
    try {
      const payload = {
        shipment_id: form.shipment_id.trim(),
        invoice_no: form.invoice_no.trim(),
        port: form.port.trim(),
        value: parseFloat(form.value),
        items: form.items.map((item) => ({
          description: item.description.trim(),
          quantity: parseInt(item.quantity, 10),
          unit_value: parseFloat(item.unit_value),
        })),
      };
      await createFiling(payload);
      setForm(emptyForm);
      setErrors({});
      setFormBanner({ type: "success", text: "Filing created and added to the ledger below." });
      refresh();
    } catch (err) {
      setFormBanner({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileToEdi(id) {
    setRowBusyId(id);
    try {
      await submitFiling(id);
      refresh();
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDelete(id) {
    setRowBusyId(id);
    try {
      await deleteFiling(id);
      refresh();
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="masthead-title">
          <h1>Filing Desk</h1>
          <span className="tag">Broker Console</span>
        </div>
        <div className="masthead-sub">customs filing intake &amp; submission ledger</div>
      </header>

      <div className="layout">
        <section className="panel">
          <div className="panel-header">
            <h2>New Filing</h2>
          </div>
          <form className="form-body" onSubmit={handleSubmit} noValidate>
            {formBanner && <div className={`banner ${formBanner.type}`}>{formBanner.text}</div>}

            <div className={`field ${errors.shipment_id ? "has-error" : ""}`}>
              <label htmlFor="shipment_id">Shipment ID</label>
              <input
                id="shipment_id"
                value={form.shipment_id}
                onChange={(e) => updateField("shipment_id", e.target.value)}
                placeholder="SHP-2026-0417"
              />
              {errors.shipment_id && <div className="field-error">{errors.shipment_id}</div>}
            </div>

            <div className={`field ${errors.invoice_no ? "has-error" : ""}`}>
              <label htmlFor="invoice_no">Invoice Number</label>
              <input
                id="invoice_no"
                value={form.invoice_no}
                onChange={(e) => updateField("invoice_no", e.target.value)}
                placeholder="INV-88214"
              />
              {errors.invoice_no && <div className="field-error">{errors.invoice_no}</div>}
            </div>

            <div className={`field ${errors.port ? "has-error" : ""}`}>
              <label htmlFor="port">Port of Entry</label>
              <input
                id="port"
                value={form.port}
                onChange={(e) => updateField("port", e.target.value)}
                placeholder="JNPT, Nhava Sheva"
              />
              {errors.port && <div className="field-error">{errors.port}</div>}
            </div>

            <div className={`field ${errors.value ? "has-error" : ""}`}>
              <label htmlFor="value">Total Invoice Value (₹)</label>
              <input
                id="value"
                inputMode="decimal"
                value={form.value}
                onChange={(e) => updateField("value", e.target.value)}
                placeholder="125000"
              />
              {errors.value && <div className="field-error">{errors.value}</div>}
            </div>

            <div className="items-block">
              <div className="items-block-label">
                <span>Line Items</span>
                <span>{form.items.length} item{form.items.length > 1 ? "s" : ""}</span>
              </div>
              {form.items.map((item, i) => {
                const itemErr = errors.items?.[i] || {};
                return (
                  <div className="item-row" key={i}>
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      style={itemErr.description ? { borderColor: "var(--danger)" } : undefined}
                    />
                    <input
                      placeholder="Qty"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      style={itemErr.quantity ? { borderColor: "var(--danger)" } : undefined}
                    />
                    <input
                      placeholder="Unit ₹"
                      inputMode="decimal"
                      value={item.unit_value}
                      onChange={(e) => updateItem(i, "unit_value", e.target.value)}
                      style={itemErr.unit_value ? { borderColor: "var(--danger)" } : undefined}
                    />
                    <button
                      type="button"
                      className="item-remove"
                      onClick={() => removeItem(i)}
                      aria-label="Remove item"
                      disabled={form.items.length === 1}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button type="button" className="add-item-btn" onClick={addItem}>
                + Add another item
              </button>
            </div>

            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Filing"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Filing Ledger</h2>
            <span className="ledger-count">{filings.length} on record</span>
          </div>

          {loadError && <div className="banner error" style={{ margin: 14 }}>{loadError}</div>}

          {loading ? (
            <div className="ledger-empty">Loading filings…</div>
          ) : filings.length === 0 ? (
            <div className="ledger-empty">
              No filings yet. Add one on the left — it'll show up here.
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th>Shipment / Invoice</th>
                  <th>Port</th>
                  <th>Items</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Filed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filings.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="mono">{f.shipment_id}</div>
                      <div className="filing-id">{f.invoice_no}</div>
                    </td>
                    <td className="mono">{f.port}</td>
                    <td>
                      <div className="item-preview">
                        {f.items.length} item{f.items.length > 1 ? "s" : ""} ·{" "}
                        {f.items[0]?.description}
                        {f.items.length > 1 ? " +more" : ""}
                      </div>
                    </td>
                    <td className="mono">₹{f.value.toLocaleString("en-IN")}</td>
                    <td>
                      <StatusStamp status={f.status} />
                    </td>
                    <td className="filing-id">
                      {new Date(f.submission_date).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <div className="row-actions">
                        {f.status === "draft" && (
                          <button
                            className="primary"
                            onClick={() => handleFileToEdi(f.id)}
                            disabled={rowBusyId === f.id}
                          >
                            {rowBusyId === f.id ? "Filing…" : "File to EDI"}
                          </button>
                        )}
                        <button
                          className="danger"
                          onClick={() => handleDelete(f.id)}
                          disabled={rowBusyId === f.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
