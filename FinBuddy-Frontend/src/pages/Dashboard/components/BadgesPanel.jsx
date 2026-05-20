import React, { useState, useEffect } from "react";
import { badgesAPI } from "../../../api/client";
import LottieIcon from "./LottieIcon";

/* ── Animasyon JSON'ları lazy import ──
   Sadece kazanılan rozetler mount edildiğinde yüklenir. Kilitliler hiç yüklenmez. */
const ANIM_LOADERS = {
  MIRASYEDI:     () => import("../animations/mirasyedi.json"),
  GURME:         () => import("../animations/gurme.json"),
  SOSYETIK:      () => import("../animations/sosyetik.json"),
  CIMRI:         () => import("../animations/cimri.json"),
  TEKNOLOJIK:    () => import("../animations/teknolojik.json"),
  KUMBARACI:     () => import("../animations/kumbaraci.json"),
  KAHVEKOLIK:    () => import("../animations/kahvekolik.json"),
  SABAH_YILDIZI: () => import("../animations/sabah_yildizi.json"),
  GECE_KUSU:     () => import("../animations/gece_kusu.json"),
  FATURAMATIK:   () => import("../animations/faturamatik.json"),
  MAAS_GUNU:     () => import("../animations/maas_gunu.json"),
  ISTIKRARLI:    () => import("../animations/istikrarli.json"),
  REKORTMEN:     () => import("../animations/rekortmen.json"),
};

