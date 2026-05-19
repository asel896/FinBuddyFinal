from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import sqlite3
import bcrypt

# 🔌 Thread-safe veritabanı motoru ve JWT motoru bağımlılıkları
from db.database import get_db 
from auth import create_access_token, get_current_user

router = APIRouter(tags=["Auth"])

# =====================================================================
# 📦 PYDANTIC VALIDATION SCHEMAS
# =====================================================================
class LoginSchema(BaseModel):
    email: EmailStr  # 🚀 Girdilerin gerçek e-posta formatında olması zorunlu
    password: str

class RegisterSchema(BaseModel):
    name: str
    email: EmailStr  # 🚀 Girdilerin gerçek e-posta formatında olması zorunlu
    password: str

# =====================================================================
# 🔐 ŞİFRE HASHLEME YARDIMCILARI (Güvenlik Duvarı)
# =====================================================================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# =====================================================================
# 🚀 GERÇEK AUTH ROTALARI
# =====================================================================

# 1. 📝 KULLANICI KAYDI (Sign Up)
@router.post("/register", status_code=201)
def register(data: RegisterSchema, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # 🕵️‍♂️ E-posta adresi zaten kullanımda mı kontrolü
    cursor.execute("SELECT id FROM users WHERE email = ?;", (data.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı reis.")
    
    # 🔒 Şifre hash'leme
    hashed_pwd = hash_password(data.password)
    
    try:
        # 💾 SQLite Veritabanına Kayıt Sorgusu (budget, income varsayılan 0.0)
        cursor.execute("""
            INSERT INTO users (name, email, password, budget, income) 
            VALUES (?, ?, ?, ?, ?);
        """, (data.name, data.email, hashed_pwd, 0.0, 0.0)) 
        
        new_user_id = cursor.lastrowid
        
        # Yeni kullanıcıya özel JWT token üretimi
        token = create_access_token(user_id=new_user_id)
        
        return {
            "message": "Kayıt başarıyla tamamlandı.",
            "token": token,
            "user": {
                "id": new_user_id,
                "name": data.name,
                "email": data.email,
                "budget": 0.0,
                "income": 0.0,
                "badge_count": 0  # Yeni kayıtta rozet doğal olarak 0
            }
        }
        
    except Exception as e:
        print(f"🚨 Kayıt Sırasında SQLite Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail="Veritabanına kayıt yazılırken bir hata oluştu.")


# 2. 🔑 KULLANICI GİRİŞİ (Login)
@router.post("/login")
def login(data: LoginSchema, db: sqlite3.Connection = Depends(get_db)):
    # Sözlük yapısında (Row Factory) okuma yapabilmek için yerel ayar
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    # 🔍 Kullanıcıyı arama sorgusu (income alanı dahil)
    cursor.execute("SELECT id, name, email, password, budget, income FROM users WHERE email = ?;", (data.email,))
    user = cursor.fetchone()
    
    # Şifre veya kullanıcı eşleşme kontrolü
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı reis!")
    
    # 🏆 Rozet sayısını dinamik olarak çekiyoruz
    cursor.execute("SELECT COUNT(*) as badge_count FROM user_badges WHERE user_id = ?;", (user["id"],))
    badge_data = cursor.fetchone()
    badge_count = badge_data["badge_count"] if badge_data else 0

    # Giriş başarılı, token üretimi
    token = create_access_token(user_id=user["id"])
    
    return {
        "message": "Giriş başarılı.",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "budget": user["budget"],
            "income": user["income"],
            "badge_count": badge_count  # Profil kartı senkronizasyonu için eklendi
        }
    }


# 3. 👤 AKTİF KULLANICI PROFİLİ VE ROZET SENKRONİZASYONU (/me)
@router.get("/me")
def get_current_user_profile(user_id: int = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    # 🎯 Hem kullanıcı verilerini hem de ilişkili rozet sayısını tek seferde getiren optimize sorgu
    query = """
        SELECT u.id, u.name, u.email, u.budget, u.income,
               (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count
        FROM users u
        WHERE u.id = ?;
    """
    cursor.execute(query, (user_id,))
    user_data = cursor.fetchone()
    
    if not user_data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
        
    return {
        "id": user_data["id"],
        "name": user_data["name"],
        "email": user_data["email"],
        "budget": user_data["budget"],
        "income": user_data["income"],
        "badge_count": user_data["badge_count"]
    }