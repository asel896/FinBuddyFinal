import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import "./components/Profilecard.css";
import "./components/Exportfab.css";
import Onboarding from "./components/Onboarding";

import LottieIcon from "./components/LottieIcon";
import ChatPanel     from "./components/ChatPanel";
import ExpensesPanel from "./components/ExpensesPanel";
import GoalsPanel    from "./components/GoalsPanel";
import InsightsPanel from "./components/InsightsPanel";
import ReceiptPanel  from "./components/ReceiptPanel";
import BadgesPanel   from "./components/BadgesPanel";
import ProfileCard   from "./components/Profilecard"; 
import { ToastContainer, useToast } from "./components/Toast";

import { expensesAPI, goalsAPI, userAPI, badgesAPI } from "../../api/client";

import animChat   from "./animations/chat.json";
import animMoney  from "./animations/money.json";
import animTarget from "./animations/target.json";
import animStats  from "./animations/stats.json";
import animScan   from "./animations/scan.json";
import animExport from "./animations/export.json";
import animDark   from "./animations/dark.json";
import animLight  from "./animations/light.json";

const NAV_TABS = [
  { id: "chat",      animationData: animChat,   label: "Asistan"      },
  { id: "expenses",  animationData: animMoney,  label: "Harcamalar"   },
  { id: "goals",     animationData: animTarget, label: "Hedefler"     },
  { id: "insights",  animationData: animStats,  label: "Analizler"    },
  { id: "receipt",   animationData: animScan,   label: "Fiş & Fatura" },
  { id: "badges",    animationData: animTarget, label: "Rozetlerim"   },
];

const BUDGET = 3000;

// ── Sidebar Export Bileşeni ──────────────────────────────────────────────
const SidebarExport = ({ expenses, goals }) => {
  const [done, setDone] = useState(null);

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doExport = (key) => {
    const date = new Date().toISOString().slice(0, 10);
    if (key === "csv") {
      const rows = [["Açıklama", "Tutar (TL)", "Kategori", "Tarih", "Duygu"]];
      expenses.forEach((e) =>
        rows.push([e.desc, e.amount, e.category, e.date, e.mood || ""])
      );
      if (goals.length) {
        rows.push([]);
        rows.push(["Hedef", "Mevcut (TL)", "Hedef (TL)", "İlerleme %"]);
        goals.forEach((g) =>
          rows.push([g.name, g.current, g.target, Math.round((g.current / g.target) * 100) + "%"])
        );
      }
      download(
        "\uFEFF" + rows.map((r) => r.join(",")).join("\n"),
        `finbuddy-${date}.csv`,
        "text/csv;charset=utf-8"
      );
    } else {
      download(
        JSON.stringify({ exportedAt: new Date().toISOString(), expenses, goals }, null, 2),
        `finbuddy-${date}.json`,
        "application/json"
      );
    }
    setDone(key);
    setTimeout(() => setDone(null), 2000);
  };

  return (
    <div className="sidebar-export">
      <div className="sidebar-export-header">
        <span className="sidebar-export-icon">
          <LottieIcon animationData={animExport} size={24} autoplay />
        </span>
        <div>
          <div className="sidebar-export-title">Dışa Aktar</div>
          <div className="sidebar-export-sub">Harcamaları indir</div>
        </div>
      </div>
      <div className="sidebar-export-btns">
        <button
          className={`sidebar-export-btn csv ${done === "csv" ? "done" : ""}`}
          onClick={() => doExport("csv")}
          disabled={done !== null}
        >
          {done === "csv" ? "✓ İndirildi" : "CSV İndir"}
        </button>
        <button
          className={`sidebar-export-btn json ${done === "json" ? "done" : ""}`}
          onClick={() => doExport("json")}
          disabled={done !== null}
        >
          {done === "json" ? "✓ İndirildi" : "JSON İndir"}
        </button>
      </div>
    </div>
  );
};

