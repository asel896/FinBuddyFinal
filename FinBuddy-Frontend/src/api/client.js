const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * 🔐 GÜVENLİ MERKEZİ İSTEK MOTORU (fetch)
 */
async function req(method, path, body) {
  const token = localStorage.getItem("token"); 
  const headers = {};

  // 🎟️ Eğer tarayıcıda geçerli bir token varsa Authorization Header'ına mühürlüyoruz
  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Eğer atılan istek FormData değilse JSON içeriği olduğunu belirtiyoruz
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // BASE ve gelen path dinamik olarak birleşiyor (Environment dostu)
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // 🚨 Eğer backend token'ı beğenmeyip 401 çakarsa, oturumu frontend'de de temizliyoruz
  if (res.status === 401) {
    // Sonsuz döngüyü engellemek için: Eğer ZATEN login sayfasındaysak tekrar yönlendirme yapma!
    const onLoginPage = window.location.pathname === "/login" || window.location.pathname === "/Login";
    
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("buddyocto_onboarding");
    localStorage.removeItem("buddyocto_user");

    if (!onLoginPage) {
      window.location.href = "/login";
      throw new Error("Oturum süresi doldu reis, lütfen tekrar giriş yap.");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${res.status}`);
  }

  const data = await res.json();

  // 🎯 KRİTİK DÜZELTME: Giriş veya Kayıt isteği başarılı döndüyse, 
  // token ve kullanıcı verilerini hemen localStorage'a kilitliyoruz.
  if (path === "/login" || path === "/register") {
    const sessionToken = data.access_token || data.token;
    if (sessionToken) {
      localStorage.setItem("token", sessionToken);
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("buddyocto_user", JSON.stringify(data.user));
    }
  }

  return data;
}

// =====================================================================
// 🔑 1. KİMLİK DOĞRULAMA SERVİSİ (Auth)
// =====================================================================
export const authAPI = {
  login: async (email, password) => {
    return await req("POST", "/login", { email, password });
  },
  register: async (name, email, password) => {
    return await req("POST", "/register", { name, email, password });
  },
};

// =====================================================================
// 👤 2. KULLANICI PROFİL SERVİSİ (User)
// =====================================================================
export const userAPI = {
  get:    ()     => req("GET", "/api/user"),
  update: (data) => req("PUT", "/api/user", data),
};

// =====================================================================
// 💸 3. HARCAMA SERVİSİ (Expenses)
// =====================================================================
export const expensesAPI = {
  list:    (params = {}) => req("GET", "/api/expenses?" + new URLSearchParams(params)),
  summary: ()            => req("GET", "/api/expenses/summary"),
  add:     (data)        => req("POST",   "/api/expenses", data),
  addBulk: (dataArray)   => req("POST",   "/api/expenses/bulk", dataArray),
  update:  (id, data)    => req("PUT",    `/api/expenses/${id}`, data),
  remove:  (id)          => req("DELETE", `/api/expenses/${id}`),
};

// =====================================================================
// 🎯 4. BİRİKİM HEDEFLERİ SERVİSİ (Goals)
// =====================================================================
export const goalsAPI = {
  list:       ()       => req("GET",    "/api/goals"),
  add:        (data)   => req("POST",   "/api/goals", data),
  update:     (id, data)   => req("PUT",    `/api/goals/${id}`, data),
  addAmount: (id, amount) => req("PUT",    `/api/goals/${id}`, { addAmount: amount }),
  remove:    (id)         => req("DELETE", `/api/goals/${id}`),
};

// =====================================================================
// 🤖 5. YÜKSEK FİŞ TARAMA SERVİSİ (Receipt Vision)
// =====================================================================
export const receiptAPI = {
  analyze: (imageBase64, mimeType = "image/jpeg") => {
    return req("POST", "/api/analyze-receipt", { imageBase64, mimeType });
  },
};

// =====================================================================
// 💬 6. YAPAY ZEKA SOHBET VE ANALİZ SERVİSİ (Chat)
// =====================================================================
export const chatAPI = {
  sendMessage: async (chatPayload) => {
    return req("POST", "/api/chat", chatPayload);
  },
  getFinancialAnalysis: async (payload) => {
    return req("POST", "/api/chat/analyze", payload);
  }
};

// =====================================================================
// 🏅 7. OYUNLAŞTIRMA SERVİSİ (Badges & Gamification) -> Koruma Altına Alındı 🐙
// =====================================================================
export const badgesAPI = {
  /**
   * Kullanıcının kazandığı rozetleri, anlık XP, seviye ve sağlık skorunu getirir.
   * req motoru sayesinde canlı ortamda (BASE url) sorunsuz çalışır ve otomatik token basar.
   */
  list: async () => {
    try {
      return await req("GET", "/api/badges");
    } catch (error) {
      console.error("🚨 Oyunlaştırma verileri çekilirken hata oluştu:", error.message);
      // Arayüzün kırılmasını engellemek için fallback (güvenli) bir şema dönüyoruz
      return { badges: [], badges_detailed: [], stats: { xp: 0, level: 1, progress: 0, health_score: 100, title: "Buddy 🌱" } };
    }
  }
};