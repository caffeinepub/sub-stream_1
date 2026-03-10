import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export type ReportReason =
  | "Spam"
  | "Harassment"
  | "Impersonation"
  | "Violence"
  | "Inappropriate content";

const REPORT_REASONS: ReportReason[] = [
  "Spam",
  "Harassment",
  "Impersonation",
  "Violence",
  "Inappropriate content",
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "video" | "comment" | "profile";
  contentId: string;
}

export interface StoredReport {
  id: string;
  contentType: "video" | "comment" | "profile";
  contentId: string;
  reason: ReportReason;
  timestamp: string;
  status: "pending" | "removed" | "dismissed";
}

export function saveReport(
  report: Omit<StoredReport, "id" | "timestamp" | "status">,
): void {
  try {
    const raw = localStorage.getItem("substream_reports");
    const reports: StoredReport[] = raw
      ? (JSON.parse(raw) as StoredReport[])
      : [];
    reports.push({
      ...report,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      status: "pending",
    });
    localStorage.setItem("substream_reports", JSON.stringify(reports));
  } catch {
    // silent
  }
}

export function ReportModal({
  isOpen,
  onClose,
  contentType,
  contentId,
}: ReportModalProps) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const titleLabel =
    contentType === "video"
      ? "Report Video"
      : contentType === "comment"
        ? "Report Comment"
        : "Report Profile";

  function handleSubmit() {
    if (!selected) return;
    saveReport({ contentType, contentId, reason: selected });
    setSubmitted(true);
  }

  function handleClose() {
    setSelected(null);
    setSubmitted(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop */}
          <div
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={handleClose}
          />
          <motion.div
            data-ocid="report.modal"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[310] rounded-t-3xl"
            style={{
              background: "rgba(14,14,14,0.99)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.2)" }}
              />
            </div>

            <div className="px-5 pb-10 pt-1">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2
                  className="text-white font-bold text-base"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {titleLabel}
                </h2>
                <button
                  type="button"
                  data-ocid="report.close_button"
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                  aria-label="Close"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>

              {submitted ? (
                <motion.div
                  data-ocid="report.success_state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-6 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: "rgba(34,197,94,0.15)" }}
                  >
                    ✅
                  </div>
                  <p
                    className="text-white font-semibold text-base"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    Report Submitted
                  </p>
                  <p className="text-white/50 text-sm">
                    Thank you for your report. Our team will review it shortly.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-2 px-8 py-3 rounded-2xl text-sm font-semibold text-white"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <>
                  <p className="text-white/40 text-sm mb-4">
                    Why are you reporting this content?
                  </p>
                  <div className="space-y-2 mb-6">
                    {REPORT_REASONS.map((reason, i) => (
                      <button
                        key={reason}
                        type="button"
                        data-ocid={`report.reason_radio.${i + 1}`}
                        onClick={() => setSelected(reason)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                        style={{
                          background:
                            selected === reason
                              ? "rgba(255,0,80,0.1)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            selected === reason
                              ? "1px solid rgba(255,0,80,0.4)"
                              : "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            borderColor:
                              selected === reason
                                ? "#ff0050"
                                : "rgba(255,255,255,0.25)",
                          }}
                        >
                          {selected === reason && (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: "#ff0050" }}
                            />
                          )}
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color:
                              selected === reason
                                ? "white"
                                : "rgba(255,255,255,0.7)",
                          }}
                        >
                          {reason}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-ocid="report.submit_button"
                    disabled={!selected}
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-2xl font-semibold text-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                      color: "white",
                      boxShadow: selected
                        ? "0 6px 24px rgba(255,0,80,0.35)"
                        : "none",
                    }}
                  >
                    Submit Report
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
