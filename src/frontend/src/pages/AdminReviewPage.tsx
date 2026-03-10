import { ArrowLeft, CheckCircle, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { StoredReport } from "../components/ReportModal";

function loadReports(): StoredReport[] {
  try {
    const raw = localStorage.getItem("substream_reports");
    if (!raw) return [];
    return JSON.parse(raw) as StoredReport[];
  } catch {
    return [];
  }
}

function saveReports(reports: StoredReport[]) {
  try {
    localStorage.setItem("substream_reports", JSON.stringify(reports));
  } catch {
    // silent
  }
}

const BADGE_COLORS: Record<StoredReport["status"], string> = {
  pending: "rgba(255,180,0,0.15)",
  removed: "rgba(255,0,80,0.15)",
  dismissed: "rgba(255,255,255,0.06)",
};
const BADGE_TEXT: Record<StoredReport["status"], string> = {
  pending: "#ffb400",
  removed: "#ff0050",
  dismissed: "rgba(255,255,255,0.35)",
};

interface AdminReviewPageProps {
  onBack?: () => void;
}

export function AdminReviewPage({ onBack }: AdminReviewPageProps) {
  const [reports, setReports] = useState<StoredReport[]>(loadReports);

  function updateStatus(id: string, status: "removed" | "dismissed") {
    const updated = reports.map((r) => (r.id === id ? { ...r, status } : r));
    setReports(updated);
    saveReports(updated);
  }

  const pending = reports.filter((r) => r.status === "pending").length;
  const resolved = reports.filter((r) => r.status !== "pending").length;

  return (
    <div
      data-ocid="admin.page"
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-10 pb-3"
        style={{
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Admin — Content Reports
        </h1>
      </div>

      <motion.div
        className="flex-1 flex flex-col px-4 pt-5 pb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Stats */}
        <div className="flex gap-3 mb-6">
          {[
            {
              label: "Total",
              value: reports.length,
              color: "rgba(255,255,255,0.7)",
            },
            { label: "Pending", value: pending, color: "#ffb400" },
            {
              label: "Resolved",
              value: resolved,
              color: "rgba(255,255,255,0.4)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-2xl px-3 py-3 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                className="text-lg font-bold"
                style={{
                  color: stat.color,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                {stat.value}
              </p>
              <p className="text-white/30 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {reports.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              📋
            </div>
            <p className="text-white/40 text-sm">No reports yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                data-ocid={`admin.report.item.${i + 1}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="rounded-2xl px-4 py-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Type badge */}
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                    style={{
                      background: "rgba(255,0,80,0.12)",
                      color: "#ff0050",
                    }}
                  >
                    {report.contentType}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium truncate">
                      {report.reason}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5 truncate">
                      ID: {report.contentId}
                    </p>
                    <p className="text-white/25 text-xs mt-0.5">
                      {new Date(report.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {/* Status */}
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{
                      background: BADGE_COLORS[report.status],
                      color: BADGE_TEXT[report.status],
                    }}
                  >
                    {report.status}
                  </span>
                </div>

                {report.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      data-ocid="admin.report.dismiss_button"
                      onClick={() => updateStatus(report.id, "dismissed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      <CheckCircle size={13} />
                      Dismiss
                    </button>
                    <button
                      type="button"
                      data-ocid="admin.report.delete_button"
                      onClick={() => updateStatus(report.id, "removed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                      style={{
                        background: "rgba(255,0,80,0.1)",
                        border: "1px solid rgba(255,0,80,0.2)",
                        color: "#ff0050",
                      }}
                    >
                      <Trash2 size={13} />
                      Remove Content
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
