import React, { useState } from "react";
import { api } from "../api/api";

export default function SupervisorModal({ logId, machineId, onClose }) {
  const [badge, setBadge] = useState("");
  const [validation, setValidation] = useState("CONFIRMED");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log("🟡 Supervisor submit clicked");

    if (!badge.trim()) {
      console.error("❌ Supervisor badge missing");
      return alert("Scan supervisor badge");
    }

    const payload = {
      log_id: logId,
      machine_id: machineId,
      supervisor_badge: badge.trim(),
      validation
    };

    console.log("📤 Sending payload to backend:", payload);

    setLoading(true);

    try {
      const res = await api.post("/logs/confirm", payload);
      console.log("✅ Backend response:", res.data);
      onClose(true);
    } catch (err) {
      console.error("❌ Supervisor submit error:", err.response?.data || err);
      alert("Failed to submit supervisor validation");
      onClose(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal glass-card blue-glass">
        <h3>Supervisor Validation</h3>

        <input
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          placeholder="Supervisor badge code"
          className="input"
        />

        <select
          value={validation}
          onChange={(e) => setValidation(e.target.value)}
          className="input"
        >
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="NOT_CONFIRMED">NOT_CONFIRMED</option>
        </select>

        <div className="btn-row">
          <button onClick={handleSubmit} disabled={loading} className="btn primary">
            {loading ? "Submitting..." : "Submit"}
          </button>
          <button onClick={() => onClose(false)} className="btn outline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
