import React, { useState, useEffect, useRef } from "react";
import { api } from "../api/api";

export default function SupervisorModal({ logId, machineId, onClose }) {
  const [badge, setBadge] = useState("");
  const [validation, setValidation] = useState(""); // EMPTY by default
  const [loading, setLoading] = useState(false);
  const badgeRef = useRef(null);

  useEffect(() => {
    if (badgeRef.current) badgeRef.current.focus();
  }, []);

  const handleSubmit = async () => {
    console.log("🟡 Supervisor submit clicked");

    if (!badge.trim()) {
      console.error("❌ Supervisor badge missing");
      return alert("Scan supervisor badge");
    }

    if (!validation) {
      console.error("❌ Validation status missing");
      return alert("Please select a validation status");
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
      // ERROR MANAGEMENT: Don't close the modal, let them try again!
      alert(err.response?.data?.error || "Failed to submit supervisor validation. Please check badge and try again.");
      setBadge(""); // Clear badge for a fresh scan
      if (badgeRef.current) badgeRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal glass-card blue-glass">
        <h3>Supervisor Validation</h3>

        <div style={{ marginBottom: "15px" }}>
          <label className="muted" style={{ display: "block", marginBottom: "8px" }}>Scan Badge</label>
          <input
            ref={badgeRef}
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && validation && handleSubmit()}
            placeholder="Supervisor badge code"
            className="input"
          />
        </div>

        <div className="radio-group">
          <div
            className={`radio-option ${validation === "CONFIRMED" ? "selected" : ""}`}
            onClick={() => setValidation("CONFIRMED")}
          >
            <div className="radio-circle">
              <div className="radio-inner"></div>
            </div>
            <span className="radio-label">CONFIRMED</span>
          </div>

          <div
            className={`radio-option ${validation === "NOT_CONFIRMED" ? "selected" : ""}`}
            onClick={() => setValidation("NOT_CONFIRMED")}
          >
            <div className="radio-circle">
              <div className="radio-inner"></div>
            </div>
            <span className="radio-label">NOT_CONFIRMED</span>
          </div>
        </div>

        <div className="btn-row">
          <button
            onClick={handleSubmit}
            disabled={loading || !validation || !badge.trim()}
            className={`btn primary ${(!validation || !badge.trim()) ? "disabled" : ""}`}
          >
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
