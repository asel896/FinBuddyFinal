import React, { useMemo, useState, useEffect } from "react";
import "./InsightsPanel.css";
import LottieIcon         from "./LottieIcon";
import MonthlyExpensesChart from "./MonthlyExpensesChart";
import CategoryPieChart     from "./CategoryPieChart";

import animAngry from "../animations/angry.json";
import animSmile from "../animations/smile.json";
import animMoney from "../animations/money.json";
import animStats from "../animations/stats.json";
import animOctopus from "../animations/octopus1.json"; // Yapay zeka yüklenirken dönecek Lottie

// API client'ı içeri alıyoruz
import { chatAPI } from "../../../api/client";

// 🎯 SABİT BÜTÇEYİ SİLİYORUZ: Artık bileşene gelen dinamik bütçe propunu kullanacağız.

function buildInsights(expenses, simulatedMonthOffset = 0) {
  if (!expenses || expenses.length === 0) return null;

  // Hedef zamanı belirle
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + simulatedMonthOffset, 1);

  // Sadece hedeflenen aydaki harcamaları filtrele
  const filtered = expenses.filter(e => {
    const eDate = e.date ? new Date(e.date) : new Date();
    return eDate.getMonth() === targetDate.getMonth() && eDate.getFullYear() === targetDate.getFullYear();
  });

  if (filtered.length === 0) return null;

  const byMood = {};
  filtered.forEach((e) => {
    const mood = e.mood || "😐";
    if (!byMood[mood]) byMood[mood] = { total: 0, count: 0 };
    byMood[mood].total += parseFloat(e.amount) || 0;
    byMood[mood].count += 1;
  });

  const moodAvg = (mood) => byMood[mood] ? byMood[mood].total / byMood[mood].count : 0;
  const stressAvg = moodAvg("😤");
  const happyAvg = moodAvg("😊");
  const overallAvg = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0) / filtered.length;

  const stressDiff = stressAvg && overallAvg ? Math.round(((stressAvg - overallAvg) / overallAvg) * 100) : null;
  const happyDiff = happyAvg && overallAvg ? Math.round(overallAvg - happyAvg) : null;

  const byCat = {};
  filtered.forEach((e) => {
    const cat = e.category || "Diğer";
    byCat[cat] = (byCat[cat] || 0) + (parseFloat(e.amount) || 0);
  });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const total = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const projection = Math.round((total / filtered.length) * 30) || 0;

  return { stressDiff, happyDiff, topCat, total, projection, count: filtered.length };
}

