import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { authorizedFetch } from "../../shared/api/client";
import type {
  AuthResponse,
  Locale,
  WalletPackage,
  WalletPaymentMethod,
  WalletResponse,
  WalletTransactionResponse,
} from "../../shared/types";

interface WalletPanelProps {
  accessToken: string;
  locale: Locale;
  copy: Record<string, string>;
  wallet: WalletResponse | null;
  loading: boolean;
  loadError: string;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onWalletChange: (wallet: WalletResponse) => void;
  applySession: (session: AuthResponse) => void;
  clearSession: () => void;
}

export function WalletPanel({
  accessToken,
  locale,
  copy,
  wallet,
  loading,
  loadError,
  dialogOpen,
  onDialogOpenChange,
  onWalletChange,
  applySession,
  clearSession,
}: WalletPanelProps) {
  const [submittingPackage, setSubmittingPackage] = useState("");
  const [topUpError, setTopUpError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<WalletPaymentMethod>("CLICK");
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");
  const transactionRequestSequence = useRef(0);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    if (dialogOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [dialogOpen]);
  useEffect(() => {
    void loadTransactions();
    return () => {
      transactionRequestSequence.current += 1;
    };
  }, [accessToken]);
  const money = (amountTiyin: number) => new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(amountTiyin / 100));
  const packageName = (walletPackage: WalletPackage) =>
    walletPackage.code === "VALUE" ? copy.walletValuePackage : copy.walletStarterPackage;

  async function loadTransactions() {
    const requestSequence = ++transactionRequestSequence.current;
    setTransactionsLoading(true);
    setTransactionsError("");
    try {
      const response = await authorizedFetch(
        "/api/v1/wallet/transactions",
        accessToken,
        {},
        applySession,
        clearSession,
      );
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.walletHistoryFailed);
      }
      const result = await response.json() as WalletTransactionResponse[];
      if (requestSequence === transactionRequestSequence.current) {
        setTransactions(result);
      }
    } catch (error) {
      if (requestSequence === transactionRequestSequence.current) {
        setTransactionsError(error instanceof Error ? error.message : copy.walletHistoryFailed);
      }
    } finally {
      if (requestSequence === transactionRequestSequence.current) {
        setTransactionsLoading(false);
      }
    }
  }

  const transactionName = (type: WalletTransactionResponse["type"]) => {
    switch (type) {
      case "TOP_UP": return copy.walletTransactionTopUp;
      case "WORK": return copy.walletTransactionWork;
      case "WORK_REFUND": return copy.walletTransactionRefund;
      case "MARKETPLACE_PURCHASE": return copy.walletTransactionPurchase;
    }
  };
  const transactionStatus = (status: WalletTransactionResponse["status"]) => {
    switch (status) {
      case "RESERVED": return copy.walletTransactionPending;
      case "SETTLED": return copy.walletTransactionSettled;
      case "REFUNDED": return copy.walletTransactionRefunded;
    }
  };

  async function topUp(walletPackage: WalletPackage) {
    if (!wallet?.sandboxEnabled || submittingPackage) return;
    setSubmittingPackage(walletPackage.code);
    setTopUpError("");
    try {
      const response = await authorizedFetch("/api/v1/wallet/topups", accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageCode: walletPackage.code,
          idempotencyKey: crypto.randomUUID(),
          paymentMethod,
        }),
      }, applySession, clearSession);
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.walletTopUpFailed);
      }
      onWalletChange(await response.json() as WalletResponse);
      onDialogOpenChange(false);
      await loadTransactions();
    } catch (error) {
      setTopUpError(error instanceof Error ? error.message : copy.walletTopUpFailed);
    } finally {
      setSubmittingPackage("");
    }
  }

  return (
    <>
      <section className="wallet-panel" aria-label={copy.walletBalance}>
        <div className="wallet-panel-heading">
          <span>{copy.walletBalance}</span>
          {wallet && <span className="wallet-work-count">{wallet.workCredits} {copy.walletWorks}</span>}
        </div>
        <div className="wallet-panel-amount">
          {loading && !wallet ? "…" : wallet ? money(wallet.balanceTiyin) : "—"}
          <span>{wallet?.currency ?? "UZS"}</span>
        </div>
        {(loadError || topUpError) && <p className="wallet-error" role="alert">{loadError || topUpError}</p>}
        <button className="wallet-topup-button" type="button" disabled={!wallet} onClick={() => {
          setTopUpError("");
          onDialogOpenChange(true);
        }}>
          <Plus size={15} aria-hidden="true" />
          {copy.walletTopUp}
        </button>
        <details className="wallet-history">
          <summary>{copy.walletHistory}</summary>
          {transactionsLoading && transactions.length === 0
            ? <p className="wallet-history-message">{copy.walletHistoryLoading}</p>
            : transactions.length === 0 && !transactionsError
              ? <p className="wallet-history-message">{copy.walletHistoryEmpty}</p>
              : (
                <ul className="wallet-history-list">
                  {transactions.map((transaction) => (
                    <li className="wallet-transaction" key={transaction.id}>
                      <div className="wallet-transaction-heading">
                        <span>{transactionName(transaction.type)}</span>
                        <strong className={transaction.amountTiyin < 0 ? "is-debit" : "is-credit"}>
                          {transaction.amountTiyin > 0 ? "+" : "−"}
                          {money(Math.abs(transaction.amountTiyin))} UZS
                        </strong>
                      </div>
                      <div className="wallet-transaction-meta">
                        <span>{transactionStatus(transaction.status)}</span>
                        <time dateTime={transaction.createdAt}>
                          {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" })
                            .format(new Date(transaction.createdAt))}
                        </time>
                      </div>
                      {transaction.paymentMethod && (
                        <p className="wallet-transaction-meta">
                          {transaction.paymentMethod}{transaction.sandbox ? ` · ${copy.walletTransactionSandbox}` : ""}
                        </p>
                      )}
                      <p className="wallet-transaction-reference" title={transaction.id}>
                        {copy.walletTransactionReference}: {transaction.id}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
          {transactionsError && <p className="wallet-error" role="alert">{transactionsError}</p>}
        </details>
      </section>
      {dialogOpen && (
        <dialog
          ref={dialogRef}
          className="wallet-dialog"
          aria-labelledby="wallet-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            onDialogOpenChange(false);
          }}
        >
          <div className="wallet-dialog-heading">
            <div>
              <p className="eyebrow">{copy.walletBalance}</p>
              <h2 id="wallet-dialog-title">{copy.walletTopUpTitle}</h2>
            </div>
            <button className="wallet-dialog-close" type="button" aria-label={copy.close} onClick={() => onDialogOpenChange(false)}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="wallet-dialog-copy">{copy.walletTopUpCopy}</p>
          {wallet?.sandboxEnabled
            ? <p className="wallet-sandbox-notice">{copy.walletSandboxNotice}</p>
            : <p className="wallet-sandbox-disabled" role="status">{copy.walletSandboxDisabled}</p>}
          {topUpError && <p className="wallet-error" role="alert">{topUpError}</p>}
          <fieldset className="wallet-payment-methods">
            <legend>{copy.walletPaymentMethod}</legend>
            {([
              ["CLICK", "Click"],
              ["PAYME", "Payme"],
              ["UZUM", "Uzum"],
              ["VISA", "Visa"],
              ["MASTERCARD", "Mastercard"],
              ["HUMO", "Humo"],
              ["UZCARD", "Uzcard"],
            ] as const).map(([method, label]) => (
              <label className="wallet-payment-method" key={method}>
                <input
                  type="radio"
                  name="wallet-payment-method"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div className="wallet-packages">
            {wallet?.packages.map((walletPackage) => (
              <article className="wallet-package" key={walletPackage.code}>
                <h3>{packageName(walletPackage)}</h3>
                <p className="wallet-package-price">{money(walletPackage.amountTiyin)} <span>UZS</span></p>
                <p className="wallet-package-works">{walletPackage.workUnits} {copy.walletWorks}</p>
                <p className="wallet-package-rate">
                  {copy.walletEachWork}: {money(walletPackage.costPerWorkTiyin)} UZS
                </p>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!wallet?.sandboxEnabled || Boolean(submittingPackage)}
                  onClick={() => void topUp(walletPackage)}
                >
                  {submittingPackage === walletPackage.code ? copy.walletTopUpPending : copy.walletTopUpAction}
                </button>
              </article>
            ))}
          </div>
        </dialog>
      )}
    </>
  );
}
