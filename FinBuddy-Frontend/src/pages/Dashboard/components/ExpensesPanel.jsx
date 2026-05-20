import React, { useState, useMemo } from "react";
import "./ExpensesPanel.css";
import LottieIcon from "./LottieIcon";
import { expensesAPI } from "../../../api/client";

import animSmile from "../animations/smile.json";
import animNeutral from "../animations/neutral.json";
import animCry from "../animations/cry.json";
import animAngry from "../animations/angry.json";
import animSad from "../animations/sad.json";
import animAmazing from "../animations/amazing.json";

const MOOD_ANIM = {
  "😊": animSmile,
  "😴": animNeutral,
  "😐": animCry,
  "😤": animAngry,
  "😢": animSad,
  "🤩": animAmazing,
};

const MOODS = ["😊", "😴", "😐", "😤", "😢", "🤩"];

const SORT_OPTIONS = [
  { value: "date_desc",   label: "En Yeni" },
  { value: "date_asc",    label: "En Eski" },
  { value: "amount_desc", label: "En Yüksek" },
  { value: "amount_asc",  label: "En Düşük" },
];

const DATE_OPTIONS = [
  { value: "all",        label: "Tümü" },
  { value: "today",      label: "Bugün" },
  { value: "week",       label: "Bu Hafta" },
  { value: "month",      label: "Bu Ay" },
  { value: "3_months",   label: "Son 3 Ay" },
  { value: "6_months",   label: "Son 6 Ay" },
  { value: "1_year",     label: "Son 1 Yıl" },
  { value: "5_years",    label: "Son 5 Yıl" },
];

const CATEGORY_COLORS = {
  "Market":        "#14b8a6",
  "Yemek":         "#f59e0b",
  "İçecek":        "#8b5cf6",
  "Temizlik":      "#3b82f6",
  "Kişisel Bakım": "#ec4899",
  "Elektronik":    "#06b6d4",
  "Giyim":         "#f97316",
  "Fatura":        "#ef4444",
  "Ulaşım":        "#84cc16",
  "Eğlence":       "#a855f7",
  "Sağlık":        "#22c55e",
  "Diğer":         "#6b7280",
};

const DEFAULT_CATEGORIES = [
  "Market", "Yemek", "İçecek", "Temizlik", "Kişisel Bakım",
  "Elektronik", "Giyim", "Fatura", "Ulaşım", "Eğlence", "Sağlık", "Diğer"
];

const INITIAL_FORM_STATE = { desc: "", amount: "", category: "Yemek", mood: "😊" };

