"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const errorMessages: Record<string, { title: string; description: string }> = {
  "400": {
    title: "Bad Request",
    description: "Permintaan tidak valid. Silakan periksa parameter yang dikirim.",
  },
  "401": {
    title: "Unauthorized",
    description: "Akses tidak diizinkan. Silakan login terlebih dahulu.",
  },
  "403": {
    title: "Forbidden",
    description: "Anda tidak memiliki izin untuk mengakses resource ini.",
  },
  "404": {
    title: "Not Found",
    description: "Resource yang diminta tidak ditemukan.",
  },
  "429": {
    title: "Too Many Requests",
    description: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
  },
  "500": {
    title: "Internal Server Error",
    description: "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
  },
  "502": {
    title: "Bad Gateway",
    description: "Server menerima respons tidak valid dari upstream.",
  },
  "503": {
    title: "Service Unavailable",
    description: "Layanan sedang dalam pemeliharaan atau tidak tersedia.",
  },
  "504": {
    title: "Gateway Timeout",
    description: "Server tidak menerima respons tepat waktu.",
  },
};

function ErrorContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const code = params.code as string;
  const customMessage = searchParams.get("message");
  const endpoint = searchParams.get("endpoint");
  
  const errorInfo = errorMessages[code] || {
    title: "Unknown Error",
    description: "Terjadi kesalahan yang tidak diketahui.",
  };

  const getErrorColor = (code: string) => {
    const num = parseInt(code);
    if (num >= 500) return "#d93025";
    if (num >= 400) return "#f59e0b";
    return "#6366f1";
  };

  return (
    <div
      style={{
        padding: "20px",
        width: "90%",
        maxWidth: "500px",
      }}
    >
      <img
        src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png"
        alt="Logo"
        style={{
          width: "150px",
          height: "auto",
          marginBottom: "40px",
          display: "inline-block",
        }}
      />

      <div
        style={{
          fontSize: "5rem",
          fontWeight: 800,
          color: getErrorColor(code),
          lineHeight: 1,
          marginBottom: "10px",
        }}
      >
        {code}
      </div>

      <div
        style={{
          color: getErrorColor(code),
          fontWeight: 700,
          fontSize: "1.3rem",
          marginBottom: "30px",
        }}
      >
        {errorInfo.title}
      </div>

      <div
        style={{
          background: "#ffffff",
          padding: "30px 25px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          marginBottom: "25px",
        }}
      >
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "#444",
            fontWeight: 500,
            margin: 0,
          }}
        >
          {customMessage || errorInfo.description}
        </p>
        
        {endpoint && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: "10px",
              fontSize: "0.85rem",
              color: "#64748b",
              wordBreak: "break-all",
            }}
          >
            <strong>Endpoint:</strong> {endpoint}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: "linear-gradient(to right, #4361EE, #1D92F1)",
            color: "white",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          Kembali ke Beranda
        </a>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: "#f1f5f9",
            color: "#475569",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          Dashboard
        </a>
      </div>

      <p
        style={{
          fontSize: "0.8rem",
          color: "#99abb4",
          marginTop: "30px",
        }}
      >
        Jika masalah berlanjut, hubungi tim support kami
      </p>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eef5ff 0%, #ffffff 100%)",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#333",
        textAlign: "center",
      }}
    >
      <Suspense fallback={<div style={{ color: "#64748b" }}>Memuat...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
