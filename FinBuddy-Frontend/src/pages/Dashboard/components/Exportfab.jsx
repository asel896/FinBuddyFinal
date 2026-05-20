import React, { useState } from "react";
import "./ExportFAB.css";

const ExportFAB = ({ expenses = [], goals = [] }) => {
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
        `buddyocto-${date}.csv`,
        "text/csv;charset=utf-8"
      );
    } else {
      download(
        JSON.stringify({ exportedAt: new Date().toISOString(), expenses, goals }, null, 2),
        `buddyocto-${date}.json`,
        "application/json"
      );
    }

    setDone(key);
    setTimeout(() => setDone(null), 2000);
  };

  return (
    <div className="efab-card">
      <div className="efab-header">
        <div className="efab-icon">📤</div>
        <div>
          <div className="efab-title">Dışa Aktar</div>
          <div className="efab-sub">Harcamaları tek tıkla indir</div>
        </div>
      </div>

      <div className="efab-btns">
        <button
          className={`efab-btn efab-btn--csv ${done === "csv" ? "efab-btn--done" : ""}`}
          onClick={() => doExport("csv")}
          disabled={done !== null}
        >
          {done === "csv" ? "✓ İndirildi" : "CSV İndir"}
        </button>
        <button
          className={`efab-btn efab-btn--json ${done === "json" ? "efab-btn--done" : ""}`}
          onClick={() => doExport("json")}
          disabled={done !== null}
        >
          {done === "json" ? "✓ İndirildi" : "JSON İndir"}
        </button>
      </div>
    </div>
  );
};

export default ExportFAB;