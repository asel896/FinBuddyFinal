import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from contextlib import asynccontextmanager

# 🔍 Modül arama yollarını garantiye alıyoruz (Dizin hatalarını önlemek için)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 🔌 Veritabanı bağımlılığını içeri aktarma
from db.database import get_db

# 📦 Yazdığımız modern Python rotalarını içeri aktarıyoruz (Oyunlaştırma Dahil)
from routes import (
    auth_routes, 
    chat_routes, 
    expense_routes, 
    goals_routes, 
    receipt_routes, 
    user_routes, 
    gamification_routes
)

# =====================================================================
# 🌐 CORS & SUNUCU ORTAM DEĞİŞKENLERİ (Lifespan öncesi tanımlanmalı)
# =====================================================================
# Node.js tarafındaki FRONTEND_URL mantığı, yoksa varsayılan Vite portu
ENV_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# 🎯 CORS Politikası Sağlama Alma: Tarayıcının 'localhost' ve '127.0.0.1' çakışmalarını önlemek için ikisini de ekliyoruz
ALLOWED_ORIGINS = [
    ENV_FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

# =====================================================================
# 🔄 MODERN LIFESPAN MANAGEMENT (Eski @app.on_event("startup") yerine)
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 🐙 Sunucu ilk start aldığında tetiklenecek kontroller (Startup)
    print("\n" + "="*50)
    print("🐙 FinBuddy Veritabanı katmanı denetleniyor...")
    
    # Veritabanını tetikleyip tabloları ve şemaları doğrulatıyoruz
    get_db()
    
    print(f"📡 CORS İzni Verilen Adresler: {ALLOWED_ORIGINS}")
    print("🚀 Bütün FastAPI rotaları ve zırhlı sistemler başarıyla ayağa kalktı!")
    print("="*50 + "\n")
    yield
    # Sunucu kapanırken bir şey yapmak istersen buraya ekleyebilirsin (Shutdown)

# =====================================================================
# 🚀 FASTAPI APP INITIALIZATION
# =====================================================================
app = FastAPI(
    title="FinBuddy API 🐙", 
    description="FastAPI ve Gemini 3 Flash Destekli Akıllı Finans Backend Motoru",
    version="1.0.0",
    lifespan=lifespan  # Modern ömür döngüsü yöneticisini bağlıyoruz
)

# 🌐 CORS MIDDLEWARE ENTEGRASYONU
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Güvenli origins listemiz
    allow_credentials=True,         # Token ve Authorization header taşınması için kritik
    allow_methods=["*"],            # GET, POST, PUT, DELETE, OPTIONS hepsine izin ver
    allow_headers=["*"],            # Authorization, Content-Type vb. tüm başlıklara izin ver
)

# =====================================================================
# 🛤️ 2. ENDPOINT'LERİ ROTARA BAĞLAMA (Node.js URL Yapısıyla Birebir Eşleme)
# =====================================================================
app.include_router(auth_routes.router)                                    # /api/auth (Giriş/Kayıt/Token)
app.include_router(user_routes.router, prefix="/api/user")                # /api/user (Profil ve Limit)
app.include_router(expense_routes.router, prefix="/api/expenses")         # /api/expenses (Harcamalar)
app.include_router(goals_routes.router, prefix="/api/goals")              # /api/goals (Kumbaralı Hedefler)
app.include_router(receipt_routes.router, prefix="/api/analyze-receipt")  # /api/analyze-receipt (Fiş Okuma)
app.include_router(chat_routes.router, prefix="/api/chat")                # /api/chat (BuddyOcto Chat)

# 🏅 Oyunlaştırma (Gamification) Rotası Sisteme Entegre Edildi
app.include_router(gamification_routes.router)                            # /api/badges (Rozet, XP ve Seviye)

# =====================================================================
# 🏥 3. SAĞLIK KONTROLÜ ENDPOINT'İ (GET /api/health)
# =====================================================================
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")  # Modern ve hatasız UTC zaman damgası
    }

# =====================================================================
# 🔌 SUNUCU TETİKLEME MOTORU
# =====================================================================
if __name__ == "__main__":
    # Node.js tarafındaki PORT (.env) kontrolü, yoksa varsayılan 3001 portu
    PORT = int(os.getenv("PORT", 3001))
    
    # 🎯 ASGI modül hatasını önlemek için projenin ana dosya adına göre ("server:app") tetikliyoruz
    uvicorn.run("server:app", host="127.0.0.1", port=PORT, reload=True)