import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import lottie from "lottie-web";
import { motion, AnimatePresence } from "framer-motion";
import animData from "./octopus.json";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../api/client";

const Login = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const lottieRef1 = useRef(null);
  const lottieRef2 = useRef(null);
  const anim1Ref = useRef(null);
  const anim2Ref = useRef(null);
  const [isDiving, setIsDiving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const isPasswordRef = useRef(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  /* ---- PARTICLE OCEAN BG ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      if (!canvas || !scene) return;
      canvas.width = scene.offsetWidth;
      canvas.height = scene.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * (canvas.width || 800),
      y: Math.random() * (canvas.height || 600),
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));
    let rafId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,255,218,${p.alpha})`;
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(100,255,218,${0.06 * (1 - dist / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  /* ---- LOTTIE ---- */
  useEffect(() => {
    const a1 = lottie.loadAnimation({
      container: lottieRef1.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animData,
    });
    const a2 = lottie.loadAnimation({
      container: lottieRef2.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animData,
    });
    a2.addEventListener("DOMLoaded", () => {
      const svg = lottieRef2.current?.querySelector("svg");
      if (svg) svg.style.filter = "hue-rotate(20deg) saturate(1.4)";
    });
    anim1Ref.current = a1;
    anim2Ref.current = a2;
    return () => { a1.destroy(); a2.destroy(); };
  }, []);

  /* ---- GÖZ KAPAMA ---- */
  const getActiveAnim = useCallback(() => {
    return isRegistering ? anim2Ref.current : anim1Ref.current;
  }, [isRegistering]);

  const startBlinking = useCallback(() => {
    const anim = getActiveAnim();
    if (!anim) return;
    anim.pause();
    anim.goToAndStop(14, true);
  }, [getActiveAnim]);

  const stopBlinking = useCallback(() => {
    const anim = getActiveAnim();
    if (!anim) return;
    anim.goToAndPlay(28, true);
  }, [getActiveAnim]);

  const handlePasswordFocus = useCallback(() => {
    isPasswordRef.current = true;
    setPasswordFocused(true);
    startBlinking();
  }, [startBlinking]);

  const handlePasswordBlur = useCallback(() => {
    isPasswordRef.current = false;
    setPasswordFocused(false);
    stopBlinking();
  }, [stopBlinking]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ---- 🌟 GERÇEK ZAMANLI ŞİFRE GÜCÜ HESAPLAMA 🌟 ----
  const passwordStrength = useMemo(() => {
    const pass = registerPassword;
    if (!pass) return { score: 0, label: "", color: "transparent" };

    let currentScore = 0;
    
    if (pass.length >= 8) currentScore++; // Kural 1: Uzunluk
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) currentScore++; // Kural 2: Büyük/Küçük Harf
    if (/[0-9]/.test(pass)) currentScore++; // Kural 3: Rakam
    if (/[!@#$%^&*(),.?":{}|<>_]/.test(pass)) currentScore++; // Kural 4: Özel Karakter

    // Skora göre etiket ve renk basıyoruz
    switch (currentScore) {
      case 1:
        return { score: 1, label: "Zayıf ☠️", color: "#ff4d4d" };
      case 2:
        return { score: 2, label: "Orta 😐", color: "#ffa500" };
      case 3:
        return { score: 3, label: "Güçlü 🪙", color: "#00bfff" };
      case 4:
        return { score: 4, label: "Kripto Güvenli 🐙", color: "#64ffda" };
      default:
        return { score: 0, label: "Çok Zayıf", color: "#ff4d4d" };
    }
  }, [registerPassword]);


  // ---- BACKEND AKSİYONLARI ----
  const triggerDiveAnimation = (authData) => {
    setErrorMsg("");
    setIsDiving(true);
    
    const token = authData.access_token || authData.token;
    if (token) {
      localStorage.setItem("token", token);
    }

    const profileData = authData.user || authData;
    localStorage.setItem("user", JSON.stringify(profileData));
    localStorage.setItem("buddyocto_user", JSON.stringify(profileData));

    setTimeout(() => {
      setIsDiving(false);
      navigate("/Dashboard");
    }, 2800);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!loginEmail || !loginPassword) {
      setErrorMsg("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    if (!validateEmail(loginEmail)) {
      setErrorMsg("Geçersiz e-posta formatı.");
      return;
    }

    try {
      const data = await authAPI.login(loginEmail, loginPassword);
      triggerDiveAnimation(data);
    } catch (error) {
      setErrorMsg(error.message || "Giriş başarısız.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!registerName || !registerEmail || !registerPassword) {
      setErrorMsg("Lütfen tüm alanları doldurun.");
      return;
    }

    if (registerName.trim().length < 3 || registerName.trim().length > 30) {
      setErrorMsg("Ad Soyad alanı en az 3, en fazla 30 karakter olmalıdır.");
      return;
    }

    if (!validateEmail(registerEmail)) {
      setErrorMsg("Girdiğin e-posta adresi geçerli değil.");
      return;
    }

    // 🎯 GÜNCELLEME: En az "Güçlü" (Score >= 3) şifreleri kabul ediyoruz
    if (passwordStrength.score < 3) {
      setErrorMsg("Şifren çok zayıf ! En azından büyük harf, küçük harf ve bir sayı kombinasyonu kullan. 🐙");
      return;
    }

    try {
      const data = await authAPI.register(registerName, registerEmail, registerPassword);
      triggerDiveAnimation(data);
    } catch (error) {
      setErrorMsg(error.message || "Kayıt işlemi başarısız oldu.");
    }
  };

  const toggleForm = (toRegister) => {
    setErrorMsg("");
    setIsRegistering(toRegister);
  };

  return (
    <div className="scene" ref={sceneRef}>
      <canvas ref={canvasRef} className="bg-canvas" />

      <AnimatePresence>
        {isDiving && (
          <motion.div
            className="dive-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
          >
            <div className="bubble-field">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bbub"
                  style={{
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 15 + 5}px`,
                    height: `${Math.random() * 15 + 5}px`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${Math.random() * 2 + 1}s`,
                    opacity: Math.random() * 0.5,
                  }}
                />
              ))}
            </div>
            <div className="dive-msg">Derinliklere iniliyor...</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="card"
        animate={isDiving ? { opacity: 0, scale: 0.93 } : { opacity: 1, scale: 1 }}
      >
        {errorMsg && (
          <div className="error-banner" style={{ color: "#ff6b6b", textAlign: "center", position: "absolute", top: "15px", width: "100%", zIndex: 10, fontSize: "14px", fontWeight: "bold", padding: "0 10px" }}>
            {errorMsg}
          </div>
        )}

        <div className={`slide-track ${isRegistering ? "to-register" : ""}`}>

          {/* LOGIN SLIDE */}
          <div className="slide">
            <div className="left">
              <div className="brand-tag">BuddyOcto</div>
              <div ref={lottieRef1} className="lottie-wrap" />
              <div className="left-title">
                Finansal yolculuğuna <br />
                <span>BuddyOcto</span> ile başla.
              </div>
            </div>
            <div className="right">
              <div className="form-header">Hoş Geldin 👋</div>
              <input 
                className="inp" 
                placeholder="E-posta adresi" 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                className="inp"
                placeholder="Şifre"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
              />
              <button className="divebtn" onClick={handleLogin}>
                Dalışa Geç
              </button>
              <div className="footer-txt">
                Yeni misin?{" "}
                <span onClick={() => toggleForm(true)}>Hesap oluştur</span>
              </div>
            </div>
          </div>

          {/* REGISTER SLIDE */}
          <div className="slide">
            <div className="left">
              <div className="brand-tag">Yeni Mürettebat</div>
              <div ref={lottieRef2} className="lottie-wrap" />
              <div className="left-title">
                Derinlikleri keşfetmek için <br />
                <span>Kayıt Ol</span>.
              </div>
            </div>
            <div className="right">
              <div className="form-header">Hesap Aç ✨</div>
              <input 
                className="inp" 
                placeholder="Ad Soyad" 
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                maxLength={35}
              />
              <input 
                className="inp" 
                placeholder="E-posta" 
                type="email" 
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
              />
              
              {/* ŞİFRE INPUT ALANI */}
              <input
                className="inp"
                placeholder="Şifre"
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
              />

              {/* 🌟 4 PARÇALI GERÇEK ZAMANLI GÜVENLİK BARI 🌟 */}
              {registerPassword && (
                <div className="strength-wrapper">
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map((index) => (
                      <div
                        key={index}
                        className="strength-bar"
                        style={{
                          backgroundColor:
                            index <= passwordStrength.score
                              ? passwordStrength.color
                              : "rgba(255, 255, 255, 0.1)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

             <button 
  className="divebtn" 
  style={{ 
    marginTop: registerPassword ? "10px" : "20px",
    // Eğer şifre yazılmışsa ve skor 3'ten küçükse butonu yarı saydam yapıp güven vermediğini hissettiriyoruz
    opacity: registerPassword && passwordStrength.score < 3 ? 0.6 : 1,
    cursor: registerPassword && passwordStrength.score < 3 ? "not-allowed" : "pointer"
  }} 
  onClick={handleRegister}
>
  Mürettebata Katıl
</button>
              <div className="footer-txt">
                Zaten üye misin?{" "}
                <span onClick={() => toggleForm(false)}>Giriş Yap</span>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default Login;