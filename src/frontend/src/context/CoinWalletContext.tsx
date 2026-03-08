import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GiftRecord {
  giftName: string;
  coinCost: number;
  sentAt: number;
  recipientName: string;
}

export interface PaymentRecord {
  amountUSD: number;
  coins: number;
  createdAt: number;
  packageId: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number; // USD
  method: string; // "PayPal" | "Bank Transfer" | "Debit Card" | "Stripe"
  status: "Processing" | "Completed" | "Failed";
  timestamp: number;
  transactionId: string;
  providerTransactionId?: string;
}

export interface CoinWallet {
  coinBalance: number;
  diamonds: number;
  totalSpent: number;
  giftHistory: GiftRecord[];
  paymentHistory: PaymentRecord[];
  totalGiftsReceived: number;
  totalWithdrawn: number;
  withdrawalHistory: WithdrawalRecord[];
  pendingWithdrawals: WithdrawalRecord[];
}

interface CoinWalletContextValue {
  coinBalance: number;
  diamonds: number;
  wallet: CoinWallet;
  addCoins: (amount: number) => void;
  deductCoins: (amount: number) => boolean;
  addDiamonds: (amount: number) => void;
  recordGift: (record: GiftRecord) => void;
  recordPayment: (record: PaymentRecord) => void;
  requestWithdrawal: (amount: number, method: string) => WithdrawalRecord;
  completeWithdrawal: (id: string) => void;
  failWithdrawal: (id: string) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_WALLET: CoinWallet = {
  coinBalance: 0,
  diamonds: 0,
  totalSpent: 0,
  giftHistory: [],
  paymentHistory: [],
  totalGiftsReceived: 0,
  totalWithdrawn: 0,
  withdrawalHistory: [],
  pendingWithdrawals: [],
};

const CoinWalletContext = createContext<CoinWalletContextValue>({
  coinBalance: 0,
  diamonds: 0,
  wallet: DEFAULT_WALLET,
  addCoins: () => {},
  deductCoins: () => false,
  addDiamonds: () => {},
  recordGift: () => {},
  recordPayment: () => {},
  requestWithdrawal: (amount, method) => ({
    id: "",
    amount,
    method,
    status: "Processing",
    timestamp: Date.now(),
    transactionId: "",
  }),
  completeWithdrawal: () => {},
  failWithdrawal: () => {},
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getStorageKey(principalText: string | null): string {
  return `substream_wallet_${principalText ?? "guest"}`;
}

function loadWallet(principalText: string | null): CoinWallet {
  try {
    const raw = localStorage.getItem(getStorageKey(principalText));
    if (!raw) return { ...DEFAULT_WALLET };
    const parsed = JSON.parse(raw) as Partial<CoinWallet>;
    return {
      coinBalance: parsed.coinBalance ?? 0,
      diamonds: parsed.diamonds ?? 0,
      totalSpent: parsed.totalSpent ?? 0,
      giftHistory: parsed.giftHistory ?? [],
      paymentHistory: parsed.paymentHistory ?? [],
      totalGiftsReceived: parsed.totalGiftsReceived ?? 0,
      totalWithdrawn: parsed.totalWithdrawn ?? 0,
      withdrawalHistory: parsed.withdrawalHistory ?? [],
      pendingWithdrawals: parsed.pendingWithdrawals ?? [],
    };
  } catch {
    return { ...DEFAULT_WALLET };
  }
}

function saveWallet(principalText: string | null, wallet: CoinWallet): void {
  try {
    localStorage.setItem(getStorageKey(principalText), JSON.stringify(wallet));
  } catch {
    // silent — storage might be unavailable
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CoinWalletProvider({ children }: PropsWithChildren) {
  const { identity } = useInternetIdentity();
  const principalText = identity?.getPrincipal().toString() ?? null;

  const [wallet, setWallet] = useState<CoinWallet>(() =>
    loadWallet(principalText),
  );

  // Reload wallet when the identity changes (login/logout/switch)
  useEffect(() => {
    setWallet(loadWallet(principalText));
  }, [principalText]);

  // Persist every time wallet changes
  useEffect(() => {
    saveWallet(principalText, wallet);
  }, [principalText, wallet]);

  const addCoins = useCallback((amount: number) => {
    setWallet((prev) => ({
      ...prev,
      coinBalance: prev.coinBalance + amount,
    }));
  }, []);

  const deductCoins = useCallback(
    (amount: number): boolean => {
      if (wallet.coinBalance < amount) return false;
      setWallet((prev) => ({
        ...prev,
        coinBalance: Math.max(0, prev.coinBalance - amount),
        totalSpent: prev.totalSpent + amount,
      }));
      return true;
    },
    [wallet.coinBalance],
  );

  const addDiamonds = useCallback((amount: number) => {
    setWallet((prev) => ({
      ...prev,
      diamonds: prev.diamonds + amount,
      totalGiftsReceived: prev.totalGiftsReceived + amount,
    }));
  }, []);

  const recordGift = useCallback((record: GiftRecord) => {
    setWallet((prev) => ({
      ...prev,
      giftHistory: [record, ...prev.giftHistory].slice(0, 200),
    }));
  }, []);

  const recordPayment = useCallback((record: PaymentRecord) => {
    setWallet((prev) => ({
      ...prev,
      paymentHistory: [record, ...prev.paymentHistory].slice(0, 200),
    }));
  }, []);

  const requestWithdrawal = useCallback(
    (amount: number, method: string): WithdrawalRecord => {
      const record: WithdrawalRecord = {
        id: `wd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount,
        method,
        status: "Processing",
        timestamp: Date.now(),
        transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
      };
      // Convert USD amount to diamonds removed (inverse of 1000 diamonds = $5 USD)
      const diamondsToDeduct = Math.ceil((amount / 5) * 1000);
      setWallet((prev) => ({
        ...prev,
        diamonds: Math.max(0, prev.diamonds - diamondsToDeduct),
        pendingWithdrawals: [...prev.pendingWithdrawals, record],
        withdrawalHistory: [record, ...prev.withdrawalHistory].slice(0, 200),
      }));
      return record;
    },
    [],
  );

  const completeWithdrawal = useCallback((id: string) => {
    setWallet((prev) => {
      const record = prev.pendingWithdrawals.find((w) => w.id === id);
      const updatedRecord = record
        ? { ...record, status: "Completed" as const }
        : null;
      return {
        ...prev,
        totalWithdrawn: prev.totalWithdrawn + (record?.amount ?? 0),
        pendingWithdrawals: prev.pendingWithdrawals.filter((w) => w.id !== id),
        withdrawalHistory: prev.withdrawalHistory.map((w) =>
          w.id === id ? { ...w, status: "Completed" as const } : w,
        ),
        ...(updatedRecord ? {} : {}),
      };
    });
  }, []);

  const failWithdrawal = useCallback((id: string) => {
    setWallet((prev) => {
      const record = prev.pendingWithdrawals.find((w) => w.id === id);
      // Refund diamonds on failure
      const diamondsToRefund = record
        ? Math.ceil((record.amount / 5) * 1000)
        : 0;
      return {
        ...prev,
        diamonds: prev.diamonds + diamondsToRefund,
        pendingWithdrawals: prev.pendingWithdrawals.filter((w) => w.id !== id),
        withdrawalHistory: prev.withdrawalHistory.map((w) =>
          w.id === id ? { ...w, status: "Failed" as const } : w,
        ),
      };
    });
  }, []);

  return (
    <CoinWalletContext.Provider
      value={{
        coinBalance: wallet.coinBalance,
        diamonds: wallet.diamonds,
        wallet,
        addCoins,
        deductCoins,
        addDiamonds,
        recordGift,
        recordPayment,
        requestWithdrawal,
        completeWithdrawal,
        failWithdrawal,
      }}
    >
      {children}
    </CoinWalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCoinWallet(): CoinWalletContextValue {
  return useContext(CoinWalletContext);
}