// ── Zaman Kulesi Popup Bileşeni ──────────────────────────────────────────
const ZamanKulesi = ({ simulatedMonthOffset, setSimulatedMonthOffset }) => {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const months = [
    { label: "📍 Mayıs 2026 (Bugün)", offset: 0 },
    { label: "⏩ Haziran 2026 (+1 Ay)", offset: 1 },
  ];

  const activeLabel = months.find((m) => m.offset === simulatedMonthOffset)?.label || months[0].label;

  return (
    <div className="zaman-kulesi-wrap" ref={popupRef}>
      <button
        className={`zaman-trigger ${open ? "zaman-trigger-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Zaman Kontrolü"
      >
        <span className="zaman-trigger-icon">⏱️</span>
        <div className="zaman-trigger-texts">
          <span className="zaman-trigger-title">Zaman Kontrolü</span>
          <span className="zaman-trigger-sub">{activeLabel.replace(/^[^\s]+\s/, "")}</span>
        </div>
        <span className={`zaman-chevron ${open ? "zaman-chevron-up" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="zaman-popup">
          <div className="zaman-popup-header">
            <span>🐙</span>
            <div>
              <div className="zaman-popup-title">Zaman Makinesi</div>
              <div className="zaman-popup-sub">Simüle edilecek ayı seç</div>
            </div>
          </div>
          <div className="zaman-popup-options">
            {months.map((m) => (
              <button
                key={m.offset}
                className={`zaman-option ${simulatedMonthOffset === m.offset ? "zaman-option-active" : ""}`}
                onClick={() => {
                  setSimulatedMonthOffset(m.offset);
                  setOpen(false);
                }}
              >
                <span className="zaman-option-dot" />
                {m.label}
                {simulatedMonthOffset === m.offset && (
                  <span className="zaman-option-check">✓</span>
                )}
              </button>
            ))}
          </div>
          {simulatedMonthOffset !== 0 && (
            <div className="zaman-popup-badge">
              ⚡ Simülasyon aktif — veriler {activeLabel.split("(")[0].trim()} için gösteriliyor
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Dashboard Ana Bileşeni ───────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");
  const [expenses, setExpenses]   = useState([]);
  const [goals, setGoals]         = useState([]);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isDark, setIsDark]       = useState(true);
  const [loading, setLoading]     = useState(true);
  const [simulatedMonthOffset, setSimulatedMonthOffset] = useState(0);

  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Selam! Ben BuddyOcto 🐙 Harcamalarını buraya doğal bir şekilde yazabilirsin (örn: 'Yemeğe 180 TL verdim'). Hem kaydedeyim hem psikolojik finans analizini yapayım!",
    },
  ]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userData, setUserData] = useState(null);
  const { toasts, removeToast, success, error, warning } = useToast();

  const processBadgeData = (data) => {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (data.badges && Array.isArray(data.badges)) return data.badges.length;
    if (typeof data.badge_count === "number") return data.badge_count;
    return 0;
  };

  const fetchBadgeCount = () => {
    badgesAPI.list()
      .then((data) => setBadgeCount(processBadgeData(data)))
      .catch((err) => console.error("Rozetler yüklenemedi:", err));
  };

  // Verileri ilk açılışta yükle
  useEffect(() => {
    Promise.all([
      expensesAPI.list({ sort: "date_desc" }).catch(() => []),
      goalsAPI.list().catch(() => []),
      userAPI.get().catch(() => null),
      badgesAPI.list().catch(() => [])
    ])
      .then(([exp, gls, user, badges]) => {
        console.log("1. API'DEN GELEN TOPLAM HARCAMA SAYISI:", exp?.length);
        console.log("2. API'DEN GELEN HAM VERİ LİSTESİ:", exp);

        setExpenses(exp);
        setGoals(gls);
        setBadgeCount(processBadgeData(badges));

        if (user) {
          setUserData({ name: user.name, budget: user.budget, email: user.email });
          localStorage.setItem("buddyocto_onboarding", JSON.stringify({
            name: user.name, budget: user.budget, email: user.email,
          }));
          if (user.budget === 0 || user.budget === 0.0) setShowOnboarding(true);
        } else {
          setShowOnboarding(true);
        }
      })
      .catch((err) => {
        console.error("Veri yüklenemedi, cache kontrol ediliyor:", err);
        const cached = localStorage.getItem("buddyocto_onboarding");
        if (cached) {
          const parsed = JSON.parse(cached);
          setUserData(parsed);
          if (parsed.budget === 0 || parsed.budget === 0.0) setShowOnboarding(true);
        } else {
          setShowOnboarding(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "badges") {
      fetchBadgeCount();
    }
  }, [activeTab]);

  // Aktif/Simüle edilen aya göre filtreleme motoru
  const filteredExpenses = useMemo(() => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + simulatedMonthOffset);
    const targetMonthStr = targetDate.toISOString().slice(0, 7); // "YYYY-MM"
    return expenses.filter(e => e.date && e.date.startsWith(targetMonthStr));
  }, [expenses, simulatedMonthOffset]);

  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Zaman Makinesi Hedef Aktarım Motoru
  const simulatedGoals = useMemo(() => {
    if (!goals || goals.length === 0) return [];
    if (simulatedMonthOffset === 0) return goals;

    const monthlyLimit = userData?.budget ? parseFloat(userData.budget) : BUDGET;
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    
    const currentMonthExpensesTotal = expenses
      .filter(e => e.date && e.date.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const leftoverBudget = monthlyLimit - currentMonthExpensesTotal;
    if (leftoverBudget <= 0) return goals;

    const totalBonusAmount = leftoverBudget * simulatedMonthOffset;
    let updatedGoals = goals.map(g => ({ ...g, current: parseFloat(g.current) || 0 }));

    const highPriorityGoal = updatedGoals.find(g => g.priority === "high");
    if (highPriorityGoal) {
      highPriorityGoal.current += totalBonusAmount;
    } else if (updatedGoals.length > 0) {
      updatedGoals[0].current += totalBonusAmount;
    }

    return updatedGoals;
  }, [goals, expenses, simulatedMonthOffset, userData]);

  const handleOnboardingFinish = async (values) => {
    try {
      const targetBudget = parseInt(values.budget) || BUDGET;
      await userAPI.update({ budget: targetBudget });
      setUserData((prev) => ({ ...prev, budget: targetBudget }));
      localStorage.setItem("buddyocto_onboarding", JSON.stringify({ ...userData, budget: targetBudget }));
      setShowOnboarding(false);
      success("Onboarding başarıyla tamamlandı, bütçeniz mühürlendi! 🐙");
    } catch (err) {
      console.error("Kullanıcı güncellenemedi:", err);
      error("Bütçe kaydedilirken bir hata oluştu reis.");
    }
  };

  const handleSetExpenses = async (updater) => {
    const nextExpenses = typeof updater === "function" ? updater(expenses) : updater;
    const prevIds = new Set(expenses.map((e) => e.id));
    const newItems = nextExpenses.filter((e) => !prevIds.has(e.id));

    if (newItems.length > 0) {
      setExpenses(nextExpenses);
      const unSavedItems = newItems.filter(
        (item) => !item._saved && String(item.id).startsWith("temp-")
      );

      if (unSavedItems.length > 0) {
        try {
          const savePromises = unSavedItems.map(async (item) => {
            item._saved = true;

            let finalDate = item.date && item.date !== "Az once" ? item.date : new Date().toISOString().slice(0, 10);
            if (simulatedMonthOffset > 0) {
              const simDate = new Date();
              simDate.setMonth(simDate.getMonth() + simulatedMonthOffset);
              finalDate = simDate.toISOString().slice(0, 10);
            }

            return expensesAPI.add({
              desc:     item.desc,
              amount:   item.amount,
              category: item.category || "Diğer",
              date:     finalDate,
              mood:     item.mood  || "😊",
              color:    item.color || "#14b8a6",
              merchant: item.merchant || null,
            });
          });

          const savedResults = await Promise.all(savePromises);
          setExpenses((cur) =>
            cur.map((e) => {
              const match = savedResults.find((s) => s.desc === e.desc && s.amount === e.amount);
              return match ? { ...match, _saved: true } : e;
            })
          );

          fetchBadgeCount();
          window.dispatchEvent(new Event("badgeUpdated"));

          const budget = userData?.budget ? parseInt(userData.budget) : BUDGET;
          if (totalSpent > budget) {
            error(`⚠️ Limit aşıldı! ${(totalSpent - budget).toLocaleString("tr-TR")} TL fazla.`);
          } else if (totalSpent > budget * 0.9) {
            warning("Bütçenin %90'ına ulaştın, dikkatli ol!");
          } else {
            success(`${unSavedItems.length} kalem harcama başarıyla eklendi!`);
          }
        } catch (err) {
          console.error("Toplu harcama kaydında hata:", err);
          error("Bazı harcamalar veritabanına kaydedilemedi.");
          unSavedItems.forEach((item) => (item._saved = false));
        }
      }
    } else {
      setExpenses(nextExpenses);
    }
  };

  const handleDeleteExpense = async (id) => {
  try {
    const baseApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const token = localStorage.getItem("token"); // 🔑

    const response = await fetch(`${baseApiUrl}/api/expenses/${id}`, { 
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}` // 🛡️
      }
    });

    if (!response.ok) throw new Error("Silme yetkin yok.");
    
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    success("Harcama başarıyla silindi.");
  } catch (err) {
    console.error("Silme hatası:", err);
    error("Yetki hatası! Tekrar giriş yapmayı dene.");
  }
};

  const handleSetGoals = (updater) => {
    const nextGoals = typeof updater === "function" ? updater(goals) : updater;
    const prevIds = new Set(goals.map((g) => g.id));
    const newItems = nextGoals.filter((g) => !prevIds.has(g.id));

    if (newItems.length > 0) {
      const newGoal = newItems[0];
      if (!newGoal._saved && String(newGoal.id).startsWith("temp-")) {
        newGoal._saved = true;
        goalsAPI
          .add({
            name:     newGoal.name,
            target:   newGoal.target,
            current:  newGoal.current || 0,
            color:    newGoal.color || "#14b8a6",
            priority: newGoal.priority || "medium",
          })
          .then((saved) => {
            setGoals((cur) =>
              cur.map((g) => (g.id === newGoal.id ? { ...saved, _saved: true } : g))
            );
            success("Yeni finansal hedef başarıyla eklendi!");
          })
          .catch((err) => {
            console.error(err);
            newGoal._saved = false;
            error("Hedef kaydedilirken bir hata oluştu.");
          });
      }
    }
    setGoals(nextGoals);
  };

  const handleDeleteGoal = async (id) => {
  try {
    const baseApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    
    // 🔑 Token'ı localStorage'dan alıyoruz
    const token = localStorage.getItem("token"); 

    const response = await fetch(`${baseApiUrl}/api/goals/${id}`, { 
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        // 🛡️ İşte kritik kısım: Yetkilendirme başlığını ekliyoruz
        "Authorization": `Bearer ${token}` 
      }
    });

    if (response.status === 401) throw new Error("Oturumun süresi dolmuş, tekrar giriş yapmalısın.");
    if (!response.ok) throw new Error("Veritabanından silme işlemi başarısız.");
    
    setGoals((prev) => prev.filter((g) => g.id !== id));
    success("Hedef başarıyla kaldırıldı.");
  } catch (err) {
    console.error("Hedef silme hatası:", err);
    error(err.message || "Hedef silinirken bir sorun oluştu!");
  }
};

  const handleLogout = () => {
    localStorage.removeItem("buddyocto_user");
    localStorage.removeItem("buddyocto_onboarding");
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={{
        width: "100vw", height: "100vh", background: "#030b15",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#64ffda", fontSize: 18, gap: 12,
      }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🐙</span>
        Yükleniyor...
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onFinish={handleOnboardingFinish} />;
  }

  // ... diğer kodlar aynı kalabilir, sadece return kısmını bu şekilde güncelle:

  return (
    <div className={`db-root ${isDark ? "theme-dark" : "theme-light"}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-title">FinBuddy</span>
          <button
            className="theme-toggle"
            onClick={() => setIsDark(!isDark)}
            title={isDark ? "Açık tema" : "Koyu tema"}
          >
            <LottieIcon
              animationData={isDark ? animLight : animDark}
              size={22}
              autoplay
            />
          </button>
        </div>

        <ZamanKulesi 
          simulatedMonthOffset={simulatedMonthOffset} 
          setSimulatedMonthOffset={setSimulatedMonthOffset} 
        />

        <ProfileCard
          name={userData?.name || "Kullanıcı"}
          email={userData?.email || "kullanici@finbuddy.com"}
          monthlyTotal={totalSpent}
          monthlyBudget={userData?.budget ? parseInt(userData.budget) : BUDGET}
          badgeCount={badgeCount}
        />

        <nav className="sidebar-nav">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              className={"nav-item" + (activeTab === tab.id ? " active" : "")}
              onClick={() => setActiveTab(tab.id)}
            >
              <LottieIcon
                animationData={tab.animationData}
                size={24}
                autoplay={activeTab === tab.id}
                className="nav-lottie"
              />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Export artık hem filtrelenmiş veriyi hem de genel durumu görebilir */}
        <SidebarExport expenses={filteredExpenses} goals={simulatedGoals} />

        <button className="logout-btn" onClick={handleLogout}>
          Çıkış Yap
        </button>
      </aside>

      <div className="db-main">
        {activeTab === "chat" && (
          <ChatPanel
            expenses={expenses} // ✅ Tüm veri akıyor, asistan geçmişi de geleceği de anlar
            setExpenses={handleSetExpenses}
            goals={simulatedGoals}
            setGoals={handleSetGoals}
            messages={chatMessages}
            setMessages={setChatMessages}
            simulatedMonthOffset={simulatedMonthOffset}
            userProfile={{
              monthlyLimit: userData?.budget ? parseInt(userData.budget) : BUDGET,
              income: (userData?.budget ? parseInt(userData.budget) : BUDGET) * 2,
            }}
          />
        )}
        
        {activeTab === "expenses" && (
  <ExpensesPanel
    expenses={expenses} // ✅ TÜM veriyi gönder
    setExpenses={handleSetExpenses}
    onDeleteExpense={handleDeleteExpense}
    simulatedMonthOffset={simulatedMonthOffset}
  />
)}

        {activeTab === "goals" && (
          <GoalsPanel
            expenses={filteredExpenses} // ✅ Hedefler aylık bütçe mantığıyla çalıştığı için filtrelenmiş veri kalmalı
            budget={userData?.budget ? parseInt(userData.budget) : BUDGET}
            goals={simulatedGoals}
            setGoals={handleSetGoals}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === "insights" && (
  <InsightsPanel
    expenses={filteredExpenses} // Sadece filtrelenmiş veriyi gönder
    goals={simulatedGoals}
    isDark={isDark}
    simulatedMonthOffset={simulatedMonthOffset}
  />
)}

        {activeTab === "receipt" && (
          <ReceiptPanel setExpenses={handleSetExpenses} />
        )}

        {activeTab === "badges" && (
          <BadgesPanel />
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Dashboard;