"use client";

import { useState, useEffect } from "react";

type TimeUnit = "hours" | "minutes" | "seconds";

export default function UpdatingPage() {
  const [durationValue, setDurationValue] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hours");
  const [isOffline, setIsOffline] = useState(false);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const res = await fetch("/api/maintenance");
    const data = await res.json();
    setIsOffline(data.enabled);
    setEndTime(data.endTime);
  };

  const handleOfflineService = async () => {
    if (!durationValue) return;
    setLoading(true);

    const value = parseFloat(durationValue);
    let milliseconds = 0;

    switch (timeUnit) {
      case "hours":
        milliseconds = value * 60 * 60 * 1000;
        break;
      case "minutes":
        milliseconds = value * 60 * 1000;
        break;
      case "seconds":
        milliseconds = value * 1000;
        break;
    }

    const endDate = new Date(Date.now() + milliseconds);

    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true, endTime: endDate.toISOString() }),
    });

    setIsOffline(true);
    setEndTime(endDate.toISOString());
    setLoading(false);
  };

  const handleOnlineService = async () => {
    setLoading(true);
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false, endTime: null }),
    });
    setIsOffline(false);
    setEndTime(null);
    setLoading(false);
  };

  const formatEndTime = (time: string) => {
    return new Date(time).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });
  };

  const getUnitLabel = (unit: TimeUnit) => {
    switch (unit) {
      case "hours":
        return "Jam";
      case "minutes":
        return "Menit";
      case "seconds":
        return "Detik";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "24px",
          padding: "48px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png"
            alt="Logo"
            style={{ width: "64px", height: "64px", marginBottom: "16px" }}
          />
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1a1a2e",
              margin: "0 0 8px 0",
            }}
          >
            Service Control Panel
          </h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            Kelola status layanan website
          </p>
        </div>

        <div
          style={{
            background: isOffline ? "#fef2f2" : "#f0fdf4",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            border: isOffline ? "1px solid #fecaca" : "1px solid #bbf7d0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: isOffline ? "#ef4444" : "#22c55e",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontWeight: "600",
                color: isOffline ? "#dc2626" : "#16a34a",
              }}
            >
              Status: {isOffline ? "OFFLINE" : "ONLINE"}
            </span>
          </div>
          {isOffline && endTime && (
            <p style={{ margin: "12px 0 0 0", fontSize: "14px", color: "#64748b" }}>
              Layanan kembali online: {formatEndTime(endTime)}
            </p>
          )}
        </div>

        {!isOffline ? (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Satuan Waktu
              </label>
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <option value="hours">Jam</option>
                <option value="minutes">Menit</option>
                <option value="seconds">Detik</option>
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Durasi Offline ({getUnitLabel(timeUnit)})
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                placeholder={`Masukkan jumlah ${getUnitLabel(timeUnit).toLowerCase()}`}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleOfflineService}
              disabled={loading || !durationValue}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                border: "none",
                background: loading || !durationValue
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                fontSize: "16px",
                fontWeight: "700",
                cursor: loading || !durationValue ? "not-allowed" : "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              {loading ? "Memproses..." : "Offline Service"}
            </button>
          </>
        ) : (
          <button
            onClick={handleOnlineService}
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background: loading
                ? "#cbd5e1"
                : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            {loading ? "Memproses..." : "Aktifkan Layanan"}
          </button>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "12px",
            color: "#94a3b8",
          }}
        >
          Halaman ini hanya untuk administrator
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
