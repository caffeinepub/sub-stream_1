import { Search } from "lucide-react";
import { useState } from "react";

const TABS = ["LIVE", "Explore", "Following", "For You"] as const;
type Tab = (typeof TABS)[number];

export function TopNav() {
  const [activeTab, setActiveTab] = useState<Tab>("For You");

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
      {/* Spacer to balance search icon */}
      <div className="w-8" />

      {/* Center tabs */}
      <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            data-ocid={`topnav.tab.${i + 1}`}
            onClick={() => setActiveTab(tab)}
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
        className="w-8 h-8 flex items-center justify-center text-white hover:text-white/80 transition-colors"
        aria-label="Search"
      >
        <Search size={20} strokeWidth={2} />
      </button>
    </header>
  );
}
