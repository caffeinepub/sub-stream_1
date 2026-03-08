import { Bell, Search } from "lucide-react";
import { useState } from "react";

const TABS = ["LIVE", "Explore", "Following", "For You"] as const;
type Tab = (typeof TABS)[number];

interface TopNavProps {
  onNavigate?: (tab: string) => void;
  onSearch?: () => void;
  searchActive?: boolean;
  onNotifications?: () => void;
  notificationCount?: number;
}

export function TopNav({
  onNavigate,
  onSearch,
  searchActive,
  onNotifications,
  notificationCount = 0,
}: TopNavProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>("For You");

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    onNavigate?.(tab);
  };

  const displayCount = notificationCount > 99 ? "99+" : notificationCount;

  return (
    <header
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-10 pb-3"
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Bell / notifications icon */}
      <button
        type="button"
        data-ocid="topnav.notifications_button"
        onClick={() => onNotifications?.()}
        className="w-8 h-8 flex items-center justify-center transition-colors relative"
        style={{ color: "white" }}
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={2} />
        {notificationCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{
              background: "#ff0050",
              fontSize: 9,
              paddingInline: 3,
              lineHeight: 1,
            }}
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Center tabs */}
      <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            data-ocid={`topnav.tab.${i + 1}`}
            onClick={() => handleTabClick(tab)}
            className={`relative whitespace-nowrap text-sm font-medium transition-all duration-200 pb-1 ${
              activeTab === tab
                ? "text-white font-bold"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Search icon */}
      <button
        type="button"
        data-ocid="topnav.search_input"
        onClick={() => onSearch?.()}
        className="w-8 h-8 flex items-center justify-center transition-colors"
        style={{ color: searchActive ? "#ff0050" : "white" }}
        aria-label="Search"
      >
        <Search size={20} strokeWidth={2} />
      </button>
    </header>
  );
}
