import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getUsername } from "../lib/userFormat";

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenCreatorPayments?: () => void;
  onOpenBlockedUsers?: () => void;
  onOpenAdmin?: () => void;
}

export function SettingsPage({
  onBack,
  onLogout,
  onOpenCreatorPayments,
  onOpenBlockedUsers,
  onOpenAdmin,
}: SettingsPageProps) {
  const { userProfile, clearAllSessions } = useAuth();
  const [confirmReset, setConfirmReset] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(() => {
    return localStorage.getItem("substream_2fa_enabled") === "true";
  });

  useEffect(() => {
    localStorage.setItem(
      "substream_2fa_enabled",
      twoFaEnabled ? "true" : "false",
    );
  }, [twoFaEnabled]);

  const rawName = userProfile?.name || "";
  const displayName = getDisplayName(rawName) || "Anonymous";
  const username = getUsername(rawName);
  const email = userProfile?.email || "";

  return (
    <div
      data-ocid="settings.page"
      className="w-full flex flex-col"
      style={{ height: "100vh", overflow: "hidden", background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-10 pb-3 flex-shrink-0"
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
        className="flex flex-col px-4 pt-6 pb-10"
        style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
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
          {/* Display Name row */}
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
              <p className="text-white/50 text-xs mb-0.5">Display Name</p>
              <p
                className="text-white font-bold text-sm truncate tracking-wide"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {displayName}
              </p>
            </div>
            <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
          </div>

          {/* @Username row */}
          {username && (
            <div
              className="flex items-center gap-3 px-4 py-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="font-bold text-base"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  @
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-xs mb-0.5">@Username</p>
                <p className="text-white/80 font-medium text-sm truncate">
                  @{username}
                </p>
              </div>
              <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
            </div>
          )}

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

        {/* Creator Payments section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          Creator Payments
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <button
            type="button"
            data-ocid="settings.creator_payments_button"
            onClick={onOpenCreatorPayments}
            className="w-full flex items-center gap-3 px-4 py-4 text-left transition-all active:scale-[0.99]"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,0,80,0.15)" }}
            >
              <CreditCard size={18} style={{ color: "#ff0050" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-white font-semibold text-sm"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Creator Payments
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                Payout methods, history &amp; withdrawals
              </p>
            </div>
            <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
          </button>
        </div>

        {/* Privacy section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          Privacy
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <button
            type="button"
            data-ocid="settings.privacy_safety_button"
            onClick={onOpenBlockedUsers}
            className="w-full flex items-center gap-3 px-4 py-4 text-left transition-all active:scale-[0.99]"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Shield size={18} style={{ color: "#3b82f6" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-white font-semibold text-sm"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Privacy &amp; Safety
              </p>
              <p className="text-white/40 text-xs mt-0.5">Blocked Users</p>
            </div>
            <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
          </button>
        </div>

        {/* Security section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          Security
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.15)" }}
            >
              <ShieldCheck size={18} style={{ color: "#22c55e" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-white font-semibold text-sm"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Two-Factor Authentication
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                Require a code when logging in
              </p>
            </div>
            <Switch
              data-ocid="settings.2fa_toggle"
              checked={twoFaEnabled}
              onCheckedChange={setTwoFaEnabled}
              aria-label="Toggle two-factor authentication"
            />
          </div>
        </div>

        {/* About section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          About
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <span className="text-white/60 text-sm">Version</span>
            <span className="text-white/30 text-sm">1.0.0</span>
          </div>
        </div>

        {/* Admin section */}
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3 px-1">
          Admin
        </p>

        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <button
            type="button"
            data-ocid="settings.admin_review_button"
            onClick={onOpenAdmin}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-all active:scale-[0.99]"
          >
            <span className="text-white/40 text-sm">Admin Review</span>
            <ChevronRight size={16} className="text-white/20" />
          </button>
        </div>

        {/* Logout button */}
        <motion.button
          type="button"
          data-ocid="settings.logout_button"
          onClick={onLogout}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all duration-200 mb-3"
          style={{
            background: "rgba(255, 0, 80, 0.1)",
            border: "1px solid rgba(255, 0, 80, 0.25)",
            color: "#ff0050",
          }}
        >
          <LogOut size={18} />
          Log Out
        </motion.button>

        {/* Clear All Sessions button */}
        {!confirmReset ? (
          <motion.button
            type="button"
            data-ocid="settings.clear_sessions_button"
            onClick={() => setConfirmReset(true)}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <RefreshCw size={16} />
            Clear All Sessions &amp; Reset App
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,60,0,0.08)",
              border: "1px solid rgba(255,60,0,0.25)",
            }}
          >
            <p className="text-white/60 text-xs text-center px-4 pt-4 pb-2">
              This will sign you out and clear all local data. You will need to
              log in again.
            </p>
            <div
              className="flex border-t"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <button
                type="button"
                data-ocid="settings.reset_cancel_button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-3 text-sm font-medium border-r"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  borderColor: "rgba(255,255,255,0.07)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="settings.reset_confirm_button"
                onClick={() => {
                  clearAllSessions();
                  onLogout();
                }}
                className="flex-1 py-3 text-sm font-semibold"
                style={{ color: "#ff3c00" }}
              >
                Reset &amp; Sign Out
              </button>
            </div>
          </motion.div>
        )}

        {/* Delete Account */}
        <motion.button
          type="button"
          data-ocid="settings.delete_button"
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all duration-200 mt-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Delete Account
        </motion.button>

        <p className="text-white/15 text-xs text-center mt-6 mb-4">
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
