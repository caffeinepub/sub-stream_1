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

export interface CoinWallet {
  coinBalance: number;
  diamonds: number;
  totalSpent: number;
  giftHistory: GiftRecord[];
  paymentHistory: PaymentRecord[];
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
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_WALLET: CoinWallet = {
  coinBalance: 0,
  diamonds: 0,
  totalSpent: 0,
  giftHistory: [],
  paymentHistory: [],
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
