import { ArrowLeft, ChevronRight, LogOut, User } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsPage({ onBack, onLogout }: SettingsPageProps) {
  const { userProfile } = useAuth();

  const displayName = userProfile?.name || "Anonymous";
  const email = userProfile?.email || "";

  return (
    <div
      data-ocid="settings.page"
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-10 pb-3"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Settings
        </h1>
      </div>

      <motion.div
        className="flex-1 flex flex-col px-4 pt-6 pb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Account section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          Account
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Username row */}
          <div
            className="flex items-center gap-3 px-4 py-4 border-b"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,0,80,0.15)" }}
            >
              <User size={18} style={{ color: "#ff0050" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs mb-0.5">Username</p>
              <p className="text-white font-medium text-sm truncate">
                {displayName}
              </p>
            </div>
            <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
          </div>

          {/* Email row */}
          {email && (
            <div className="flex items-center gap-3 px-4 py-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <span className="text-white/50 text-base">@</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-xs mb-0.5">Email</p>
                <p className="text-white font-medium text-sm truncate">
                  {email}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* App info section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          About
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-white/60 text-sm">Version</span>
            <span className="text-white/30 text-sm">1.0.0</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout button */}
        <motion.button
          type="button"
          data-ocid="settings.logout_button"
          onClick={onLogout}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all duration-200"
          style={{
            background: "rgba(255, 0, 80, 0.1)",
            border: "1px solid rgba(255, 0, 80, 0.25)",
            color: "#ff0050",
          }}
        >
          <LogOut size={18} />
          Log Out
        </motion.button>

        <p className="text-white/15 text-xs text-center mt-6">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/30 transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