const InsightsPanel = ({ 
  expenses = [], 
  goals = [], 
  isDark = true,
  // 🎯 DİNAMİK PARAMETRELER ENTEGRASYONU
  monthlyBudget = 5000, // Onboarding'den gelen dinamik limit düşmesin diye fallback verdik
  simulatedMonthOffset = 0 // Zaman Makinesi takibi için
}) => {
  const ins = useMemo(() => buildInsights(expenses), [expenses]);
  const hasData = expenses.length > 0;

  // 🧠 ── Yapay Zeka Rapor State Yönetimi ──
  const [aiReport, setAiReport] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // 🛡️ Sonsuz döngüyü kıran emniyet kilidi

  // 🎯 Tetikleyici Analiz Fonksiyonu
  const fetchAIAnalysis = async () => {
    if (!hasData || loadingAi) return;
    setLoadingAi(true);
    try {
      // API'ye zaman makinesi bilgisini de veriyoruz ki LLM ona göre gelecek yorumu yapsın
      const data = await chatAPI.getFinancialAnalysis({ expenses, goals, simulatedMonthOffset });
      if (data && data.report) {
        setAiReport(data.report);
        setHasFetched(true); // İstek başarılı, kilidi kapat
      }
    } catch (err) {
      console.error("Rapor çekilemedi:", err);
      setAiReport("BuddyOcto derin sulardan raporu çekerken akıntıya kapıldı ! Kota sınırına takılmış veya bağlantıyı kaçırmış olabiliriz. 🐙🌊");
    } finally {
      styleLockFix(); // 🚨 Görsel dikey akış senkronizasyonu
      setLoadingAi(false);
    }
  };

  // DOM elementlerinin yüksekliklerini tarayıcıya zorla hesaplatma dopingi
  const styleLockFix = () => {
    setTimeout(() => {
      const card = document.querySelector('.ai-card');
      if (card) {
        card.style.height = 'auto';
        card.style.display = 'none';
        card.offsetHeight; // Reflow tetikle
        card.style.display = 'flex';
      }
    }, 50);
  };

  // 🔄 🎯 Zaman makinesi offset değeri değiştiğinde kilidi açıp yeni aya göre raporu tekrar tetikliyoruz!
  useEffect(() => {
    setHasFetched(false);
    setAiReport(""); // Eski raporu silip temiz görünüm sunuyoruz
  }, [simulatedMonthOffset]);

  useEffect(() => {
    if (hasData && !hasFetched && !loadingAi && !aiReport) {
      fetchAIAnalysis();
    }
  }, [expenses.length, goals.length, hasData, hasFetched, simulatedMonthOffset]);

  // Kart yapılandırmaları...
  let stressVal = "%0";
  let stressDesc = "Harcamalarınız stabil görünüyor.";
  if (hasData && ins?.stressDiff !== null) {
    if (ins.stressDiff > 0) {
      stressVal = `+%${ins.stressDiff}`;
      stressDesc = "Stresliyken normal günlere kıyasla daha fazla harcıyorsun. Alışveriş yapmadan önce derin bir nefes al!";
    } else if (ins.stressDiff < 0) {
      stressVal = `-%${Math.abs(ins.stressDiff)}`;
      stressDesc = "Harika! Stres anlarında kendini alışveriş çılgınlığına kaptırmıyorsun.";
    }
  } else {
    stressDesc = "Stresli (😤) ruh haliyle harcama girildiğinde analiz tetiklenecek.";
  }

  let happyVal = "0 TL";
  let happyDesc = "Duyguların harcamalarını etkilemiyor.";
  if (hasData && ins?.happyDiff !== null) {
    if (ins.happyDiff > 0) {
      happyVal = `${ins.happyDiff} TL`;
      happyDesc = `Mutlu olduğunda, diğer günlere göre harcama başına ortalama ${ins.happyDiff} TL daha bilinçli davranıyorsun!`;
    } else {
      happyVal = `+${Math.abs(ins.happyDiff)} TL`;
      happyDesc = "Mutluluğunu sevdiklerinle kutlarken harcama limitlerini biraz esnetiyorsun sanki?";
    }
  } else {
    happyDesc = "Mutlu (😊) ruh haliyle harcama girildiğinde tasarruf oranını hesaplayacağım.";
  }

  const topCatName = hasData && ins?.topCat ? ins.topCat[0] : "—";
  const topCatVal  = hasData && ins?.topCat ? `${ins.topCat[1].toLocaleString("tr-TR")} TL` : "0 TL";

  const total      = ins?.total ?? 0;
  const projection = ins?.projection ?? 0;
  // 🎯 Statik BUDGET yerine prop'tan gelen dynamic monthlyBudget kullanıldı
  const projOver   = Math.max(projection - monthlyBudget, 0);

  return (
    <div className={`panel ${!isDark ? "theme-light" : ""} ${simulatedMonthOffset > 0 ? "panel-simulation-active" : ""}`}>

      <div className="panel-header">
        <div>
          <h2>Psikolojik Finans Analizi {simulatedMonthOffset > 0 && "⏱️"}</h2>
          <p>
            {simulatedMonthOffset > 0 
              ? `Gelecek Simülasyonu: +${simulatedMonthOffset} Ay Sonraki Davranışsal Öngörüler`
              : "Duygularınla harcamaların arasındaki finansal korelasyon"}
          </p>
        </div>
      </div>

      {/* 🎯 Yapay Zeka Alanı */}
      {hasData && (
        <div className="ai-card">
          <div className="ai-card-header">
            <div className="ai-card-title">
              <LottieIcon animationData={animOctopus} size={40} autoplay={loadingAi} />
              <span>BuddyOcto {simulatedMonthOffset > 0 ? "Gelecek Projeksiyon Raporu 🔮" : "Canlı Finansal Röntgen Raporu 🧠🐙"}</span>
            </div>
            
            <button 
              onClick={fetchAIAnalysis} 
              disabled={loadingAi}
              className="refresh-btn"
            >
              {loadingAi ? "Hesaplanıyor..." : "Raporu Yenile 🔄"}
            </button>
          </div>
          
          <div className="ai-body">
            {loadingAi ? (
              <div className="ai-loading">
                <span className="dot-spin"></span> Veriler deniz derinliklerinde satır satır işleniyor, BuddyOcto senin için hesap kitap yapıyor ...
              </div>
            ) : aiReport ? (
              (() => {
                let listItems = [];
                const elements = [];
                const lines = aiReport.split(/\r?\n/);

                lines.forEach((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return;

                  if (trimmed.startsWith('###') || trimmed.match(/^\d+\./)) {
                    if (listItems.length > 0) {
                      elements.push(<ul key={`list-${i}`} className="ai-list">{listItems}</ul>);
                      listItems = [];
                    }
                    const cleanTitle = trimmed.replace(/^###\s*/, '').replace(/^\d+\.\s*/, '').trim();
                    elements.push(
                      <h4 key={`title-${i}`} className="ai-section-title">
                        {cleanTitle}
                      </h4>
                    );
                    return;
                  }

                  if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    const cleanItem = trimmed.replace(/^[-*]\s*/, '');
                    listItems.push(
                      <li key={`li-${i}`}>
                        {cleanItem.split('**').map((part, index) => 
                          index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                        )}
                      </li>
                    );
                    return;
                  }

                  if (listItems.length > 0) {
                    elements.push(<ul key={`list-${i}`} className="ai-list">{listItems}</ul>);
                    listItems = [];
                  }

                  elements.push(
                    <p key={`p-${i}`} className="ai-paragraph">
                      {trimmed.split('**').map((part, index) => 
                        index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                      )}
                    </p>
                  );
                });

                if (listItems.length > 0) {
                  elements.push(<ul key={`list-final`} className="ai-list">{listItems}</ul>);
                }

                return elements;
              })()
            ) : (
              <p className="ai-report-empty" style={{ color: "#475569", fontStyle: "italic", fontSize: "12.5px" }}>
                BuddyOcto derin analizler için emir bekliyor...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 4'lü Finansal Psikoloji Kartları Grid Yapısı ── */}
      <div className="insight-grid">
        <div className={`icard red ${!hasData ? "disabled-card" : ""}`}>
          <div className="icard-icon"><LottieIcon animationData={animAngry} size={36} /></div>
          <div className="icard-label">Stres Finansmanı</div>
          <div className="icard-val">{hasData ? stressVal : "—"}</div>
          <div className="icard-desc">{stressDesc}</div>
        </div>

        <div className={`icard green ${!hasData ? "disabled-card" : ""}`}>
          <div className="icard-icon"><LottieIcon animationData={animSmile} size={36} /></div>
          <div className="icard-label">Bilinçli Mutluluk</div>
          <div className="icard-val">{hasData ? happyVal : "—"}</div>
          <div className="icard-desc">{happyDesc}</div>
        </div>

        <div className={`icard purple ${!hasData ? "disabled-card" : ""}`}>
          <div className="icard-icon"><LottieIcon animationData={animMoney} size={36} /></div>
          <div className="icard-label">Zirvedeki Kategori: {topCatName}</div>
          <div className="icard-val">{topCatVal}</div>
          <div className="icard-desc">
            {hasData ? "Bu kategori toplam cüzdan harcamalarının en büyük dilimini temsil ediyor." : "Harcama ekledikçe en yoğun harcama odağın burada belirecek."}
          </div>
        </div>

        <div className="icard blue">
          <div className="icard-icon"><LottieIcon animationData={animStats} size={36} /></div>
          <div className="icard-label">{simulatedMonthOffset > 0 ? "Simüle Toplam Gider" : "Bu Ay Toplam Sürüm"}</div>
          <div className="icard-val">{total > 0 ? `${total.toLocaleString("tr-TR")} TL` : "0 TL"}</div>
          <div className="icard-desc">
            {total > 0 ? `Sistemde güvenli şekilde ${expenses.length} harcama haritalandı.` : "Psikolojik analizlerin başlayabilmesi için ilk harcamanı ekle!"}
          </div>
        </div>
      </div>

      {/* Gelecek Tahmin Kartı ve Grafikler Alt Bölümü */}
      {hasData ? (
        <>
          <div className="pred-card">
            <div className="pred-title">
              <LottieIcon animationData={animStats} size={22} autoplay />
              FinBuddy Ay Sonu Yapay Zeka Tahmini
            </div>
            <div className="pred-text">
              Mevcut harcama tempon ve finansal reflekslerin incelendiğinde bu ayı{" "}
              <strong>{projection.toLocaleString("tr-TR")} TL</strong> ile kapatacağın öngörülüyor.{" "}
              {projOver > 0 ? (
                <>
                  Dinamik aylık bütçeni yaklaşık <strong>{projOver.toLocaleString("tr-TR")} TL</strong> aşma riskin var.{" "}
                  {ins?.topCat ? `FinBuddy tavsiyesi: Özellikle "${ins.topCat[0]}" kalemi harcamalarını biraz frenlersen bütçeni güvenli bölgeye çekebilirsin.` : "Harcamalarını dengelemek adına önceliksiz harcamalarını kısmanı öneririm."}
                </>
              ) : (
                <span style={{ color: "#6ee7b7" }}>🎯 Harika gidiyorsun! Mevcut finansal disiplininle bütçenin tam kalbinde kalıyorsun, tebrikler!</span>
              )}
            </div>
          </div>

          <div className="charts-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "8px" }}>
            {/* 🎯 ZAMAN MAKİNESİ DESTEĞİ ALT GRAFİĞE GEÇİRİLDİ */}
            <MonthlyExpensesChart expenses={expenses} simulatedMonthOffset={simulatedMonthOffset} isDark={isDark} />
            <CategoryPieChart expenses={expenses} isDark={isDark} />
          </div>
        </>
      ) : (
        <div className="insights-empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
          <div className="empty-state-icon"><LottieIcon animationData={animStats} size={80} opacity={0.4} /></div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: "700", color: "#f1f5f9", marginTop: "16px" }}>Grafikler Analiz İçin Sabırsızlanıyor 📊</h3>
          <p style={{ fontSize: "12.5px", color: "#64748b", maxWidth: "400px", lineHeight: "1.6", margin: "8px 0 0" }}>Henüz sisteme işlenmiş bir harcama bulamadık . BuddyOcto asistan sekmesine gidip birkaç harcama girdikten sonra, harcamalarının kırılımları burada canlanacak!</p>
        </div>
      )}

    </div>
  );
};

export default InsightsPanel;