const ExpensesPanel = ({ 
  expenses = [], 
  setExpenses, 
  onDeleteExpense,
  simulatedMonthOffset = 0 
}) => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState(INITIAL_FORM_STATE);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMood,      setFilterMood]     = useState("all");
  const [filterDate,      setFilterDate]     = useState("all");
  const [sortBy,          setSortBy]         = useState("date_desc");
  const [showFilters,     setShowFilters]    = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Zaman makinesine göre manipüle edilmiş sanal "Şu anki zaman" objesi
  const referenceDate = useMemo(() => {
    const d = new Date();
    if (simulatedMonthOffset > 0) {
      d.setMonth(d.getMonth() + simulatedMonthOffset);
    }
    return d;
  }, [simulatedMonthOffset]);

  // Gelen expenses verisindeki farklı kategorileri default olanlarla birleştirir
  const categories = useMemo(() => {
    const existingCats = expenses.map((e) => e.category);
    return [...new Set([...existingCats, ...DEFAULT_CATEGORIES])];
  }, [expenses]);

  // 🔥 Yenilenen ve Bugları Temizlenen Filtreleme ve Sıralama Mantığı
  const filtered = useMemo(() => {
    let list = [...expenses];

    // 1. Kategori Filtresi
    if (filterCategory !== "all") {
      list = list.filter((e) => e.category === filterCategory);
    }

    // 2. Duygu Filtresi
    if (filterMood !== "all") {
      list = list.filter((e) => e.mood === filterMood);
    }

    // 3. Tarih Filtresi
    if (filterDate !== "all") {
      list = list.filter((e) => {
        if (!e.date) return false;
        
        const dateParts = e.date.split("-");
        if (dateParts.length !== 3) return false;
        
        // Harcamanın gerçek tarihi (Aylar 0-11 arası indekslendiği için -1 yapıyoruz)
        const expenseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        if (isNaN(expenseDate.getTime())) return false;

        // Referans simülasyon zamanı (Saat, dakika, saniyeleri sıfırlıyoruz)
        const refDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
        
        const expenseTime = expenseDate.getTime();
        const refTime = refDate.getTime();

        if (filterDate === "today") {
          return expenseDate.toDateString() === refDate.toDateString();
        }
        
        if (filterDate === "week") {
          const weekAgo = new Date(refDate);
          weekAgo.setDate(refDate.getDate() - 7);
          return expenseTime >= weekAgo.getTime() && expenseTime <= refTime;
        }
        
        if (filterDate === "month") {
          return (
            expenseDate.getMonth() === refDate.getMonth() &&
            expenseDate.getFullYear() === refDate.getFullYear()
          );
        }
        
        if (filterDate === "3_months") {
          const threeMonthsAgo = new Date(refDate);
          threeMonthsAgo.setMonth(refDate.getMonth() - 3);
          return expenseTime >= threeMonthsAgo.getTime() && expenseTime <= refTime;
        }
        
        if (filterDate === "6_months") {
          const sixMonthsAgo = new Date(refDate);
          sixMonthsAgo.setMonth(refDate.getMonth() - 6);
          return expenseTime >= sixMonthsAgo.getTime() && expenseTime <= refTime;
        }
        
        if (filterDate === "1_year") {
          const oneYearAgo = new Date(refDate);
          oneYearAgo.setFullYear(refDate.getFullYear() - 1);
          return expenseTime >= oneYearAgo.getTime() && expenseTime <= refTime;
        }
        
        if (filterDate === "5_years") {
          const fiveYearsAgo = new Date(refDate);
          fiveYearsAgo.setFullYear(refDate.getFullYear() - 5);
          return expenseTime >= fiveYearsAgo.getTime() && expenseTime <= refTime;
        }
        
        return true;
      });
    }

    // 4. Sıralama Motoru
    list.sort((a, b) => {
      const amtA = parseFloat(a.amount) || 0;
      const amtB = parseFloat(b.amount) || 0;
      if (sortBy === "amount_desc") return amtB - amtA;
      if (sortBy === "amount_asc")  return amtA - amtB;

      // Güvenli milisaniye bazlı tarih sıralaması
      const dA = a.date ? new Date(a.date.split("-")[0], a.date.split("-")[1] - 1, a.date.split("-")[2]).getTime() : 0;
      const dB = b.date ? new Date(b.date.split("-")[0], b.date.split("-")[1] - 1, b.date.split("-")[2]).getTime() : 0;
      
      if (sortBy === "date_asc") return dA - dB;
      return dB - dA; // varsayılan date_desc (En Yeni)
    });

    return list;
  }, [expenses, filterCategory, filterMood, filterDate, sortBy, referenceDate]);

  const activeFilterCount = [
    filterCategory !== "all",
    filterMood !== "all",
    filterDate !== "all",
    sortBy !== "date_desc",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterMood("all");
    setFilterDate("all");
    setSortBy("date_desc");
  };

  const handleToggleAddForm = () => {
    if (showAddExpense) {
      setNewExpense(INITIAL_FORM_STATE);
    }
    setShowAddExpense(!showAddExpense);
  };

  // ASYNC VERİTABANI BAĞLANTILI EKLEME MOTORU
  const addExpense = async () => {
    const parsedAmount = parseFloat(newExpense.amount);
    if (!newExpense.desc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        desc: newExpense.desc.trim(),
        amount: parsedAmount,
        category: newExpense.category,
        date: referenceDate.toISOString().slice(0, 10), // YYYY-MM-DD
        mood: newExpense.mood,
        color: CATEGORY_COLORS[newExpense.category] || CATEGORY_COLORS["Diğer"]
      };

      const savedExpense = await expensesAPI.add(payload);

      setExpenses((prev) => [savedExpense, ...prev]);
      
      setNewExpense(INITIAL_FORM_STATE);
      setShowAddExpense(false);
    } catch (error) {
      console.error("🚨 Harcama kaydedilirken hata oluştu:", error);
      alert(error.message || "Harcama veritabanına mühürlenemedi reis.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSimulationActive = simulatedMonthOffset > 0;

  const totalAmount = useMemo(() => {
    return filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  }, [filtered]);

  return (
    <div className="tab-panel">
      {/* ── Başlık ── */}
      <div className="tab-header">
        <div>
          <h2>Harcamalar {isSimulationActive && "⏱️"}</h2>
          <p>
            {isSimulationActive ? (
              <span style={{ color: "#6ee7b7", fontWeight: "600" }}>
                🔮 {referenceDate.toLocaleString("tr-TR", { month: "long", year: "numeric" })} Simülasyon Listesi ({filtered.length} Kayıt)
              </span>
            ) : (
              `${filtered.length} kayıt — `
            )}
            <span className="total-badge">
              {totalAmount.toLocaleString("tr-TR")} TL
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`filter-toggle-btn ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filtrele {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <button
            className={`add-btn ${isSimulationActive ? "btn-disabled" : ""}`}
            disabled={isSimulationActive}
            onClick={handleToggleAddForm}
            title={isSimulationActive ? "Zaman makinesi aktifken manuel harcama eklenemez" : ""}
          >
            {showAddExpense ? "Kapat" : "+ Ekle"}
          </button>
        </div>
      </div>

      {/* SİMÜLASYON UYARI ŞERİDİ */}
      {isSimulationActive && (
        <div className="simulation-warning-banner">
          ⚠️ Zaman makinesiyle gelecektesin! Mevcut ayı kirletmemek adına simülasyon modunda manuel harcama girişi dondurulmuştur. Gerçek zamana dönerek yeni harcama ekebilirsin.
        </div>
      )}

      {/* ── Filtre paneli ── */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-label">Kategori</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${filterCategory === "all" ? "active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >
                Tümü
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-pill ${filterCategory === cat ? "active" : ""}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Tarih ({isSimulationActive ? "Sanal" : "Gerçek"})</span>
            <div className="filter-pills">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`filter-pill ${filterDate === opt.value ? "active" : ""}`}
                  onClick={() => setFilterDate(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Sıralama</span>
            <div className="filter-pills">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`filter-pill ${sortBy === opt.value ? "active" : ""}`}
                  onClick={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Duygu</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${filterMood === "all" ? "active" : ""}`}
                onClick={() => setFilterMood("all")}
              >
                Tümü
              </button>
              {MOODS.map((m) => (
                <button
                  key={m}
                  className={`filter-pill ${filterMood === m ? "active" : ""}`}
                  onClick={() => setFilterMood(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button className="filter-clear-btn" onClick={clearFilters}>
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {/* ── Harcama ekleme formu ── */}
      {showAddExpense && !isSimulationActive && (
        <div className="add-expense-form">
          <input
            className="db-inp"
            placeholder="Ne harcadın?"
            value={newExpense.desc}
            onChange={(e) => setNewExpense({ ...newExpense, desc: e.target.value })}
          />
          <input
            className="db-inp"
            placeholder="Tutar (TL)"
            type="number"
            step="0.01"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
          />
          
          <div className="category-select-row">
            <select
              className="db-inp select-inp"
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="mood-row">
            <span>Nasıl hissediyorsun?</span>
            <div className="mood-picker">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`mood-btn ${newExpense.mood === m ? "selected" : ""}`}
                  onClick={() => setNewExpense({ ...newExpense, mood: m })}
                  title={m}
                >
                  <LottieIcon
                    animationData={MOOD_ANIM[m] || animSmile}
                    size={30}
                    autoplay={newExpense.mood === m}
                  />
                </button>
              ))}
            </div>
          </div>
          
          <button 
            type="button" 
            className="add-btn" 
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addExpense();
            }}
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      )}

      {/* ── Harcama listesi ── */}
      <div className="expense-list">
        {filtered.length === 0 ? (
          <div className="expense-empty">
            <p>🐙 Sonuç bulunamadı!</p>
            <p>{isSimulationActive ? "Bu simüle aya ait kayıtlı harcama yok." : "Farklı filtreler deneyin."}</p>
          </div>
        ) : (
          filtered.map((e) => (
            <div key={e.id} className="expense-card">
              <div 
                className="expense-dot" 
                style={{ background: e.color || CATEGORY_COLORS[e.category] || CATEGORY_COLORS["Diğer"] }} 
              />
              <div className="expense-info">
                <span className="expense-desc">{e.desc}</span>
                <span className="expense-meta">
                  {e.category} — {e.date}
                </span>
              </div>
              <LottieIcon
                animationData={MOOD_ANIM[e.mood] || animSmile}
                size={28}
                className="expense-mood-lottie"
              />
              <span className="expense-amount">
                -{parseFloat(e.amount).toLocaleString("tr-TR")} TL
              </span>
              <button
                className="expense-delete"
                onClick={() => onDeleteExpense && onDeleteExpense(e.id)}
                title="Sil"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpensesPanel;