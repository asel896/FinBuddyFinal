from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import sqlite3

# 🔌 Güncellenmiş thread-safe veritabanı motoru
from db.database import get_db
from auth import get_current_user

router = APIRouter(tags=["User Profile"])

# =====================================================================
# 📥 PYDANTIC VALIDATION SCHEMAS (Güncel income dahil edildi)
# =====================================================================

class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    budget: Optional[float] = None
    income: Optional[float] = None # 🚀 DÜZELTME: Gelir alanı yönetimi eklendi

# =====================================================================
# 🚀 PROFIL YÖNETİM ROTALARI
# =====================================================================

# 1. 🔍 PROFİL BİLGİLERİNİ GETİR
@router.get("")
def get_user_profile(
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db) # 🚀 DÜZELTME: Dependency Injection
):
    cursor = db.cursor()
    # 🛡️ Güvenli sorgu (şifre hariç)
    cursor.execute(
        "SELECT id, name, email, budget, income, created_at FROM users WHERE id = ?;", 
        (user_id,)
    )
    user = cursor.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
        
    return dict(user)


# 2. 📝 PROFİLİ GÜNCELLE (Dinamik income desteği ile)
@router.put("")
def update_user_profile(
    data: ProfileUpdateSchema, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db) # 🚀 DÜZELTME: Dependency Injection
):
    cursor = db.cursor()
    
    # Güncelleme verilerini al (Sadece gönderilenleri seç)
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek veri gönderilmedi.")

    # 🛡️ Dinamik SQL inşası (SQL Injection korumalı)
    set_clauses = [f"{key} = ?" for key in update_data.keys()]
    values = list(update_data.values())
    values.append(user_id)
    
    query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?;"
    cursor.execute(query, values)
    
    # Güncel bilgileri döndür
    cursor.execute("SELECT id, name, email, budget, income FROM users WHERE id = ?;", (user_id,))
    return dict(cursor.fetchone())