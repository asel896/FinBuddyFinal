import { useState, useCallback, useEffect, useRef } from "react";
import "./Toast.css";

// =====================================================================
// ── 🔌 CUSTOM HOOK: useToast & BİLDİRİM MOTORU ───────────────────────
// =====================================================================
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = "info", duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Kısayol Fonksiyonları (Shortcuts)
  const success = useCallback((msg, opts) => addToast({ message: msg, type: "success", ...opts }), [addToast]);
  const error   = useCallback((msg, opts) => addToast({ message: msg, type: "error",   ...opts }), [addToast]);
  const warning = useCallback((msg, opts) => addToast({ message: msg, type: "warning", ...opts }), [addToast]);
  const info    = useCallback((msg, opts) => addToast({ message: msg, type: "info",    ...opts }), [addToast]);

  /**
   * 🐙 ZAMAN MAKİNESİ HEDEF AKTARIM BİLDİRİM MOTORU
   * Dashboard.jsx içinde useToast'u çağırırken bu yardımcı fonksiyonu useEffect içinde tetikleyebilirsin.
   * Veya doğrudan Dashboard.jsx'teki useEffect içinde destruct ettiğin `success` ve `warning` metotlarını kullanabilirsin.
   */
  const triggerSimulationToast = useCallback(({ simulatedMonthOffset, goals, expenses, userData, BUDGET }) => {
    // Eğer kullanıcı bugüne geri döndüyse veya hedefler yüklenmediyse işlem yapma
    if (simulatedMonthOffset <= 0 || !goals || goals.length === 0) return;

    const monthlyLimit = userData?.budget ? parseFloat(userData.budget) : BUDGET;
    
    // 1. Aktif (içinde bulunulan) ayın toplam harcamasını bul
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const currentMonthExpensesTotal = expenses
      .filter(e => e.date && e.date.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // 2. Kalan bakiye kontrolü
    const leftoverBudget = monthlyLimit - currentMonthExpensesTotal;

    if (leftoverBudget > 0) {
      // En yüksek öncelikli hedefi bul, yoksa ilk hedefi seç
      const highPriorityGoal = goals.find(g => g.priority === "high");
      const targetGoalName = highPriorityGoal ? highPriorityGoal.name : goals[0]?.name;

      success(
        `⏱️ Zaman Makinesi: Kalan ${leftoverBudget.toLocaleString("tr-TR")} TL bütçe artığı, en yüksek öncelikli "${targetGoalName}" hedefine başarıyla simüle edildi! 🐙`,
        { duration: 5000 }
      );
    } else {
      warning("Simülasyon Aktif: Bu ay bütçenizde kalan bakiye olmadığı için hedeflere aktarım yapılamadı reis. 🌊");
    }
  }, [success, warning]);

  return { toasts, removeToast, success, error, warning, info, triggerSimulationToast };
};

// =====================================================================
// ── 🔲 SINGLE TOAST ITEM (Tekli Bildirim Kartı) ─────────────────────
// =====================================================================
const ToastItem = ({ id, message, type, duration, onRemove }) => {
  const timerRef = useRef(null);
  const [leaving, setLeaving] = useState(false);

  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onRemove(id), 350);
  }, [id, onRemove]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, duration);
    return () => clearTimeout(timerRef.current);
  }, [dismiss, duration]);

  return (
    <div className={`toast toast--${type} ${leaving ? "toast--leave" : "toast--enter"}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={dismiss}>×</button>
    </div>
  );
};

// =====================================================================
// ── 🧱 TOAST CONTAINER (Kapsayıcı Panel) ─────────────────────────────
// =====================================================================
export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <ToastItem key={t.id} {...t} onRemove={removeToast} />
    ))}
  </div>
);

export default ToastContainer;