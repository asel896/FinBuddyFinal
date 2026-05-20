import React, { useRef, useEffect, useMemo } from "react";
import "./ChatPanel.css";
import LottieIcon from "./LottieIcon"; 
import animOctopus from "../animations/octopus1.json";
import { chatAPI } from "../../../api/client";

const QUICK_INSIGHTS = [
  { icon: "☕", text: "Kahve harcaman bu ay biraz yoğun — dengeleyebiliriz!" },
  { icon: "🍔", text: "Hafta sonu harcamaların ritmini bozuyor olabilir, dikkat." },
  { icon: "🎯", text: "Hedeflerine odaklanmayı unutma, BuddyOcto yanında!" },
];

// 🎨 Üst panellerle %100 senkronize renk haritası
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

const ChatPanel = ({ 
  expenses = [], 
  setExpenses, 
  goals = [], 
  setGoals, 
  userProfile,
  messages = [], 
  setMessages 
}) => {
  
  const inputRef = useRef(null);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [activeQuestion, setActiveQuestion] = React.useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAction = (actionText) => {
    setActiveQuestion(null); 
    sendMessage(actionText);
  };

  const sendMessage = async (forcedText = null) => {
    const textToSend = forcedText || input.trim();
    if (!textToSend || loading) return;
    
    if (!forcedText) setInput("");
    
    // 🧠 Yeni soru sorulduğunda veya kullanıcı bağımsız mesaj attığında butonları gizle
    setActiveQuestion(null);

    // 🌟 GÜVENLİ HAFIZA GÜNCELLEMESİ: Race condition engellemek için mevcut mesaj geçmişini koruyoruz
    const userMessage = { role: "user", content: textToSend };
    const historyForAPI = [...messages, userMessage];
    
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true); 

    try {
      const data = await chatAPI.sendMessage({
        messages: historyForAPI, // State gecikmesine takılmayan temiz dizi
        expenses,
        goals,
        userProfile: userProfile || { monthlyLimit: 3000, income: 10000 }
      });

      if (data && data.reply) {
        // Asistan cevabını ekle
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

        // Akıllı soru buton tetikleyicisi
        if (data.askUser) {
          setActiveQuestion(data.askUser);
        }

        // 🎯 ÇOĞUL HARCAMA PARSERS: Statik renk yerine kategori eşleşmeli renk ataması
        if (data.detectedExpenses && data.detectedExpenses.length > 0) {
          const newExpensesMapped = data.detectedExpenses.map((exp, index) => {
            const normalizedCategory = exp.category ? exp.category.trim() : "Diğer";
            return {
              id: "temp-exp-" + Date.now() + "-" + index, 
              desc: exp.desc,
              amount: parseFloat(exp.amount) || 0, // Güvenli float dönüşümü
              category: normalizedCategory,
              date: new Date().toISOString().split('T')[0], 
              mood: exp.mood || "😊",
              color: CATEGORY_COLORS[normalizedCategory] || CATEGORY_COLORS["Diğer"], // 🚀 DÜZELTME: Renk uyumu sağlandı
              _saved: false 
            };
          });

          setExpenses((prev) => [...newExpensesMapped, ...prev]);
        }

        // 🎯 YENİ HEDEF EKLEME MOTORU
        if (data.detectedGoal && setGoals) {
          const newGoal = {
            id: "temp-goal-" + Date.now(),
            name: data.detectedGoal.name,
            target: parseFloat(data.detectedGoal.target) || 0,
            current: parseFloat(data.detectedGoal.current) || 0, 
            color: "#8b5cf6", // Yeni hedeflere varsayılan fütüristik mor renk
            priority: "medium",
            description: data.detectedGoal.durationMonths 
              ? `${data.detectedGoal.durationMonths} Aylık Plan` 
              : "Kişisel Tasarruf Hedefi",
            _saved: false 
          };

          setGoals((prev) => [...prev, newGoal]);
        }

        // 🌟 MEVCUT HEDEFE PARA EKLEME MOTORU
        if (data.goalProgressUpdate && setGoals) {
          const { goal_name, amount } = data.goalProgressUpdate;
          
          setGoals((prevGoals) => 
            prevGoals.map((goal) => {
              const isMatch = goal.name.trim().toLowerCase() === goal_name.trim().toLowerCase() ||
                              goal.name.trim().toLowerCase().includes(goal_name.trim().toLowerCase());
              
              if (isMatch) {
                return {
                  ...goal,
                  current: Number(goal.current || 0) + Number(amount),
                  _saved: false 
                };
              }
              return goal;
            })
          );
        }

      } else {
        throw new Error("Geçersiz yanıt formatı");
      }

    } catch (err) {
      const errorText = err.message && err.message.includes("Oturum")
        ? "Oturum yetkinin süresi dolmuş , lütfen çıkış yapıp tekrar gir! 🐙"
        : "Bağlantı derinliklerinde bir sorun oluştu, sunucular nefes almaya çalışıyor olabilir! 🐙";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorText },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      {/* Panel Başlığı */}
      <div className="chat-header">
        <div className="chat-header-top">
          <LottieIcon animationData={animOctopus} size={52} className="chat-header-octo" />
          <div>
            <h2>BuddyOcto Akıllı Asistan</h2>
            <p>Konuşarak harcama ve hedef ekle, bütçeni yapay zeka yönetsin</p>
          </div>
        </div>
        <div className="quick-insights">
          {QUICK_INSIGHTS.map((q, i) => (
            <div key={i} className="insight-pill" onClick={() => handleQuickAction(q.text)} style={{ cursor: "pointer" }}>
              {q.icon} {q.text}
            </div>
          ))}
        </div>
      </div>

      {/* Mesajlaşma Alanı */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            {msg.role === "assistant" && (
              <LottieIcon animationData={animOctopus} size={32} autoplay className="msg-avatar-lottie" />
            )}
            <div className="msg-bubble">{msg.content}</div>
          </div>
        ))}
        
        {/* Akıllı Onay / Seçim Butonları Alanı */}
        {activeQuestion && !loading && (
          <div className="msg assistant action-buttons-container">
            <div className="action-buttons-row">
              {activeQuestion.type === "CHOOSE_DESTINATION" && (
                <>
                  <button onClick={() => handleQuickAction("Genel bakiyeme ekle")} className="action-btn-pill income-style">
                    🪙 Genel Bakiyeme Ekle
                  </button>
                  <button onClick={() => handleQuickAction("Hedefime ekle")} className="action-btn-pill goal-style">
                    🎯 Tasarruf Hedefime Ekle
                  </button>
                </>
              )}

              {activeQuestion.type === "SELECT_GOAL" && goals.map((goal) => (
                <button 
                  key={goal.id} 
                  onClick={() => handleQuickAction(`${goal.name} hedefime ekle`)} 
                  className="action-btn-pill target-style"
                >
                  🎯 {goal.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="msg assistant">
            <LottieIcon animationData={animOctopus} size={32} autoplay className="msg-avatar-lottie" />
            <div className="msg-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Mesaj Giriş Alanı */}
      <div className="chat-input-row">
        <LottieIcon
          animationData={animOctopus}
          size={38}
          externalTrigger={input.length > 0}
          className="input-octo"
        />
        <input
          ref={inputRef}
          className="chat-inp"
          placeholder='Örn: "200 tl param var" veya "150 TL Kahve harcaması"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="chat-send" onClick={() => sendMessage()} disabled={loading}>
          {loading ? "..." : "Gönder"}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;