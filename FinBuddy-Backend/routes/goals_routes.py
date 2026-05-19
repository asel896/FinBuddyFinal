from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
import sqlite3

# 🔌 Thread-safe veritabanı bağımlılığı
from db.database import get_db
from auth import get_current_user

router = APIRouter(tags=["Goals"])

# =====================================================================
# 📥 PYDANTIC VALIDATION SCHEMAS
# =====================================================================

class GoalCreateSchema(BaseModel):
    name: str
    target: float
    current: Optional[float] = 0.0
    color: Optional[str] = "#14b8a6"
    priority: Optional[str] = "medium"

class GoalUpdateSchema(BaseModel):
    name: Optional[str] = None
    target: Optional[float] = None
    current: Optional[float] = None
    color: Optional[str] = None
    priority: Optional[str] = None
    addAmount: Optional[float] = None

# =====================================================================
# 🚀 CRUD ROTASYONLARI
# =====================================================================

# 1. 🔍 HEDEFLERİ LİSTELE
@router.get("")
def get_goals(
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db) # 🚀 DÜZELTME: Güvenli enjeksiyon
):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC;", (user_id,))
    return [dict(row) for row in cursor.fetchall()]


# 2. ➕ YENİ HEDEF EKLE
@router.post("", status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreateSchema, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db) # 🚀 DÜZELTME: Güvenli enjeksiyon
):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO goals (user_id, name, target, current, color, priority) 
        VALUES (?, ?, ?, ?, ?, ?);
    """, (user_id, data.name, data.target, data.current, data.color, data.priority))
    
    cursor.execute("SELECT * FROM goals WHERE id = ?;", (cursor.lastrowid,))
    return dict(cursor.fetchone())


# 3. 📝 HEDEF GÜNCELLE VE KUMBARAYA PARA EKLE
@router.put("/{goal_id}")
def update_goal(
    goal_id: int, 
    data: GoalUpdateSchema, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db) # 🚀 DÜZELTME: Güvenli enjeksiyon
):
    cursor = db.cursor()
    
    # 🔍 Hedef sahiplik kontrolü
    cursor.execute("SELECT current FROM goals WHERE id = ? AND user_id = ?;", (goal_id, user_id))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı.")
        
    # 🪙 KUMBARA MANTIĞI: addAmount varsa topla, yoksa değerleri güncelle
    new_current = float(row["current"])
    if data.addAmount is not None:
        new_current += float(data.addAmount)
    elif data.current is not None:
        new_current = float(data.current)

    # 🛡️ DÜZELTME: Güvenli güncelleme için set_clauses inşası
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("addAmount", None) # addAmount'u SQL'e göndermiyoruz
    update_data["current"] = new_current
    
    set_clauses = [f"{key} = ?" for key in update_data.keys()]
    values = list(update_data.values())
    values.extend([goal_id, user_id])
    
    query = f"UPDATE goals SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?;"
    cursor.execute(query, values)
    
    cursor.execute("SELECT * FROM goals WHERE id = ?;", (goal_id,))
    return dict(cursor.fetchone())


# 4. ❌ HEDEFİ SİL
@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db) # 🚀 DÜZELTME: Güvenli enjeksiyon
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM goals WHERE id = ? AND user_id = ?;", (goal_id, user_id))
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı.")
    
    return {"success": True}