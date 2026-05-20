import React, { useState, useRef, useCallback, useEffect } from "react";
import "./ReceiptPanel.css";
import LottieIcon from "./LottieIcon";
import animScan from "../animations/receipt.json";
// 🎯 Merkezi API istemcimizden addBulk destekli metotları içeri alıyoruz
import { receiptAPI, expensesAPI } from "../../../api/client";

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

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!result) {
        reject(new Error("Dosya okunamadı, boş veri döndü."));
        return;
      }
      const pureBase64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(pureBase64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const analyzeReceipt = async (file) => {
  const base64Data = await fileToBase64(file);
  if (!base64Data) {
    throw new Error("Görsel veri dönüştürme işlemi başarısız oldu.");
  }
  const responseData = await receiptAPI.analyze(base64Data, file.type);
  return responseData;
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const HISTORY_KEY = "receipt_scan_history";

const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveToHistory = (resultData) => {
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    merchant: resultData?.merchant || "Bilinmiyor",
    date: resultData?.date || new Date().toLocaleDateString("tr-TR"),
    itemCount: resultData?.items?.length || 0,
    total: resultData?.items?.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || 0,
    scannedAt: new Date().toLocaleString("tr-TR"),
  };
  const updated = [entry, ...history].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
};

const ReceiptPanel = ({ setExpenses, simulatedMonthOffset = 0 }) => {
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(false);
  const [history, setHistory]         = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef(null);

  // 🛡️ ÇÖZÜM 1: Memory Leak Engelleyici useEffect
  useEffect(() => {
    setHistory(loadHistory());
    
    // Cleanup fonksiyonu: Bileşen unmount olduğunda veya preview değiştiğinde belleği temizler
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowed.includes(selectedFile.type)) {
      setError({ title: "Desteklenmeyen format", msg: "JPG, PNG, WEBP veya PDF yükleyebilirsin." });
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError({ title: "Dosya çok büyük", msg: "Maksimum 20 MB yükleyebilirsin." });
      return;
    }

    // Eski önizleme URL'ini yenisi oluşmadan önce bellekten temizle
    if (preview) URL.revokeObjectURL(preview);

    setFile(selectedFile);
    setResult(null);
    setError(null);
    setSuccess(false);

    if (selectedFile.type !== "application/pdf") {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [preview]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // 🛡️ ÇÖZÜM 2: Geliştirilmiş Temizlik Fonksiyonu
  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeReceipt(file);
      
      if (response && response.success && response.data) {
        const parsedData = response.data;
        setResult(parsedData);
        const updated = saveToHistory(parsedData);
        setHistory(updated);
      } else {
        throw new Error("Sunucudan geçersiz veri formatı döndü.");
      }
    } catch (err) {
      setError({ title: "Analiz başarısız", msg: err.message || "Bir hata oluştu, tekrar dene." });
    }
    setAnalyzing(false);
  };

  const handleConfirm = async () => {
    if (!result?.items?.length) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Backend'in birebir beklediği enum listesi
      const validCategories = [
        "Market", "Yemek", "İçecek", "Temizlik", "Kişisel Bakım", 
        "Elektronik", "Giyim", "Fatura", "Ulaşım", "Eğlence", "Sağlık", "Diğer"
      ];

      const itemsPayload = result.items.map(item => {
        let finalDate = result.date && result.date.includes("-") 
          ? result.date 
          : new Date().toISOString().slice(0, 10);

        if (simulatedMonthOffset > 0) {
          const simDate = new Date(finalDate);
          if (isNaN(simDate.getTime())) {
            const fallbackDate = new Date();
            fallbackDate.setMonth(fallbackDate.getMonth() + simulatedMonthOffset);
            finalDate = fallbackDate.toISOString().slice(0, 10);
          } else {
            simDate.setMonth(simDate.getMonth() + simulatedMonthOffset);
            finalDate = simDate.toISOString().slice(0, 10);
          }
        }

        // 🎯 Kategori Eşleştirme Güvencesi: Gelen kategoriyi temizle ve enum listesinde ara
        let incomingCat = (item.category || "Diğer").trim();
        let matchedCategory = validCategories.find(
          c => c.toLowerCase() === incomingCat.toLowerCase()
        ) || "Diğer";

        return {
          desc: item.desc || "İsimsiz Kalem",
          amount: parseFloat(item.amount) || 0.0, // 🎯 DÜZELTME: Kuruşlar kaybolmasın diye float bıraktık
          category: matchedCategory,              // 🎯 DÜZELTME: Katı enum uyumlu hale getirildi
          date: finalDate,
          mood: "😊",
          merchant: result.merchant || "Bilinmeyen Mağaza"
        };
      });

      // 🚀 API Çağrısı
      const savedExpenses = await expensesAPI.addBulk(itemsPayload);
      
      if (Array.isArray(savedExpenses)) {
        setExpenses((prev) => [...savedExpenses, ...prev]);
      } else if (savedExpenses && Array.isArray(savedExpenses.data)) {
        // Eğer backend response'u { success: true, data: [...] } şeklinde dönüyorsa koruma katmanı
        setExpenses((prev) => [...savedExpenses.data, ...prev]);
      }

      setSuccess(true);
      setResult(null);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("Toplu harcama kayıt hatası:", err);
      setError({ 
        title: "Veritabanına kaydedilemedi", 
        msg: err.response?.data?.detail || "Bütün kalemler eklenirken bir veritabanı veya ağ hatası oluştu." 
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteHistory = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const totalAmount = result?.items?.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) ?? 0;

  return (
    <div className="receipt-panel">
      <div style={{ padding: "28px 28px 0" }}>
        <div className="tab-header" style={{ marginBottom: 16 }}>
          <div>
            <h2>Fiş & Fatura Analizi</h2>
            <p>Fotoğraf veya PDF yükle, kalemleri otomatik ayıralım</p>
          </div>
        </div>
      </div>

      {!success && (
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
          style={{ margin: "0 28px" }}
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <div className="upload-icon-lottie">
                <LottieIcon animationData={animScan} size={64} autoplay loop />
              </div>
              <div className="upload-title">Fiş veya fatura yükle</div>
              <div className="upload-sub">Sürükle bırak ya da tıkla</div>
              <div className="upload-types">
                <span className="upload-type-pill">JPG</span>
                <span className="upload-type-pill">PNG</span>
                <span className="upload-type-pill">WEBP</span>
                <span className="upload-type-pill">PDF</span>
              </div>
              <div className="upload-sub" style={{ fontSize: 11 }}>Maks. 20 MB</div>
            </>
          ) : (
            <div className="file-preview">
              {preview ? (
                <img src={preview} alt="fiş önizleme" className="file-thumb" />
              ) : (
                <div className="file-thumb-pdf">📋</div>
              )}
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatSize(file.size)}</div>
              </div>
              <button
                className="file-remove"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              >
                Kaldır
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {file && !analyzing && !result && !success && (
        <div className="analyze-row">
          <button className="analyze-btn" onClick={handleAnalyze}>
            <span>✨</span>
            Analiz Et
          </button>
        </div>
      )}

      {analyzing && (
        <div className="analyzing-state" style={{ margin: "16px 28px 0" }}>
          <div className="analyzing-spinner" />
          <div className="analyzing-text">
            <strong>İşlem gerçekleştiriliyor...</strong>
            Yayapı zeka bütçe motorları devrede
          </div>
        </div>
      )}

      {error && (
        <div className="error-box">
          <strong>⚠️ {error.title}</strong>
          {error.msg}
        </div>
      )}

      {result && !analyzing && (
        <div className="results-section">
          <div className="results-header">
            <div className="results-title">📋 Analiz Sonucu</div>
            <div className="results-total">
              Toplam: <strong>{totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</strong>
            </div>
          </div>

          <div className="receipt-summary">
            <div className="receipt-summary-icon">🏪</div>
            <div className="receipt-summary-info">
              <div className="receipt-merchant">{result.merchant || "Bilinmiyor"}</div>
              <div className="receipt-date">{result.date || "Tarih yok"}</div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              {result.items?.length} kalem
            </div>
          </div>

          <div className="receipt-items">
            {result.items?.map((item, i) => (
              <div key={i} className="receipt-item">
                <div
                  className="item-category-dot"
                  style={{ background: CATEGORY_COLORS[item.category] || CATEGORY_COLORS["Diğer"] }}
                />
                <span className="item-name">{item.desc}</span>
                <span className="item-category-badge">{item.category}</span>
                <span className="item-price">
                  -{(parseFloat(item.amount) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </span>
              </div>
            ))}
          </div>

          <div className="confirm-row">
            <button className="confirm-btn primary" onClick={handleConfirm}>
              ✅ Harcamalara Ekle ({result.items?.length} kalem)
            </button>
            <button className="confirm-btn secondary" onClick={handleRemove}>
              İptal
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="success-state" style={{ margin: "28px 28px 0" }}>
          <div className="success-icon">🎉</div>
          <div className="success-title">Harcamalara eklendi!</div>
          <div className="success-sub">Tüm kalemler veritabanına işlendi ve senkronize edildi.</div>
          <button className="success-new-btn" onClick={() => setSuccess(false)}>
            + Yeni Fiş Analiz Et
          </button>
        </div>
      )}

      <div className="history-section" style={{ margin: "28px 28px 0", paddingBottom: 28 }}>
        <div
          className="history-header"
          onClick={() => setShowHistory(!showHistory)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: showHistory ? "12px 12px 0 0" : 12,
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🕓</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              Geçmiş Taramalar
            </span>
            {history.length > 0 && (
              <span style={{
                background: "rgba(255,255,255,0.1)",
                borderRadius: 20,
                fontSize: 11,
                padding: "2px 8px",
                color: "rgba(255,255,255,0.5)",
              }}>
                {history.length}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            transform: showHistory ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            display: "inline-block",
          }}>
            ▼
          </span>
        </div>

        {showHistory && (
          <div style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            overflow: "hidden",
          }}>
            {history.length === 0 ? (
              <div style={{
                padding: "28px 16px",
                textAlign: "center",
                color: "rgba(255,255,255,0.25)",
                fontSize: 13,
              }}>
                Henüz tarama yapılmadı
              </div>
            ) : (
              <>
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <button
                    onClick={handleClearHistory}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,100,100,0.5)",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    Tümünü Temizle
                  </button>
                </div>

                {history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}>
                      🧾
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {entry.merchant}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                        {entry.scannedAt} · {entry.itemCount} kalem
                      </div>
                    </div>

                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                      flexShrink: 0,
                    }}>
                      {entry.total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                    </div>

                    <button
                      onClick={() => handleDeleteHistory(entry.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.15)",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: "4px",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                      title="Sil"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptPanel;