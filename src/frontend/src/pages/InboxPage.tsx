import {
  AtSign,
  Bell,
  ChevronLeft,
  Film,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Smile,
  Sparkles,
  UserPlus,
  Volume2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  gradientFrom: string;
  gradientTo: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  isOnline: boolean;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  isSent: boolean;
  timestamp: string;
}

type ActivitySheet = "followers" | "notifications" | "mentions" | null;

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    username: "alex_creates",
    displayName: "Alex Creates",
    initials: "AC",
    gradientFrom: "#ff0050",
    gradientTo: "#ff6b35",
    lastMessage: "Your last video was fire 🔥 keep it up!",
    timestamp: "2m",
    unread: true,
    isOnline: true,
  },
  {
    id: "2",
    username: "maya_streams",
    displayName: "Maya Streams",
    initials: "MS",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6366f1",
    lastMessage: "When's your next live? I'll tune in 🎉",
    timestamp: "15m",
    unread: true,
    isOnline: true,
  },
  {
    id: "3",
    username: "jordan.vibe",
    displayName: "Jordan Vibe",
    initials: "JV",
    gradientFrom: "#0ea5e9",
    gradientTo: "#06b6d4",
    lastMessage: "Sent you a video link — check it out",
    timestamp: "1h",
    unread: false,
    isOnline: false,
  },
  {
    id: "4",
    username: "priya_art",
    displayName: "Priya Art",
    initials: "PA",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
    lastMessage: "Thanks for the follow! 💚",
    timestamp: "3h",
    unread: false,
    isOnline: false,
  },
];

function getMockMessages(convo: Conversation): ChatMessage[] {
  return [
    {
      id: "m1",
      text: "Hey! Love your content 🔥",
      isSent: false,
      timestamp: "3:12 PM",
    },
    {
      id: "m2",
      text: "Thank you so much! That means a lot 🙌",
      isSent: true,
      timestamp: "3:14 PM",
    },
    {
      id: "m3",
      text: "Your last video was fire 🔥 keep it up!",
      isSent: false,
      timestamp: "3:15 PM",
    },
    ...(convo.id === "2"
      ? [
          {
            id: "m4",
            text: "When's your next live? I'll tune in 🎉",
            isSent: false,
            timestamp: "3:18 PM",
          },
        ]
      : []),
    ...(convo.id === "3"
      ? [
          {
            id: "m4",
            text: "Sent you a video link — check it out",
            isSent: false,
            timestamp: "2:00 PM",
          },
        ]
      : []),
  ];
}

// ─── Avatar component ─────────────────────────────────────────────────────────

function Avatar({
  convo,
  size = 44,
  showOnline = true,
}: {
  convo: Conversation;
  size?: number;
  showOnline?: boolean;
}) {
  const dotSize = Math.round(size * 0.27);
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: convo.avatarUrl
            ? "transparent"
            : `linear-gradient(135deg, ${convo.gradientFrom} 0%, ${convo.gradientTo} 100%)`,
        }}
      >
        {convo.avatarUrl ? (
          <img
            src={convo.avatarUrl}
            alt={convo.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="font-bold text-white"
            style={{ fontSize: Math.round(size * 0.36) }}
          >
            {convo.initials}
          </span>
        )}
      </div>
      {showOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-black"
          style={{
            width: dotSize,
            height: dotSize,
            background: convo.isOnline ? "#22c55e" : "#6b7280",
          }}
        />
      )}
    </div>
  );
}

// ─── Activity Sheet ────────────────────────────────────────────────────────────

function ActivitySheetContent({ type }: { type: ActivitySheet }) {
  if (!type) return null;

  const config = {
    followers: {
      icon: <UserPlus size={20} style={{ color: "#ff0050" }} />,
      title: "New Followers",
      items: [
        {
          name: "sofia.wave",
          initials: "SW",
          from: "#ff0050",
          to: "#ff6b35",
          time: "just now",
        },
        {
          name: "code_kira",
          initials: "CK",
          from: "#8b5cf6",
          to: "#6366f1",
          time: "5m",
        },
        {
          name: "the_niko_x",
          initials: "TN",
          from: "#0ea5e9",
          to: "#06b6d4",
          time: "12m",
        },
      ],
      label: "started following you",
    },
    notifications: {
      icon: <Bell size={20} style={{ color: "#ff0050" }} />,
      title: "Notifications",
      items: [
        {
          name: "alex_creates",
          initials: "AC",
          from: "#ff0050",
          to: "#ff6b35",
          time: "2m",
        },
        {
          name: "maya_streams",
          initials: "MS",
          from: "#8b5cf6",
          to: "#6366f1",
          time: "8m",
        },
        {
          name: "priya_art",
          initials: "PA",
          from: "#10b981",
          to: "#059669",
          time: "1h",
        },
        {
          name: "the_niko_x",
          initials: "TN",
          from: "#0ea5e9",
          to: "#06b6d4",
          time: "2h",
        },
        {
          name: "code_kira",
          initials: "CK",
          from: "#f59e0b",
          to: "#d97706",
          time: "3h",
        },
      ],
      label: "liked your video",
    },
    mentions: {
      icon: <AtSign size={20} style={{ color: "#ff0050" }} />,
      title: "Mentions",
      items: [
        {
          name: "sofia.wave",
          initials: "SW",
          from: "#ff0050",
          to: "#ff6b35",
          time: "30m",
        },
        {
          name: "code_kira",
          initials: "CK",
          from: "#8b5cf6",
          to: "#6366f1",
          time: "2h",
        },
      ],
      label: "mentioned you in a comment",
    },
  };

  const c = config[type];
  return (
    <div className="px-1 pt-2 pb-4">
      {c.items.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.25 }}
          className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{
            background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${item.from} 0%, ${item.to} 100%)`,
            }}
          >
            <span className="text-white font-bold text-sm">
              {item.initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-white font-semibold text-sm">
              @{item.name}
            </span>
            <span className="text-white/50 text-sm"> {c.label}</span>
          </div>
          <span className="text-white/30 text-xs flex-shrink-0">
            {item.time}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Chat View ────────────────────────────────────────────────────────────────

function ChatView({
  convo,
  onBack,
}: {
  convo: Conversation;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getMockMessages(convo),
  );
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      text,
      isSent: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  }

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="chat.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Back to inbox"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar convo={convo} size={38} showOnline />
          <div className="min-w-0">
            <p
              className="text-white font-semibold text-sm leading-none truncate"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {convo.displayName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: convo.isOnline ? "#22c55e" : "#6b7280" }}
              />
              <span
                className="text-xs"
                style={{
                  color: convo.isOnline ? "#22c55e" : "rgba(255,255,255,0.3)",
                }}
              >
                {convo.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isSent ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col gap-0.5 max-w-[75%]">
              <div
                className="px-4 py-2.5 rounded-2xl text-white text-sm leading-relaxed"
                style={{
                  background: msg.isSent
                    ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
                    : "rgba(255,255,255,0.08)",
                  borderRadius: msg.isSent
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  boxShadow: msg.isSent
                    ? "0 4px 16px rgba(255,0,80,0.25)"
                    : "none",
                }}
              >
                {msg.text}
              </div>
              <span
                className="text-[10px] px-1"
                style={{
                  color: "rgba(255,255,255,0.25)",
                  textAlign: msg.isSent ? "right" : "left",
                }}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 pb-8 pt-2"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="Emoji"
        >
          <Smile size={20} />
        </button>

        <input
          data-ocid="chat.input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none py-2.5 px-3 rounded-xl min-w-0"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: "16px",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="Send video link"
        >
          <Film size={18} />
        </button>

        <motion.button
          type="button"
          data-ocid="chat.send_button"
          onClick={handleSend}
          animate={{
            background: inputText.trim()
              ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
              : "rgba(255,255,255,0.07)",
          }}
          transition={{ duration: 0.2 }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            boxShadow: inputText.trim()
              ? "0 0 12px rgba(255,0,80,0.4)"
              : "none",
          }}
          aria-label="Send"
        >
          <Send
            size={16}
            className="transition-colors"
            style={{
              color: inputText.trim() ? "white" : "rgba(255,255,255,0.35)",
            }}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main InboxPage ────────────────────────────────────────────────────────────

export function InboxPage() {
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [activitySheet, setActivitySheet] = useState<ActivitySheet>(null);

  const activityItems: {
    id: ActivitySheet;
    label: string;
    icon: React.ReactNode;
    count: number;
    ocid: string;
  }[] = [
    {
      id: "followers",
      label: "New Followers",
      icon: <UserPlus size={16} />,
      count: 3,
      ocid: "inbox.new_followers_tab",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={16} />,
      count: 5,
      ocid: "inbox.notifications_tab",
    },
    {
      id: "mentions",
      label: "Mentions",
      icon: <AtSign size={16} />,
      count: 2,
      ocid: "inbox.mentions_tab",
    },
  ];

  const systemNotifications = [
    {
      icon: <Volume2 size={18} style={{ color: "#ff0050" }} />,
      title: "Welcome to SUB STREAM",
      subtitle: "Start uploading, go live, and connect with creators.",
      time: "Today",
    },
    {
      icon: <Sparkles size={18} style={{ color: "#ff0050" }} />,
      title: "New features available",
      subtitle: "Live streaming and gift system are now live!",
      time: "2d ago",
    },
    {
      icon: <MessageCircle size={18} style={{ color: "#ff0050" }} />,
      title: "Community guidelines update",
      subtitle: "We've updated our community standards. Take a look.",
      time: "1w ago",
    },
  ];

  const sheetConfig = activitySheet
    ? activityItems.find((a) => a.id === activitySheet)
    : null;

  return (
    <div
      data-ocid="inbox.page"
      className="w-full min-h-screen flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h1
          className="text-white font-bold text-xl"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Inbox
        </h1>
        <button
          type="button"
          data-ocid="inbox.search_button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Search messages"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto pb-24"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Activity row */}
        <div className="px-4 pt-4 pb-2">
          <div
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {activityItems.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                data-ocid={item.ocid}
                onClick={() => setActivitySheet(item.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl flex-shrink-0 relative"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-white/70">{item.icon}</span>
                <span
                  className="text-white text-sm font-medium whitespace-nowrap"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {item.label}
                </span>
                {item.count > 0 && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: "#ff0050", fontSize: 10 }}
                  >
                    {item.count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Messages section */}
        <div className="px-4 pt-5">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Messages
          </h2>

          {MOCK_CONVERSATIONS.length === 0 ? (
            <motion.div
              data-ocid="inbox.empty_state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,0,80,0.08)" }}
              >
                <MessageCircle size={28} style={{ color: "#ff0050" }} />
              </div>
              <p className="text-white font-semibold text-base mb-1">
                No messages yet.
              </p>
              <p className="text-white/40 text-sm mb-6">
                Your conversations will appear here.
              </p>
              <motion.button
                type="button"
                data-ocid="inbox.start_conversation_button"
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3 rounded-2xl text-white font-semibold text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                  boxShadow: "0 8px 24px rgba(255,0,80,0.3)",
                }}
              >
                Start a conversation
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {MOCK_CONVERSATIONS.map((convo, i) => (
                <motion.button
                  key={convo.id}
                  type="button"
                  data-ocid={`inbox.item.${i + 1}`}
                  onClick={() => setActiveConvo(convo)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
                  whileTap={{ scale: 0.985 }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl text-left transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 w-2 flex justify-center">
                    {convo.unread && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "#ff0050" }}
                      />
                    )}
                  </div>

                  <Avatar convo={convo} size={48} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className="font-semibold text-white text-sm truncate"
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        {convo.displayName}
                      </span>
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {convo.timestamp}
                      </span>
                    </div>
                    <p
                      className="text-sm truncate"
                      style={{
                        color: convo.unread
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(255,255,255,0.4)",
                        fontWeight: convo.unread ? 500 : 400,
                      }}
                    >
                      {convo.lastMessage}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* System Notifications */}
        <div className="px-4 pt-7">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            From SUB STREAM
          </h2>
          <div className="space-y-2">
            {systemNotifications.map((notif, i) => (
              <motion.div
                key={notif.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
                className="flex items-start gap-3 px-3 py-3.5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,0,80,0.1)" }}
                >
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-white font-semibold text-sm truncate"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {notif.title}
                    </p>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {notif.time}
                    </span>
                  </div>
                  <p
                    className="text-sm mt-0.5 leading-snug"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {notif.subtitle}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity sheet overlay */}
      <AnimatePresence>
        {activitySheet && sheetConfig && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setActivitySheet(null)}
            />
            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{
                background: "rgba(12,12,12,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                maxHeight: "80vh",
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>

              {/* Sheet header */}
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                {sheetConfig.icon}
                <h2
                  className="text-white font-bold text-base flex-1"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {sheetConfig.label}
                </h2>
                <button
                  type="button"
                  onClick={() => setActivitySheet(null)}
                  className="text-white/40 hover:text-white transition-colors text-sm px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                  aria-label="Close"
                >
                  Done
                </button>
              </div>

              {/* Sheet content */}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "calc(80vh - 100px)" }}
              >
                <ActivitySheetContent type={activitySheet} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat view */}
      <AnimatePresence>
        {activeConvo && (
          <ChatView convo={activeConvo} onBack={() => setActiveConvo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
