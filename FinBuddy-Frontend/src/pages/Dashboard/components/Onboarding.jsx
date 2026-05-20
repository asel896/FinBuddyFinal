import React, { useState, useEffect, useRef } from "react";
import "./Onboarding.css";
import LottieIcon from "./LottieIcon";
import animOctopus from "../animations/octopus1.json";
import animMoney   from "../animations/money.json";
import animTarget  from "../animations/target.json";

// Veritabanı istekleri için gerekli API'leri import ediyoruz
import { goalsAPI, userAPI } from "../../../api/client";
// 🎯 Görsel bütünlük ve hata bildirimleri için kendi şık Toast hook'umuzu ekliyoruz
import { useToast } from "./Toast"; 

const STEPS = [
  {
    id: "name",
    anim: animOctopus,
    title: "Merhaba! Ben BuddyOcto 🐙",
    subtitle: "Sana nasıl hitap edeyim?",
    placeholder: "Adın nedir?",
    type: "text",
  },
  {
    id: "budget",
    anim: animMoney,
    title: "Aylık bütçen ne kadar?",
    subtitle: "Harcamalarını bu limite göre takip edeceğiz.",
    placeholder: "Örn: 5000",
    type: "number",
  },
  {
    id: "goal",
    anim: animTarget,
    title: "İlk hedefin ne?",
    subtitle: "Biriktirmek istediğin finansal bir hedef yaz.",
    placeholder: "Örn: iPhone Almak, Tatil Fonu",
    type: "text",
  },
  {
    id: "goal_target",
    anim: animTarget,
    title: "Bu hedef için ne kadar lazım?",
    subtitle: "Hedefine ulaşman için gereken toplam tutar.",
    placeholder: "Örn: 15000",
    type: "number",
  },
];

// 🎯 ZAMAN MAKİNESİ ENTEGRASYONU: Aktif offset değerini prop olarak içeri alıyoruz
const Onboarding = ({ onFinish, simulatedMonthOffset = 0 }) => {
  const [step, setStep]   = useState(0);
  const [values, setValues] = useState({ name: "", budget: "", goal: "", goal_target: "" });
  const [exiting, setExiting] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 

  const { error: toastError, success: toastSuccess } = useToast();
  const inputRef = useRef(null);

  const current = STEPS[step];
  const value   = values[current.id];
  const isLast  = step === STEPS.length - 1;

  // Her adım değiştiğinde input'a otomatik odaklanmayı garantiye alıyoruz
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const handleNext = async () => {
    if (!value || !value.toString().trim()) return;

    if (isLast) {
      setIsSaving(true);
      try {
        // 🚀 1. ADIM: Kullanıcının bütçesini backend'de GÜNCELLE
        await userAPI.update({
          name: values.name,
          budget: parseInt(values.budget) || 0
        });

        // ⏱️ ZAMAN MAKİNESİ SİHİRLİ DOKUNUŞU:
        // Eğer onboarding zaman makinesi aktifken tamamlanıyorsa, hedefin oluşturulma tarihini 
        // simüle edilen aya göre mühürlemek için backend veya client tarafında kullanılacak dinamik tarih verisi
        const baseDate = new Date();
        if (simulatedMonthOffset > 0) {
          baseDate.setMonth(baseDate.getMonth() + simulatedMonthOffset);
        }
        const formattedCreationDate = baseDate.toISOString().slice(0, 10);

        // 🚀 2. ADIM: Kullanıcının girdiği ilk hedefi veritabanına mühürle
        await goalsAPI.add({
          name: values.goal,
          target: parseFloat(values.goal_target) || 1000, 
          current: 0,
          color: "#14b8a6",
          priority: "medium",
          createdAt: formattedCreationDate // Geleceğe uyumlu tarih yapısı entegre edildi
        });

        // 🚀 3. ADIM: LocalStorage senkronizasyonu
        localStorage.setItem("buddyocto_onboarding", JSON.stringify({
          name: values.name,
          budget: values.budget
        }));

        toastSuccess("Profil mühürlendi, FinBuddy evrenine hoş geldin! 🐙");

        // Çıkış animasyonu ve tetikleme
        setExiting(true);
        setTimeout(() => {
          onFinish({
            name: values.name,
            budget: parseInt(values.budget) || 0
          });
        }, 600);

      } catch (err) {
        console.error("Onboarding verileri veritabanına kaydedilemedi:", err);
        // Standart alert yerine asil toast yapımızı patlatıyoruz
        toastError("Profil bilgilerin kaydedilirken bir hata oluştu. Tekrar dener misin?");
      } finally {
        setIsSaving(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleNext();
  };

  return (
    <div className={`ob-overlay ${exiting ? "ob-exit" : ""}`}>
      <div className="ob-card">

        {/* Progress dots */}
        <div className="ob-dots">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`ob-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            />
          ))}
        </div>

        {/* Lottie */}
        <div className="ob-anim">
          <LottieIcon animationData={current.anim} size={100} autoplay />
        </div>

        {/* Metin */}
        <h2 className="ob-title">{current.title}</h2>
        <p className="ob-sub">{current.subtitle}</p>

        {/* Input */}
        <input
          key={current.id}
          ref={inputRef}
          className="ob-inp"
          type={current.type}
          placeholder={current.placeholder}
          value={value}
          disabled={isSaving}
          onChange={(e) =>
            setValues((v) => ({ ...v, [current.id]: e.target.value }))
          }
          onKeyDown={handleKey}
        />

        {/* Buton */}
        <button
          className="ob-btn"
          onClick={handleNext}
          disabled={!value || !value.toString().trim() || isSaving}
        >
          {isSaving ? (
            "Veriler Güvenle İşleniyor... 🐙"
          ) : isLast ? (
            "Hadi Başlayalım! 🚀"
          ) : (
            "Devam Et →"
          )}
        </button>

        {/* Adım sayısı */}
        <p className="ob-step-label">{step + 1} / {STEPS.length}</p>
      </div>
    </div>
  );
};

export default Onboarding;