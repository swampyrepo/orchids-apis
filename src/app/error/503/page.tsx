"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ServiceUnavailable() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/maintenance");
        const data = await res.json();
        
        if (!data.enabled) {
          router.replace("/");
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          margin: 0,
          padding: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(180deg, #eef5ff 0%, #ffffff 100%)",
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#333",
          textAlign: "center" as const,
        }}
      >
        <p style={{ color: "#64748b" }}>Memeriksa status layanan...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(180deg, #eef5ff 0%, #ffffff 100%)",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#333",
        textAlign: "center" as const,
      }}
    >
      <div
        style={{
          padding: "20px",
          width: "90%",
          maxWidth: "450px",
        }}
      >
        <img
          src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png"
          alt="Logo"
          style={{
            width: "180px",
            height: "auto",
            marginBottom: "50px",
            display: "inline-block",
          }}
        />

        <div
          style={{
            color: "#d93025",
            fontWeight: 700,
            fontSize: "1.2rem",
            marginBottom: "30px",
          }}
        >
          HTTP 503 Service Unavailable:
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "40px 30px",
            borderRadius: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "#444",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Maaf, layanan kami sedang dalam pembaruan, silahkan periksa kembali saat 1 - 3 jam lagi.
            <br />
            Terima Kasih
          </p>
        </div>

        <p
          style={{
            fontSize: "0.85rem",
            color: "#99abb4",
            marginTop: "20px",
          }}
        >
          Halaman akan otomatis refresh saat layanan kembali online
        </p>
      </div>
    </div>
  );
}
