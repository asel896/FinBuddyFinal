import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./MonthlyExpensesChart.css";

const FALLBACK_DATA = [
  { month: "Oca", expenses: 3200, income: 5400 },
  { month: "Şub", expenses: 2800, income: 5200 },
  { month: "Mar", expenses: 4100, income: 6100 },
  { month: "Nis", expenses: 3600, income: 5800 },
  { month: "May", expenses: 5200, income: 7200 },
  { month: "Haz", expenses: 4700, income: 6500 },
  { month: "Tem", expenses: 3900, income: 5900 },
  { month: "Ağu", expenses: 4300, income: 6300 },
  { month: "Eyl", expenses: 3100, income: 5100 },
  { month: "Eki", expenses: 4800, income: 6800 },
  { month: "Kas", expenses: 5600, income: 7400 },
  { month: "Ara", expenses: 6200, income: 8100 },
];

const AY_ETIKETLERI = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

const FILTERS = ["3 Ay", "6 Ay", "Tümü"];

// 🎯 DÜZELTME: Zaman makinesi ile seçilen aya göre veriyi filtreleyen mantık
function buildChartData(expenses, simulatedMonthOffset = 0) {
  if (!expenses || expenses.length === 0) return null;

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + simulatedMonthOffset, 1);

  const byMonth = {};
  
  // Geriye dönük 12 ayı hesapla
  for (let i = 11; i >= 0; i--) {
    const d = new Date(targetDate.getFullYear(), targetDate.getMonth() - i, 1);
    byMonth[`${d.getFullYear()}_${d.getMonth()}`] = { 
      month: AY_ETIKETLERI[d.getMonth()], 
      expenses: 0, 
      income: 0, 
      isFuture: false 
    };
  }

  expenses.forEach((e) => {
    const eDate = e.date ? new Date(e.date) : new Date();
    const key = `${eDate.getFullYear()}_${eDate.getMonth()}`;
    
    if (byMonth[key]) {
      byMonth[key].expenses += parseFloat(e.amount) || 0;
      if (eDate > new Date()) byMonth[key].isFuture = true;
    }
  });

  return Object.values(byMonth);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="mec-tooltip">
        <p className="mec-tooltip__label">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="mec-tooltip__row">
            <span className="mec-tooltip__dot" style={{ background: entry.color }} />
            <span className="mec-tooltip__name">{entry.name}</span>
            <span className="mec-tooltip__value">
              ₺{entry.value.toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const MonthlyExpensesChart = ({ expenses, simulatedMonthOffset = 0 }) => {
  const [activeFilter, setActiveFilter] = useState("Tümü");

  // 🎯 useMemo ile veriyi stabilize et
  const realData = useMemo(() => buildChartData(expenses, simulatedMonthOffset), [expenses, simulatedMonthOffset]);
  
  const isRealData = realData !== null;
  const rawData = realData || FALLBACK_DATA;

  const avg = Math.round(rawData.reduce((s, d) => s + d.expenses, 0) / rawData.length);
  const dataWithAvg = rawData.map((d) => ({ ...d, avg }));

  const filteredData = useMemo(() => {
    if (activeFilter === "3 Ay") return dataWithAvg.slice(-3);
    if (activeFilter === "6 Ay") return dataWithAvg.slice(-6);
    return dataWithAvg;
  }, [dataWithAvg, activeFilter]);

  const totalExpenses = filteredData.reduce((s, d) => s + d.expenses, 0);
  const totalIncome = filteredData.reduce((s, d) => s + d.income, 0);
  const savingsRate = totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : null;

  return (
    <div className={`mec-card ${simulatedMonthOffset > 0 ? "mec-card--simulation" : ""}`}>
      <div className="mec-header">
        <div className="mec-header__left">
          <h2 className="mec-title">
            Aylık Harcama Analizi {simulatedMonthOffset > 0 && "⏱️"}
          </h2>
          <p className="mec-subtitle">
            {simulatedMonthOffset > 0 
              ? `Zaman Makinesi Modu: +${simulatedMonthOffset} Ay Sonrası Projeksiyonu`
              : isRealData
              ? "Gerçek harcamalarına göre"
              : "Örnek veri — harcama ekledikçe güncellenir"}
          </p>
        </div>
        <div className="mec-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`mec-filter-btn ${activeFilter === f ? "mec-filter-btn--active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mec-stats">
        <div className="mec-stat">
          <span className="mec-stat__label">Toplam Gelir</span>
          <span className="mec-stat__value mec-stat__value--income">
            {totalIncome > 0 ? `₺${totalIncome.toLocaleString("tr-TR")}` : "—"}
          </span>
        </div>
        <div className="mec-stat-divider" />
        <div className="mec-stat">
          <span className="mec-stat__label">Toplam Gider</span>
          <span className="mec-stat__value mec-stat__value--expense">
            ₺{totalExpenses.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="mec-stat-divider" />
        <div className="mec-stat">
          <span className="mec-stat__label">Tasarruf Oranı</span>
          <span className="mec-stat__value mec-stat__value--savings">
            {savingsRate ? `%${savingsRate}` : "—"}
          </span>
        </div>
      </div>

      <div className="mec-chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97066" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f97066" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8892a4", fontSize: 12, fontFamily: "inherit" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8892a4", fontSize: 11, fontFamily: "inherit" }} tickFormatter={(v) => v >= 1000 ? `₺${(v / 1000).toFixed(0)}k` : `₺${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend wrapperStyle={{ paddingTop: "16px" }} formatter={(value) => <span style={{ color: "#8892a4", fontSize: "12px" }}>{value}</span>} />
            {totalIncome > 0 && <Bar dataKey="income" name="Gelir" fill="url(#incomeGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />}
            <Bar dataKey="expenses" name="Gider" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Line type="monotone" dataKey="avg" name="Ort. Gider" stroke="#facc15" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyExpensesChart;