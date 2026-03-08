import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TxType =
  | "coin_purchase"
  | "gift_sent"
  | "gift_received"
  | "withdrawal";

export interface WalletTransaction {
  id: string;
  type: TxType;
  label: string;
  amount: string;
  amountColor: "green" | "red" | "yellow";
  transactionId: string;
  status: "Completed" | "Processing" | "Failed";
  timestamp: number;
}

interface WalletContextValue {
  transactions: WalletTransaction[];
  addTransaction: (tx: Omit<WalletTransaction, "id" | "timestamp">) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue>({
  transactions: [],
  addTransaction: () => {},
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "substream_wallet_txns";

const SEED_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "seed-tx-1",
    type: "coin_purchase",
    label: "1,000 coins purchased",
    amount: "+1,000 coins",
    amountColor: "green",
    transactionId: "TXN-SEED001A",
    status: "Completed",
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "seed-tx-2",
    type: "gift_sent",
    label: "Rose gift sent",
    amount: "-1 coin",
    amountColor: "red",
    transactionId: "TXN-SEED002B",
    status: "Completed",
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

function loadTransactions(): WalletTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED_TRANSACTIONS];
    const parsed = JSON.parse(raw) as WalletTransaction[];
    if (!Array.isArray(parsed) || parsed.length === 0)
      return [...SEED_TRANSACTIONS];
    return parsed;
  } catch {
    return [...SEED_TRANSACTIONS];
  }
}

function saveTransactions(transactions: WalletTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    // silent
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: PropsWithChildren) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    loadTransactions(),
  );

  // Persist on every change
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  const addTransaction = useCallback(
    (tx: Omit<WalletTransaction, "id" | "timestamp">) => {
      const newTx: WalletTransaction = {
        ...tx,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      setTransactions((prev) => [newTx, ...prev].slice(0, 500));
    },
    [],
  );

  return (
    <WalletContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
