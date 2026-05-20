import React, { useState } from "react";
import "./GoalsPanel.css";
import LottieIcon from "./LottieIcon"; 
import animOctopus from "../animations/octopus1.json";
import animTarget  from "../animations/target.json";

const COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"];

const PRIORITIES = [
  { value: "low", label: "🟢 Düşük", weight: 1 },
  { value: "medium", label: "🟡 Orta", weight: 2 },
  { value: "high", label: "🔴 Yüksek", weight: 3 }
];

const GoalsPanel = ({ 
  goals = [], 
  setGoals, 
  onDeleteGoal,
  // 🎯 ZAMAN MAKİNESİ ENTEGRASYONU İÇİN PARAMETRELER
  simulatedMonthOffset = 0,
  monthlySavingsEstimation = 0 // InsightsPanel veya cüzdandan gelen aylık tahmini tasarruf miktarı
}) => {
  const [name, setName]       = useState("");
  const [target, setTarget]   = useState("");
  const [current, setCurrent] = useState("");
  const [color, setColor]     = useState("#14b8a6");
  const [priority, setPriority] = useState("medium");
  const [submitted, setSubmitted] = useState(false);

  // Input doğrulama ve temizleme yardımı
  const cleanNum = (val) => {
    const num = parseFloat(val);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const currentVal = cleanNum(current);
  const targetVal = cleanNum(target);

  const progress = targetVal > 0
    ? Math.min(100, Math.round((currentVal / targetVal) * 100))
    : 0;

  // ── GÜVENLİ EKLEME FONKSİYONU ──
  const handleAdd = () => {
    const finalName = name.trim();
    const finalTarget = cleanNum(target);
    const finalCurrent = cleanNum(current);

    if (!finalName || finalTarget <= 0) return;

    const goalData = {
      id: "temp-" + Date.now(), 
      name: finalName,
      current: finalCurrent, // Kullanıcının başlattığı ana bakiye
      target: finalTarget,
      color: color,
      priority: priority, 
      animationData: animTarget,
      insight: null,
      _saved: false 
    };

    setGoals((prev) => [...prev, goalData]);

    // Formu sıfırla
    setName("");
    setTarget("");
    setCurrent("");
    setPriority("medium");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  // Öncelik ağırlıklarına göre yüksekten düşüğe akıllı sıralama
  const sortedGoals = [...goals].sort((a, b) => {
    const weightA = PRIORITIES.find(p => p.value === (a.priority || "medium"))?.weight || 2;
    const weightB = PRIORITIES.find(p => p.value === (b.priority || "medium"))?.weight || 2;
    return weightB - weightA; 
  });

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <div>
          <h2>Hedefler {simulatedMonthOffset > 0 && "⏱️"}</h2>
          <p>
            {simulatedMonthOffset > 0 
              ? `Simülasyon Modu: +${simulatedMonthOffset} Ay Sonraki Hedef Durumları` 
              : "Finansal hedeflerini önceliklerine göre takip et"}
          </p>
        </div>
      </div>

      {/* ── Hedef Ekleme Formu ── */}
      <div className="goal-card">
        <div className="goal-header">
          <LottieIcon animationData={animTarget} size={38} />
          <div>
            <div className="goal-name">Yeni Hedef Ekle</div>
            <div className="goal-sub">Kendi hedefini tanımla, önceliğini belirle</div>
          </div>
        </div>

        <input
          className="goal-input"
          placeholder="Hedef adı (örn: Tatil fonu)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="goal-input-row">
          <input
            className="goal-input"
            type="number"
            min="0"
            placeholder="Hedef tutar (TL)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <input
            className="goal-input"
            type="number"
            min="0"
            placeholder="Mevcut Başlangıç (TL)"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>

        {/* Öncelik Seçimi */}
        <div className="priority-section" style={{ marginTop: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, opacity: 0.8, display: "block", marginBottom: 6 }}>Öncelik Derecesi:</span>
          <div style={{ display: "flex", gap: 8 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`filter-pill ${priority === p.value ? "active" : ""}`}
                onClick={() => setPriority(p.value)}
                style={{ padding: "6px 16px", fontSize: 13 }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Renk seçici */}
        <div className="goal-color-row">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`goal-color-dot ${color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* Canlı progress bar önizlemesi */}
        {(name || target) && (
          <>
            <div className="goal-bar" style={{ marginTop: 12 }}>
              <div
                className="goal-fill"
                style={{ width: `${progress}%`, background: color }}
              />
            </div>
            <div className="goal-insight" style={{ marginBottom: 0 }}>
              <span className="goal-octo-wrap">
                <LottieIcon animationData={animOctopus} size={22} />
              </span>
              Önizleme —{" "}
              <strong>
                {name || "hedef"}{target ? ` · %${progress}` : ""} · {PRIORITIES.find(p => p.value === priority)?.label}
              </strong>
            </div>
          </>
        )}

        <button
          className={`goal-add-btn ${submitted ? "success" : ""}`}
          onClick={handleAdd}
          disabled={!name.trim() || !target || cleanNum(target) <= 0}
        >
          {submitted ? "✓ Hedef Eklendi!" : "+ Hedef Ekle"}
        </button>
      </div>

      {/* ── Hedef Listesi ── */}
      {sortedGoals.map((g) => {
        // 🎯 SİMÜLASYON HESAP MOTORU: 
        // Zaman makinesi ilerledikçe her hedefe aylık birikim tahminini ekliyoruz.
        // Eğer birden fazla hedef varsa, birikimi önceliğe göre dağıtmak daha akıllıca olurdu fakat simülasyonu 
        // basit ve net göstermek adına her hedefe yansıyan simüle katkıyı hesaplıyoruz.
        const simulatedContribution = simulatedMonthOffset * monthlySavingsEstimation;
        const dynamicCurrent = Math.min(g.target, g.current + simulatedContribution);

        const pct = Math.min(Math.round((dynamicCurrent / g.target) * 100), 100);
        const isComplete = pct >= 100;
        const currentPriority = PRIORITIES.find(p => p.value === g.priority)?.label || "🟡 Orta";

        return (
          <div
            className={`goal-card ${isComplete ? "goal-card--complete" : ""} ${simulatedMonthOffset > 0 ? "goal-card--simulated" : ""}`}
            key={g.id}
          >
            <div className="goal-header">
              <LottieIcon animationData={g.animationData || animTarget} size={38} />
              <div style={{ flex: 1, marginLeft: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="goal-name">{g.name}</span>
                  <span style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>
                    {currentPriority}
                  </span>
                </div>
                <div className="goal-sub">
                  {dynamicCurrent.toLocaleString("tr-TR")} / {g.target.toLocaleString("tr-TR")} TL
                  {simulatedMonthOffset > 0 && simulatedContribution > 0 && (
                    <span style={{ color: "#6ee7b7", marginLeft: 6, fontSize: 11 }}>
                      (+{simulatedContribution.toLocaleString("tr-TR")} TL ⏱️)
                    </span>
                  )}
                </div>
              </div>
              <div className="goal-pct">{pct}%</div>
              
              <button
  className="expense-delete"
  style={{ 
    position: "static", 
    marginLeft: 12, 
    padding: "4px 8px", 
    background: "rgba(239, 68, 68, 0.1)", 
    color: "#ef4444",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer"
  }}
  onClick={(e) => {
    e.stopPropagation(); // Kartın diğer özelliklerini tetiklemesin
    if (window.confirm(`"${g.name}" hedefini silmek istediğine emin misin?`)) {
      onDeleteGoal(g.id);
    }
  }}
  title="Hedefi Sil"
>
  ✕ Sil
</button>
            </div>

            <div className="goal-bar">
              <div
                className={`goal-fill ${isComplete ? "goal-fill--complete" : ""}`}
                style={{ width: `${pct}%`, background: g.color }}
              />
            </div>

            {isComplete ? (
              <div className="goal-complete-badge">
                🎉 {simulatedMonthOffset > 0 ? "Simülasyona göre bu tarihte hedefe ulaşıyorsun!" : "Hedefe ulaştın, tebrikler!"}
              </div>
            ) : (
              simulatedMonthOffset > 0 && monthlySavingsEstimation > 0 && (
                <div className="goal-simulation-info" style={{ fontSize: 11.5, color: "#8892a4", marginTop: 6, fontStyle: "italic" }}>
                  💡 Aylık ortalama ₺{monthlySavingsEstimation.toLocaleString("tr-TR")} tasarrufunla bu hedefe ulaşmana yaklaşık {Math.ceil((g.target - g.current) / monthlySavingsEstimation)} ay kaldı.
                </div>
              )
            )}

            {g.insight && !isComplete && (
              <div className="goal-insight">
                <span className="goal-octo-wrap">
                  <LottieIcon animationData={animOctopus} size={22} />
                </span>{" "}
                {g.insight}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GoalsPanel;