/* ─── Design Token CSS ─────────────────────────────────────────── */
const GLOBAL_STYLES = `
  :root,
  [data-theme="light"] {
    --fb-bg-page:          #f0f4f8;
    --fb-bg-card:          #ffffff;
    --fb-bg-earned:        #edfaf7;
    --fb-bg-locked:        #f8fafc;
    --fb-border:           #e2e8f0;
    --fb-border-earned:    #14b8a6;
    --fb-border-locked:    #dde3ec;
    --fb-text-primary:     #0f172a;
    --fb-text-secondary:   #475569;
    --fb-text-muted:       #94a3b8;
    --fb-text-earned:      #0d9488;
    --fb-text-danger:      #e11d48;
    --fb-accent:           #14b8a6;
    --fb-accent-bg:        #f0fdfa;
    --fb-progress-track:   #e2e8f0;
    --fb-progress-a:       #14b8a6;
    --fb-progress-b:       #06b6d4;
    --fb-shadow-card:      0 1px 3px rgba(15,23,42,0.07);
    --fb-shadow-earned:    0 4px 16px rgba(20,184,166,0.13);
    --fb-shadow-hover:     0 8px 24px rgba(20,184,166,0.2);
    --fb-divider:          #e9edf3;
    --fb-pill-bg:          #14b8a6;
    --fb-pill-text:        #ffffff;
    --fb-locked-filter:    grayscale(0.65) brightness(0.97);
    --fb-locked-opacity:   0.65;
    --fb-sticky-bg:        rgba(240,244,248,0.92);
    --fb-scroll-thumb:     #cbd5e1;
    --fb-scroll-track:     transparent;
  }

  [data-theme="dark"] {
    --fb-bg-page:          #0d1117;
    --fb-bg-card:          #161b22;
    --fb-bg-earned:        #0d2d2a;
    --fb-bg-locked:        #161b22;
    --fb-border:           #2d3748;
    --fb-border-earned:    #2dd4bf;
    --fb-border-locked:    #252d3b;
    --fb-text-primary:     #e2e8f0;
    --fb-text-secondary:   #94a3b8;
    --fb-text-muted:       #4a5568;
    --fb-text-earned:      #2dd4bf;
    --fb-text-danger:      #f87171;
    --fb-accent:           #2dd4bf;
    --fb-accent-bg:        #0d2d2a;
    --fb-progress-track:   #2d3748;
    --fb-progress-a:       #2dd4bf;
    --fb-progress-b:       #38bdf8;
    --fb-shadow-card:      0 1px 4px rgba(0,0,0,0.4);
    --fb-shadow-earned:    0 4px 20px rgba(45,212,191,0.15);
    --fb-shadow-hover:     0 8px 28px rgba(45,212,191,0.22);
    --fb-divider:          #1e2a3a;
    --fb-pill-bg:          #2dd4bf;
    --fb-pill-text:        #0d1117;
    --fb-locked-filter:    grayscale(0.7) brightness(0.55);
    --fb-locked-opacity:   0.48;
    --fb-sticky-bg:        rgba(13,17,23,0.92);
    --fb-scroll-thumb:     #2d3748;
    --fb-scroll-track:     transparent;
  }

  /* ── Layout: panel = flex column, tam ekran yüksekliği ── */
  .fb-panel {
    display: flex;
    flex-direction: column;
    height: 100vh;               /* Ebeveyn container'ı tam yükseklikte tutuyorsa */
    max-height: 100vh;
    background: var(--fb-bg-page);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: background 0.25s;
    overflow: hidden;            /* Dış scroll yok */
  }

  /* ── Sticky üst alan: başlık + stat kartları ── */
  .fb-sticky-top {
    flex-shrink: 0;              /* Asla küçülmez */
    padding: 24px 24px 0;
    background: var(--fb-sticky-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--fb-divider);
    transition: background 0.25s, border-color 0.25s;
    z-index: 10;
  }

  /* ── Başlık ── */
  .fb-header { margin-bottom: 20px; }
  .fb-header h2 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    color: var(--fb-text-primary);
    margin: 0 0 4px;
    transition: color 0.25s;
  }
  .fb-header p {
    font-size: 13px;
    color: var(--fb-text-secondary);
    margin: 0;
    transition: color 0.25s;
  }

  /* ── Stat kartları ── */
  .fb-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    padding-bottom: 20px;
  }
  .fb-stat-card {
    background: var(--fb-bg-card);
    border: 1px solid var(--fb-border);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: var(--fb-shadow-card);
    transition: background 0.25s, border-color 0.25s;
  }
  .fb-stat-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--fb-text-muted);
    margin-bottom: 8px;
    transition: color 0.25s;
  }
  .fb-stat-value {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -1px;
    color: var(--fb-accent);
    transition: color 0.25s;
  }
  .fb-stat-sub {
    font-size: 11px;
    color: var(--fb-text-muted);
    margin-top: 3px;
    transition: color 0.25s;
  }
  .fb-progress-track {
    width: 100%;
    height: 6px;
    background: var(--fb-progress-track);
    border-radius: 99px;
    overflow: hidden;
    margin: 8px 0 5px;
    transition: background 0.25s;
  }
  .fb-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--fb-progress-a), var(--fb-progress-b));
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.25s;
  }
  .fb-title-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--fb-accent-bg);
    border: 1px solid var(--fb-accent);
    border-radius: 99px;
    padding: 4px 12px 4px 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--fb-accent);
    margin-top: 6px;
    transition: background 0.25s, border-color 0.25s, color 0.25s;
  }
  .fb-health-ok  { color: var(--fb-text-earned) !important; }
  .fb-health-bad { color: var(--fb-text-danger) !important; }
  .fb-health-num {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1.5px;
    transition: color 0.25s;
  }

  /* ── Rozet scroll alanı ── */
  .fb-badges-scroll {
    flex: 1;                     /* Kalan tüm yüksekliği kaplar */
    overflow-y: auto;
    padding: 20px 24px 32px;
    scroll-behavior: smooth;
  }

  /* Scrollbar stili */
  .fb-badges-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .fb-badges-scroll::-webkit-scrollbar-track {
    background: var(--fb-scroll-track);
  }
  .fb-badges-scroll::-webkit-scrollbar-thumb {
    background: var(--fb-scroll-thumb);
    border-radius: 99px;
  }
  .fb-badges-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--fb-accent);
  }

  /* Scroll section başlığı */
  .fb-scroll-heading {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--fb-text-muted);
    margin: 0 0 16px;
    transition: color 0.25s;
  }

  /* ── Rozet grid ── */
  .fb-badges-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }

  /* ── Rozet kart ── */
  .fb-badge-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    border-radius: 16px;
    padding: 20px 16px 16px;
    transition:
      background 0.25s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease,
      transform 0.2s ease,
      opacity 0.25s ease,
      filter 0.25s ease;
  }
  .fb-badge-card.earned {
    background: var(--fb-bg-earned);
    border: 1.5px solid var(--fb-border-earned);
    box-shadow: var(--fb-shadow-earned);
    opacity: 1;
    filter: none;
  }
  .fb-badge-card.earned:hover {
    transform: translateY(-3px);
    box-shadow: var(--fb-shadow-hover);
  }
  .fb-badge-card.locked {
    background: var(--fb-bg-locked);
    border: 1px solid var(--fb-border-locked);
    box-shadow: none;
    opacity: var(--fb-locked-opacity);
    filter: var(--fb-locked-filter);
  }

  .fb-badge-anim {
    width: 58px;
    height: 58px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 12px;
  }
  .fb-badge-name {
    font-size: 13.5px;
    font-weight: 700;
    margin: 0 0 5px;
    line-height: 1.2;
    color: var(--fb-text-primary);
    transition: color 0.25s;
  }
  .fb-badge-card.earned .fb-badge-name { color: var(--fb-text-earned); }
  .fb-badge-desc {
    font-size: 11px;
    line-height: 1.5;
    color: var(--fb-text-secondary);
    margin: 0;
    transition: color 0.25s;
  }

  /* KAZANILDI etiketi */
  .fb-earned-label {
    position: absolute;
    top: 9px;
    right: 9px;
    background: var(--fb-pill-bg);
    color: var(--fb-pill-text);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 5px;
    transition: background 0.25s, color 0.25s;
  }

  /* Yükleniyor */
  .fb-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 40px 24px;
    color: var(--fb-accent);
    font-weight: 600;
    font-size: 15px;
  }
  .fb-loading-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--fb-accent);
    animation: fb-pulse 1.2s ease-in-out infinite;
  }
  .fb-loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .fb-loading-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes fb-pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50%       { opacity: 1;   transform: scale(1.1); }
  }
`;

const ALL_SYSTEM_BADGES = [
  { code: "MIRASYEDI",     name: "MirasYedi",      icon: "💸", description: "Aylık bütçe sınırını aşarak parayı adeta havaya saçtın!" },
  { code: "GURME",         name: "Gurme",           icon: "🍽️", description: "Dışarıda yemek yeme rekoru kırdın, ev yemeği unutuldu." },
  { code: "SOSYETIK",      name: "Sosyetik",        icon: "💎", description: "Tek kalemde devasa bir harcama patlattın, elitizm kokuyor!" },
  { code: "CIMRI",         name: "Cimri",           icon: "🪙", description: "Bütçenin %30'undan azını harcadın. Varyemez amca seni!" },
  { code: "TEKNOLOJIK",    name: "Tekno-Bağımlı",  icon: "💻", description: "Teknoloji dünyasına yatırım yaptın, devir dijital devir." },
  { code: "KUMBARACI",     name: "Kumbara Üstadı", icon: "🏦", description: "Geleceğe yatırım! En az 2 farklı birikim hedefi oluşturdun." },
  { code: "KAHVEKOLIK",    name: "Kahvekolik",      icon: "☕", description: "Damarlarında kan yerine kafein akıyor, kahve harcamaların tavan yaptı." },
  { code: "SABAH_YILDIZI", name: "Sabah Yıldızı",  icon: "🌅", description: "Güne erken başlayanlar! Sabah 06:00-09:00 arası harcama yaptın." },
  { code: "GECE_KUSU",     name: "Gece Kuşu",       icon: "🦉", description: "Gece hayatı ya da uykusuz alışverişler! 23:00-04:00 arası harcama yaptın." },
  { code: "FATURAMATIK",   name: "Faturamatik",     icon: "🧾", description: "Düzenli vatandaş! Fatura kategorisinde en az 3 harcama kaydettin." },
  { code: "MAAS_GUNU",     name: "Maaş Günü",       icon: "💰", description: "Hesaba taze kan geldi! Bütçeni tek seferde 15.000 TL ve üzerine çıkardın." },
  { code: "ISTIKRARLI",    name: "İstikrarlı",      icon: "📊", description: "FinBuddy'yi evlat edindin! Toplamda 15 harcama sınırını devirdin." },
  { code: "REKORTMEN",     name: "Rekortmen",        icon: "🏆", description: "Cüzdanda büyük bir gedik açıldı! Tek seferde 5000 TL ve üzeri harcama yaptın." },
];

/* ── Lazy Lottie: sadece kazanılan rozet yüklenince JSON çekilir ── */
function useLottieAnim(code) {
  const [animData, setAnimData] = useState(null);
  useEffect(() => {
    ANIM_LOADERS[code]?.().then((mod) => setAnimData(mod.default ?? mod));
  }, [code]);
  return animData;
}

function EarnedBadgeAnim({ code, size = 54 }) {
  const animData = useLottieAnim(code);
  if (!animData) return <span style={{ fontSize: 32, lineHeight: 1 }}>⏳</span>;
  return <LottieIcon animationData={animData} size={size} autoplay={true} />;
}

/* ── Tema algılama: data-theme attribute'u + sistem tercihi ── */
function useTheme() {
  const getTheme = () => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const [theme, setTheme] = useState(getTheme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => setTheme(getTheme());
    mq.addEventListener("change", onMq);
    return () => { obs.disconnect(); mq.removeEventListener("change", onMq); };
  }, []);
  return theme;
}

