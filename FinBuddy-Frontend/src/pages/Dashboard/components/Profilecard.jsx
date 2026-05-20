import React, { useState, useEffect } from "react";
import "./ProfileCard.css";
import defaultLogo from "../../../assets/logo.webp";
import { badgesAPI } from "../../../api/client";

const ProfileCard = ({
  name = "Kullanıcı",
  email = "kullanici@email.com",
  avatarUrl = null,
  monthlyTotal = 0,
  monthlyBudget = 0,
  badgeCount = 0, 
  currency = "₺",
  // ⏱️ Dashboard'dan gelen aktif zaman offset değeri
  simulatedMonthOffset = 0,
}) => {
  const [liveBadgeCount, setLiveBadgeCount] = useState(badgeCount);

  const extractCount = (data) => {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (data.badges && Array.isArray(data.badges)) return data.badges.length;
    if (typeof data.badge_count === "number") return data.badge_count;
    return 0;
  };

  const refreshBadges = () => {
    badgesAPI.list()
      .then((data) => {
        setLiveBadgeCount(extractCount(data));
      })
      .catch((err) => console.error("Sol panel senkronizasyon hatası:", err));
  };

  useEffect(() => {
    setLiveBadgeCount(badgeCount);
  }, [badgeCount]);

  useEffect(() => {
    refreshBadges();

    window.addEventListener("badgeUpdated", refreshBadges);
    return () => {
      window.removeEventListener("badgeUpdated", refreshBadges);
    };
  }, []);

  // Barın taşmaması için doluluk yüzdesini maximum 100 ile sınırlıyoruz
  const barPercent =
    monthlyBudget > 0
      ? Math.min(100, Math.round((monthlyTotal / monthlyBudget) * 100))
      : 0;

  // Gerçek harcama yüzdesi (Örn: %120 aşıldı metni için tam değer)
  const realUsagePercent =
    monthlyBudget > 0 ? Math.round((monthlyTotal / monthlyBudget) * 100) : 0;

  const statusColor =
    realUsagePercent > 90 ? "#f87171" : realUsagePercent > 70 ? "#fb923c" : "#4ade80";

  return (
    <div className={`profile-card ${simulatedMonthOffset > 0 ? "pc-simulated-mode" : ""}`}>
      
      {/* ⏱️ Zaman Makinesi Aktifse Kartın Üstünde Parlayan Rozet */}
      {simulatedMonthOffset > 0 && (
        <div className="pc-simulation-badge">
          <span className="pc-pulse-dot" />
          {simulatedMonthOffset} Ay Sonrası Simüle Ediliyor
        </div>
      )}

      <div className="pc-avatar-wrapper">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="pc-avatar-img" />
        ) : (
          <img
            src={defaultLogo}
            alt="BuddyOcto"
            className="pc-avatar-img pc-avatar-logo"
          />
        )}
        <div className="pc-status-dot" style={{ background: statusColor }} />
      </div>

      <div className="pc-info">
        <h3 className="pc-name">{name}</h3>
        <p className="pc-email">{email}</p>
        
        {/* 🏆 Birleşik Rozet Etiketi */}
        <div className="pc-badge-tag" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(250, 204, 21, 0.1)",
          color: "#facc15",
          fontSize: "11px",
          fontWeight: "600",
          padding: "3px 8px",
          borderRadius: "20px",
          marginTop: "6px",
          border: "1px solid rgba(250, 204, 21, 0.2)"
        }}>
          🏆 {liveBadgeCount} Rozet
        </div>
      </div>

      <div className="pc-divider" />

      <div className="pc-summary">
        <div className="pc-summary-row">
          <span className="pc-label">
            {simulatedMonthOffset > 0 ? "Simüle Edilen Harcama" : "Bu ay harcandı"}
          </span>
          <span className="pc-value" style={{ color: statusColor }}>
            {currency}{monthlyTotal.toLocaleString("tr-TR")}
          </span>
        </div>
        
        {monthlyBudget > 0 && (
          <>
            <div className="pc-summary-row">
              <span className="pc-label">Bütçe</span>
              <span className="pc-value">
                {currency}{monthlyBudget.toLocaleString("tr-TR")}
              </span>
            </div>
            
            <div className="pc-bar-bg">
              <div
                className="pc-bar-fill"
                style={{ width: `${barPercent}%`, background: statusColor }}
              />
            </div>
            
            <p className="pc-bar-label">
              Bütçenin %{realUsagePercent}'i {realUsagePercent > 100 ? "aşıldı!" : "kullanıldı"}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;