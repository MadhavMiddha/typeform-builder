"use client";

import { useQuery } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";
import { CheckCircle, XCircle, Loader2, Zap } from "lucide-react";

/**
 * Home page – proves the frontend ↔ backend wiring works by calling /api/health.
 */
export default function HomePage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => api.get<HealthResponse>(endpoints.health()),
    retry: 1,
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdf4 0%, #f5f3ff 50%, #fdf2f8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-app)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0EC290 0%, #0a9b74 100%)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.20)",
              marginBottom: "0.75rem",
            }}
          >
            <Zap size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            Typeform Builder
          </h1>
          <p style={{ margin: "0.5rem 0 0", color: "rgba(255,255,255,0.85)", fontSize: "0.875rem" }}>
            Phase 1 – API Health Check
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "2rem" }}>
          <h2
            style={{
              margin: "0 0 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#9B9B9B",
            }}
          >
            Backend Status
          </h2>

          <StatusCard
            isLoading={isLoading}
            isError={isError}
            data={data}
            errorMessage={error instanceof Error ? error.message : "Connection failed"}
          />

          <button
            id="health-check-refetch"
            onClick={() => refetch()}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "0.75rem",
              border: "none",
              borderRadius: "8px",
              background: "#262627",
              color: "#fff",
              fontFamily: "var(--font-app)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = "0.85")}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = "1")}
          >
            Refresh
          </button>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              borderRadius: "8px",
              background: "#F5F5F5",
              fontSize: "0.8rem",
              color: "#6B6B6B",
            }}
          >
            <strong style={{ color: "#262627" }}>API URL:</strong>{" "}
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
            <br />
            <strong style={{ color: "#262627" }}>Endpoint:</strong> GET /api/health
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusCard({
  isLoading,
  isError,
  data,
  errorMessage,
}: {
  isLoading: boolean;
  isError: boolean;
  data: HealthResponse | undefined;
  errorMessage: string;
}) {
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1.25rem",
          borderRadius: "10px",
          border: "1.5px solid #EBEBEB",
          color: "#6B6B6B",
        }}
      >
        <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontWeight: 500 }}>Connecting to backend…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          padding: "1.25rem",
          borderRadius: "10px",
          border: "1.5px solid #E53E3E",
          background: "#FFF5F5",
        }}
      >
        <XCircle size={22} color="#E53E3E" style={{ flexShrink: 0, marginTop: "1px" }} />
        <div>
          <div style={{ fontWeight: 600, color: "#E53E3E", marginBottom: "0.25rem" }}>
            Backend unreachable
          </div>
          <div style={{ fontSize: "0.8rem", color: "#6B6B6B" }}>{errorMessage}</div>
          <div style={{ fontSize: "0.75rem", color: "#9B9B9B", marginTop: "0.5rem" }}>
            Make sure the backend is running: <code>uvicorn app.main:app --reload --port 8000</code>
          </div>
        </div>
      </div>
    );
  }

  if (data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1.25rem",
          borderRadius: "10px",
          border: "1.5px solid #0EC290",
          background: "#F0FDF9",
        }}
      >
        <CheckCircle size={22} color="#0EC290" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, color: "#0EC290", marginBottom: "0.25rem" }}>
            Backend is running
          </div>
          <div style={{ fontSize: "0.8rem", color: "#6B6B6B" }}>
            Status: <strong>{data.status}</strong> &nbsp;·&nbsp; Version: <strong>{data.version}</strong>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