/* ═══════════════════════════════════════════════════════════════
   BadgesPanel
   Layout:
     ┌─────────────────────────────────┐
     │  fb-sticky-top (position fixed  │  ← Başlık + Stat kartları
     │  flex-shrink: 0)                │
     ├─────────────────────────────────┤
     │  fb-badges-scroll (flex: 1,     │  ← Rozet grid — sadece bu scroll eder
     │  overflow-y: auto)              │
     └─────────────────────────────────┘
═══════════════════════════════════════════════════════════════ */
const BadgesPanel = () => {
  const [userBadges, setUserBadges] = useState([]);
  const [stats, setStats]   = useState({ xp: 0, level: 1, health_score: 100, title: "" });
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    badgesAPI.list()
      .then((data) => {
        if (!data) return;
        if (data.stats) setStats(data.stats);
        if      (Array.isArray(data.badges))      setUserBadges(data.badges);
        else if (Array.isArray(data))              setUserBadges(data);
        else if (Array.isArray(data.user_badges))  setUserBadges(data.user_badges);
      })
      .catch((err) => console.error("Oyunlaştırma verileri yüklenirken hata:", err))
      .finally(() => setLoading(false));
  }, []);

  const isEarned   = (code) => userBadges.some((b) => b === code || (b?.code === code));
  const xpCap      = (stats?.level || 1) * 300;
  const xpProgress = Math.min(100, ((stats?.xp || 0) / xpCap) * 100);
  const healthOk   = (stats?.health_score ?? 100) > 70;

  if (loading) {
    return (
      <div data-theme={theme}>
        <style>{GLOBAL_STYLES}</style>
        <div className="fb-panel" style={{ justifyContent: "center" }}>
          <div className="fb-loading">
            <div className="fb-loading-dot" />
            <div className="fb-loading-dot" />
            <div className="fb-loading-dot" />
            Finansal rütbeler hesaplanıyor…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <style>{GLOBAL_STYLES}</style>

      <div className="fb-panel">

        {/* ══ STİCKY ÜST ALAN ══ */}
        <div className="fb-sticky-top">

          <div className="fb-header">
            <h2>Başarılar & Oyunlaştırma Odası 🏆</h2>
            <p>BuddyOcto harcamalarını analiz etti. İşte senin finansal rütben ve başarıların!</p>
          </div>

          <div className="fb-stats-grid">

            {/* Seviye & XP */}
            <div className="fb-stat-card">
              <div className="fb-stat-label">Mali Seviye</div>
              <div className="fb-stat-value">LVL {stats?.level || 1}</div>
              <div className="fb-progress-track">
                <div className="fb-progress-fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <div className="fb-stat-sub">{stats?.xp || 0} XP / {xpCap} XP</div>
            </div>

            {/* Profil Unvanı */}
            <div className="fb-stat-card">
              <div className="fb-stat-label">FinBuddy Profil Unvanı</div>
              <div className="fb-title-pill">
                🌱 {stats?.title || "Gizemli Tasarrufçu"}
              </div>
            </div>

            {/* Mali Sağlık Skoru */}
            <div className="fb-stat-card" style={{ display: "flex", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div className="fb-stat-label">Mali Sağlık Skoru</div>
                <div
                  className={`fb-stat-sub ${healthOk ? "fb-health-ok" : "fb-health-bad"}`}
                  style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}
                >
                  {healthOk ? "Durumun gayet istikrarlı!" : "Harcamalara dikkat etmelisin!"}
                </div>
              </div>
              <div className={`fb-health-num ${healthOk ? "fb-health-ok" : "fb-health-bad"}`}>
                {stats?.health_score ?? 100}
              </div>
            </div>

          </div>
        </div>

        {/* ══ SCROLL ALAN: ROZET GRİD ══ */}
        <div className="fb-badges-scroll">
          <p className="fb-scroll-heading">
            {userBadges.length} / {ALL_SYSTEM_BADGES.length} Rozet Kazanıldı
          </p>

          <div className="fb-badges-grid">
            {ALL_SYSTEM_BADGES.map((badge) => {
              const earned = isEarned(badge.code);
              return (
                <div key={badge.code} className={`fb-badge-card ${earned ? "earned" : "locked"}`}>
                  {earned && <span className="fb-earned-label">Kazanıldı</span>}

                  <div className="fb-badge-anim">
                    {earned
                      ? <EarnedBadgeAnim code={badge.code} size={54} />
                      : <span style={{ fontSize: 38, lineHeight: 1 }}>{badge.icon}</span>
                    }
                  </div>

                  <h4 className="fb-badge-name">{badge.name}</h4>
                  <p className="fb-badge-desc">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BadgesPanel;