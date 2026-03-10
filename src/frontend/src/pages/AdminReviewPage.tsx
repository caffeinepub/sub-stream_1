import {
  ArrowLeft,
  CheckCircle,
  FileX,
  Flag,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Video,
} from "lucide-react";
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

type AdminTab = "dashboard" | "moderation" | "violations" | "removals";

interface AdminReviewPageProps {
  onBack?: () => void;
}

const CARD_STYLE = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const RED_CARD_STYLE = {
  background: "rgba(255,0,80,0.06)",
  border: "1px solid rgba(255,0,80,0.18)",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminReviewPage({ onBack }: AdminReviewPageProps) {
  const [reports, setReports] = useState<StoredReport[]>(loadReports);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  function updateStatus(id: string, status: "removed" | "dismissed") {
    const updated = reports.map((r) => (r.id === id ? { ...r, status } : r));
    setReports(updated);
    saveReports(updated);
  }

  function restoreContent(id: string) {
    const updated = reports.map((r) =>
      r.id === id ? { ...r, status: "pending" as const } : r,
    );
    setReports(updated);
    saveReports(updated);
  }

  const pending = reports.filter((r) => r.status === "pending");
  const videoReports = pending.filter((r) => r.contentType === "video");
  const commentReports = pending.filter(
    (r) => r.contentType === "comment" || r.contentType === "profile",
  );
  const removed = reports.filter((r) => r.status === "removed");
  const dismissed = reports.filter((r) => r.status === "dismissed");

  const tabs: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    ocid: string;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <ShieldCheck size={15} />,
      ocid: "admin.dashboard_tab",
    },
    {
      id: "moderation",
      label: "Videos",
      icon: <Video size={15} />,
      ocid: "admin.moderation_tab",
    },
    {
      id: "violations",
      label: "Violations",
      icon: <Flag size={15} />,
      ocid: "admin.violation_tab",
    },
    {
      id: "removals",
      label: "Removed",
      icon: <FileX size={15} />,
      ocid: "admin.removal_tab",
    },
  ];

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
            data-ocid="admin.back_button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <h1
            className="text-white font-bold text-base"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Admin Dashboard
          </h1>
          <p className="text-white/30 text-xs">Content moderation & safety</p>
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: "rgba(255,0,80,0.2)", color: "#ff0050" }}
        >
          ADMIN
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-4 py-2 sticky z-20"
        style={{
          top: "88px",
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={tab.ocid}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background:
                activeTab === tab.id
                  ? "rgba(255,0,80,0.18)"
                  : "rgba(255,255,255,0.04)",
              color: activeTab === tab.id ? "#ff0050" : "rgba(255,255,255,0.4)",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(255,0,80,0.3)"
                  : "1px solid transparent",
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        className="flex-1 flex flex-col px-4 pt-5 pb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Dashboard Tab ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase">
              Overview
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Total Flagged",
                  value: reports.length,
                  color: "rgba(255,255,255,0.8)",
                  icon: <ShieldAlert size={18} />,
                },
                {
                  label: "Pending Review",
                  value: pending.length,
                  color: "#ffb400",
                  icon: <Flag size={18} />,
                },
                {
                  label: "Content Removed",
                  value: removed.length,
                  color: "#ff0050",
                  icon: <Trash2 size={18} />,
                },
                {
                  label: "Dismissed",
                  value: dismissed.length,
                  color: "rgba(255,255,255,0.3)",
                  icon: <CheckCircle size={18} />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl px-4 py-4"
                  style={CARD_STYLE}
                >
                  <div
                    className="mb-2"
                    style={{ color: stat.color, opacity: 0.7 }}
                  >
                    {stat.icon}
                  </div>
                  <p
                    className="text-2xl font-bold mb-0.5"
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

            {/* Quick access */}
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mt-2">
              Quick Actions
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab("moderation")}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={RED_CARD_STYLE}
              >
                <div className="flex items-center gap-3">
                  <Video size={18} style={{ color: "#ff0050" }} />
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Video Moderation
                    </p>
                    <p className="text-white/40 text-xs">
                      {videoReports.length} pending
                    </p>
                  </div>
                </div>
                <ArrowLeft
                  size={16}
                  className="rotate-180"
                  style={{ color: "rgba(255,0,80,0.6)" }}
                />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("violations")}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={CARD_STYLE}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} style={{ color: "#ffb400" }} />
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Violation Review
                    </p>
                    <p className="text-white/40 text-xs">
                      {commentReports.length} pending
                    </p>
                  </div>
                </div>
                <ArrowLeft size={16} className="rotate-180 text-white/20" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("removals")}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={CARD_STYLE}
              >
                <div className="flex items-center gap-3">
                  <FileX size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Content Removal Log
                    </p>
                    <p className="text-white/40 text-xs">
                      {removed.length} removed items
                    </p>
                  </div>
                </div>
                <ArrowLeft size={16} className="rotate-180 text-white/20" />
              </button>
            </div>
          </div>
        )}

        {/* ── Video Moderation Tab ── */}
        {activeTab === "moderation" && (
          <div className="space-y-3">
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase">
              Video Moderation Panel ({videoReports.length} pending)
            </p>

            {videoReports.length === 0 ? (
              <div
                data-ocid="admin.moderation.empty_state"
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <CheckCircle
                    size={24}
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                </div>
                <p className="text-white/30 text-sm">No flagged videos</p>
              </div>
            ) : (
              videoReports.map((report, i) => (
                <motion.div
                  key={report.id}
                  data-ocid={`admin.moderation.item.${i + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="rounded-2xl px-4 py-4"
                  style={CARD_STYLE}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,0,80,0.1)" }}
                    >
                      <Video size={18} style={{ color: "#ff0050" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {report.contentId || "Video content"}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        Reported by: {"Anonymous"}
                      </p>
                      <p className="text-white/30 text-xs">
                        {formatDate(Date.parse(report.timestamp))}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                      style={{
                        background: "rgba(255,180,0,0.15)",
                        color: "#ffb400",
                      }}
                    >
                      {report.reason}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid={`admin.approve_button.${i + 1}`}
                      onClick={() => updateStatus(report.id, "dismissed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      <CheckCircle size={14} />
                      Approve (Keep)
                    </button>
                    <button
                      type="button"
                      data-ocid={`admin.remove_button.${i + 1}`}
                      onClick={() => updateStatus(report.id, "removed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: "rgba(255,0,80,0.15)",
                        color: "#ff0050",
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── Violation Review Tab ── */}
        {activeTab === "violations" && (
          <div className="space-y-3">
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase">
              Violation Review ({commentReports.length} pending)
            </p>

            {commentReports.length === 0 ? (
              <div
                data-ocid="admin.violation.empty_state"
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <CheckCircle
                    size={24}
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                </div>
                <p className="text-white/30 text-sm">No pending violations</p>
              </div>
            ) : (
              commentReports.map((report, i) => (
                <motion.div
                  key={report.id}
                  data-ocid={`admin.violation.item.${i + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="rounded-2xl px-4 py-4"
                  style={CARD_STYLE}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,180,0,0.1)" }}
                    >
                      {report.contentType === "comment" ? (
                        <MessageSquare size={18} style={{ color: "#ffb400" }} />
                      ) : (
                        <User size={18} style={{ color: "#ffb400" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {report.contentType}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(255,180,0,0.15)",
                            color: "#ffb400",
                          }}
                        >
                          {report.reason}
                        </span>
                      </div>
                      <p className="text-white text-sm truncate">
                        {report.contentId || "Reported content"}
                      </p>
                      <p className="text-white/30 text-xs">
                        {formatDate(Date.parse(report.timestamp))}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid={`admin.dismiss_button.${i + 1}`}
                      onClick={() => updateStatus(report.id, "dismissed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      data-ocid={`admin.action_button.${i + 1}`}
                      onClick={() => updateStatus(report.id, "removed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: "rgba(255,0,80,0.15)",
                        color: "#ff0050",
                      }}
                    >
                      <ShieldAlert size={14} />
                      Take Action
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── Content Removal Log Tab ── */}
        {activeTab === "removals" && (
          <div className="space-y-3">
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase">
              Content Removal Log ({removed.length} items)
            </p>

            {removed.length === 0 ? (
              <div
                data-ocid="admin.removal.empty_state"
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <FileX size={24} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
                <p className="text-white/30 text-sm">No removed content yet</p>
              </div>
            ) : (
              removed.map((report, i) => (
                <motion.div
                  key={report.id}
                  data-ocid={`admin.removal.item.${i + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="rounded-2xl px-4 py-4"
                  style={{
                    background: "rgba(255,0,80,0.04)",
                    border: "1px solid rgba(255,0,80,0.12)",
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,0,80,0.1)" }}
                    >
                      <Trash2 size={18} style={{ color: "#ff0050" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {report.contentId || "Removed content"}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        Type: {report.contentType} · Reason: {report.reason}
                      </p>
                      <p className="text-white/30 text-xs">
                        Removed on {formatDate(Date.parse(report.timestamp))}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                      style={{
                        background: "rgba(255,0,80,0.15)",
                        color: "#ff0050",
                      }}
                    >
                      Removed
                    </span>
                  </div>

                  <button
                    type="button"
                    data-ocid={`admin.restore_button.${i + 1}`}
                    onClick={() => restoreContent(report.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <RotateCcw size={14} />
                    Restore Content
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
