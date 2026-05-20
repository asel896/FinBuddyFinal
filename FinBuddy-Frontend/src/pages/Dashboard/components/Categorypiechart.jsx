import React, { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector,
} from "recharts";
import "./CategoryPieChart.css";

const CATEGORY_COLORS = {
  "Market":        "#14b8a6",
  "Yemek":         "#f59e0b",
  "İçecek":        "#8b5cf6",
  "Ulasim":        "#84cc16", 
  "Ulaşım":        "#84cc16", 
  "Eglence":       "#a855f7", 
  "Eğlence":       "#a855f7", 
  "Kahve":         "#6366f1", 
  "Fatura":        "#ef4444",
  "Temizlik":      "#3b82f6",
  "Kişisel Bakım": "#ec4899",
  "Elektronik":    "#06b6d4",
  "Giyim":         "#f97316",
  "Sağlık":        "#22c55e",
  "Diğer":         "#6b7280",
};

const FALLBACK_DATA = [
  { category: "Market",   total: 1840, percentage: 32.1 },
  { category: "Yemek",    total: 1200, percentage: 20.9 },
  { category: "Fatura",   total: 980,  percentage: 17.1 },
  { category: "Ulaşım",   total: 640,  percentage: 11.2 },
  { category: "İçecek",   total: 420,  percentage: 7.3  },
  { category: "Diğer",    total: 650,  percentage: 11.4 },
];

function buildCategoryData(expenses, simulatedMonthOffset = 0) {
  if (!expenses || expenses.length === 0) return null;

  // 1. Simülasyonun hedeflediği tarihi bul
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + simulatedMonthOffset, 1);
  
  const totals = {};
  let grand = 0;
  
  // 2. Sadece hedeflenen aya/yıla denk gelen harcamaları al
  expenses.forEach((e) => {
    const eDate = e.date ? new Date(e.date) : new Date();
    
    // Yıl ve Ay eşleşmesi kontrolü
    if (eDate.getMonth() === targetDate.getMonth() && eDate.getFullYear() === targetDate.getFullYear()) {
      const cat = e.category || "Diğer";
      const amt = parseFloat(e.amount) || 0;
      totals[cat] = (totals[cat] || 0) + amt;
      grand += amt;
    }
  });
  
  if (grand === 0) return null;
  
  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      total,
      percentage: parseFloat(((total / grand) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.total - a.total);
}

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, isDark }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className={`cpc-tooltip ${isDark ? "" : "cpc-tooltip--light"}`}>
        <div className="cpc-tooltip__cat">{d.category}</div>
        <div className="cpc-tooltip__row">
          <span className="cpc-tooltip__val">₺{d.total.toLocaleString("tr-TR")}</span>
          <span className="cpc-tooltip__pct">%{d.percentage}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CategoryPieChart = ({ expenses, isDark = true }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const realData = useMemo(() => buildCategoryData(expenses), [expenses]);
  const isRealData = realData !== null;
  const data = realData || FALLBACK_DATA;
  const total = data.reduce((s, d) => s + d.total, 0);
  
  // Güvenli index kontrolü (eğer data uzunluğu anlık değişirse crash vermemesi için)
  const active = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;

  return (
    <div className={`cpc-card ${isDark ? "" : "cpc-card--light"}`}>
      <div className="cpc-header">
        <div>
          <h2 className="cpc-title">Kategori Dağılımı</h2>
          <p className="cpc-subtitle">
            {isRealData ? "Harcamalarına göre dağılım" : "Örnek veri — harcama ekledikçe güncellenir"}
          </p>
        </div>
        <div className="cpc-total-badge">
          <span className="cpc-total-label">Toplam</span>
          <span className="cpc-total-value">₺{total.toLocaleString("tr-TR")}</span>
        </div>
      </div>

      <div className="cpc-body">
        <div className="cpc-chart-wrap" style={{ minWidth: "220px", position: "relative" }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={65} outerRadius={88}
                dataKey="total" nameKey="category"
                paddingAngle={2}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                // 🚀 DÜZELTME: Recharts hover takılmalarını önlemek için güvenli indeks eşlemesi
                onMouseEnter={(_, index) => {
                  if (index !== activeIndex) setActiveIndex(index);
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-${entry.category}-${idx}`} // 🚀 DÜZELTME: Duplicate key hatası engellendi
                    fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS["Diğer"]}
                    style={{ transition: "all 0.2s ease-in-out", outline: "none" }}
                    opacity={
                      activeIndex === null ||
                      data[activeIndex]?.category === entry.category ? 1 : 0.3
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="cpc-center-label" style={{ pointerEvents: "none" }}>
            {active ? (
              <>
                <span className="cpc-center-pct">%{active.percentage}</span>
                <span className="cpc-center-cat" style={{ color: CATEGORY_COLORS[active.category] || "#6b7280" }}>
                  {active.category}
                </span>
              </>
            ) : (
              <>
                <span className="cpc-center-pct">{data.length}</span>
                <span className="cpc-center-cat">Kategori</span>
              </>
            )}
          </div>
        </div>

        <div className="cpc-list">
          {data.map((entry, i) => {
            const color = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS["Diğer"];
            const isActive = activeIndex === i;
            return (
              <div
                key={`list-${entry.category}-${i}`}
                className={`cpc-list-item ${isActive ? "cpc-list-item--active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="cpc-dot" style={{ background: color }} />
                <div className="cpc-list-info">
                  <div className="cpc-list-top">
                    <span className="cpc-list-name">{entry.category}</span>
                    <span className="cpc-list-amount">₺{entry.total.toLocaleString("tr-TR")}</span>
                    <span className="cpc-list-pct">%{entry.percentage}</span>
                  </div>
                  <div className="cpc-bar-track">
                    <div
                      className="cpc-bar-fill"
                      style={{ 
                        width: `${entry.percentage}%`, 
                        background: color,
                        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" 
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryPieChart;