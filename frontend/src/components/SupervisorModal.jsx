import React, { useState, useEffect, useRef } from "react";
import { api } from "../api/api";

export default function SupervisorModal({ logId, machineId, onClose }) {
  const [badge, setBadge] = useState("");
  const [validation, setValidation] = useState(""); // EMPTY by default
  const [loading, setLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState(""); // Local error state
  const badgeRef = useRef(null);

  useEffect(() => {
    if (badgeRef.current) badgeRef.current.focus();
  }, []);

  const handleSubmit = async () => {
    console.log("🟡 Supervisor submit clicked");

    if (!badge.trim()) {
      setErrorMSG("Badge code is empty");
      if (badgeRef.current) badgeRef.current.focus();
      return;
    }

    if (!validation) {
      setErrorMSG("Please choose one status");
      return;
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
      setErrorMSG("Incorrect badge code");
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

        <div className="modal-field">
          <label className="label">Scan Badge</label>
          <input
            ref={badgeRef}
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
            placeholder="Supervisor badge code"
            className="input"
            style={{ width: "95%" }}
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

        {errorMSG && <div className="field-error" style={{ marginBottom: "15px" }}>{errorMSG}</div>}

        <div className="btn-row">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`btn primary ${loading ? "disabled" : ""}`}
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
