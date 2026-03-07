import { Home, Mail, Plus, User, Users } from "lucide-react";
import { useState } from "react";

const TABS = [
  { id: "home", label: "Home", icon: Home, ocid: "bottomnav.home.tab" },
  {
    id: "friends",
    label: "Friends",
    icon: Users,
    ocid: "bottomnav.friends.tab",
  },
  { id: "inbox", label: "Inbox", icon: Mail, ocid: "bottomnav.inbox.tab" },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    ocid: "bottomnav.profile.tab",
  },
] as const;

type TabId = "home" | "friends" | "inbox" | "profile";

interface BottomNavProps {
  onOpenCreate?: () => void;
}

export function BottomNav({ onOpenCreate }: BottomNavProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-6 pt-2"
      style={{
        background:
          "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Home + Friends */}
      {TABS.slice(0, 2).map((tab) => (
        <NavTab
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
        />
      ))}

      {/* Create button — center */}
      <button
        type="button"
        data-ocid="bottomnav.create.button"
        onClick={() => onOpenCreate?.()}
        className="flex flex-col items-center gap-1 group"
        aria-label="Create"
      >
        <div
          className="w-14 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 group-active:scale-95"
          style={{
            background: "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
            boxShadow: "0 0 20px rgba(255,0,80,0.4)",
          }}
        >
          <Plus size={24} stroke="white" strokeWidth={2.5} />
        </div>
        <span className="text-white/50 text-[10px] font-medium">Create</span>
      </button>

      {/* Inbox + Profile */}
      {TABS.slice(2).map((tab) => (
        <NavTab
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
        />
      ))}
    </nav>
  );
}

interface NavTabProps {
  tab: { id: string; label: string; icon: React.ElementType; ocid: string };
  isActive: boolean;
  onClick: () => void;
}

function NavTab({ tab, isActive, onClick }: NavTabProps) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      data-ocid={tab.ocid}
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[56px] group transition-all duration-150"
      aria-label={tab.label}
    >
      <div className="w-11 h-9 flex items-center justify-center">
        <Icon
          size={23}
          strokeWidth={isActive ? 2.5 : 2}
          stroke={isActive ? "white" : "rgba(255,255,255,0.5)"}
          fill={isActive ? "rgba(255,255,255,0.15)" : "none"}
          className="transition-all duration-200 group-active:scale-90"
        />
      </div>
      <span
        className="text-[10px] font-medium transition-colors duration-200"
        style={{ color: isActive ? "white" : "rgba(255,255,255,0.5)" }}
      >
        {tab.label}
      </span>
    </button>
  );
}
