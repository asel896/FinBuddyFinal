from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel
from typing import Optional, List, Literal
import sqlite3

# 🔌 Güvenli veritabanı bağımlılığı ve yetkilendirme mimarisi
from db.database import get_db
from auth import get_current_user

router = APIRouter(tags=["Expenses"])

# =====================================================================
# 📦 VALIDATION ENUMS & SCHEMAS
# =====================================================================
VALID_CATEGORIES = Literal[
    "Market", "Yemek", "İçecek", "Temizlik", "Kişisel Bakım", 
    "Elektronik", "Giyim", "Fatura", "Ulaşım", "Eğlence", "Sağlık", "Diğer"
]

class ExpenseCreateSchema(BaseModel):
    desc: str
    amount: float
    category: VALID_CATEGORIES = "Diğer"
    date: Optional[str] = None
    mood: Optional[str] = "😊"
    color: Optional[str] = "#14b8a6"
    merchant: Optional[str] = None

class ExpenseUpdateSchema(BaseModel):
    desc: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[VALID_CATEGORIES] = None
    date: Optional[str] = None
    mood: Optional[str] = None
    color: Optional[str] = None
    merchant: Optional[str] = None


# =====================================================================
# 🏅 ROZET VE GÖREV DENETLEYİCİ (Zırhlandırılmış & Evrensel Tip Uyumlu)
# =====================================================================
def check_and_award_badges(user_id: int, cursor: sqlite3.Cursor):
    """
    Kullanıcının harcamalarını analiz edip dinamik olarak rozet kazandırır.
    row_factory ayarından bağımsız olarak Tuple ve Row objelerini hatasız işler.
    """
    # 1. MirasYedi Kontrolü (Harcama toplamı > Kullanıcı bütçe limiti)
    cursor.execute("SELECT budget FROM users WHERE id = ?;", (user_id,))
    user_row = cursor.fetchone()
    
    # Hem dict/Row hem de standart tuple indeksleme kilitlerine karşı koruma
    if user_row:
        user_budget = user_row["budget"] if isinstance(user_row, sqlite3.Row) or isinstance(user_row, dict) else user_row[0]
    else:
        user_budget = 0

    cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE user_id = ?;", (user_id,))
    total_row = cursor.fetchone()
    
    if total_row:
        total_expense = total_row["total"] if isinstance(total_row, sqlite3.Row) or isinstance(total_row, dict) else total_row[0]
    else:
        total_expense = 0
        
    if total_expense is None:
        total_expense = 0

    if user_budget > 0 and total_expense > user_budget:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code) VALUES (?, 'MIRASYEDI');", (user_id,))

    # 2. Gurme Kontrolü (İlgili kategorilerde 5 veya daha fazla harcama)
    cursor.execute("""
        SELECT COUNT(*) as count FROM expenses 
        WHERE user_id = ? AND (category IN ('Yemek', 'Kahve', 'Restoran', 'İçecek'));
    """, (user_id,))
    food_row = cursor.fetchone()
    if food_row:
        food_count = food_row["count"] if isinstance(food_row, sqlite3.Row) or isinstance(food_row, dict) else food_row[0]
    else:
        food_count = 0
        
    if food_count >= 5:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code) VALUES (?, 'GURME');", (user_id,))

    # 3. Sosyetik Kontrolü (Tek seferde 1000 TL ve üzeri harcama)
    cursor.execute("SELECT COUNT(*) as count FROM expenses WHERE user_id = ? AND amount >= 1000;", (user_id,))
    rich_row = cursor.fetchone()
    if rich_row:
        rich_count = rich_row["count"] if isinstance(rich_row, sqlite3.Row) or isinstance(rich_row, dict) else rich_row[0]
    else:
        rich_count = 0
        
    if rich_count >= 1:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code) VALUES (?, 'SOSYETIK');", (user_id,))


# =====================================================================
# 🚀 TOPLU HARCAMA EKLEME MOTORU (Bulk Insert) 🐙
# =====================================================================
@router.post("/bulk/", status_code=status.HTTP_201_CREATED)
@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_expenses_bulk(
    data_list: List[ExpenseCreateSchema], 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Yapay zekanın fiş/mesaj analizinden ürettiği çoklu kalemleri tek transaction'da gömer
    ve hemen ardından kullanıcının güncel rozet durumunu denetler.
    """
    if not data_list:
        raise HTTPException(status_code=400, detail="Eklenecek harcama kalemi bulunamadı reis.")

    from datetime import date as dt
    
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    try:
        inserted_ids = []
        today_str = str(dt.today())

        for data in data_list:
            expense_date = data.date or today_str
            cursor.execute("""
                INSERT INTO expenses (user_id, desc, amount, category, date, mood, color, merchant)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (user_id, data.desc, data.amount, data.category, expense_date, data.mood, data.color, data.merchant))
            
            if cursor.lastrowid:
                inserted_ids.append(cursor.lastrowid)

        # 🔄 Toplu harcamalar bittikten hemen sonra Rozet Kontrol Motorunu ateşliyoruz
        check_and_award_badges(user_id, cursor)

        # 🎯 Veritabanına toplu kaydı mühürle
        db.commit()

        if inserted_ids:
            placeholders = ",".join(["?"] * len(inserted_ids))
            cursor.execute(f"SELECT * FROM expenses WHERE id IN ({placeholders}) ORDER BY id DESC;", inserted_ids)
            return [dict(r) for r in cursor.fetchall()]
        
        return []

    except Exception as e:
        db.rollback() # Hata durumunda koruma duvarı
        print(f"🚨 SQLite Toplu Kayıt Hatası: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Veritabanına toplu yazma işlemi başarısız oldu: {str(e)}"
        )


# =====================================================================
# 📋 STANDART ENDPOINT'LER
# =====================================================================

@router.get("")
def get_expenses(
    sort: Optional[str] = Query("date_desc"),
    category: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    ALLOWED_SORTS = {
        "date_desc": "date DESC, created_at DESC",
        "date_asc": "date ASC, created_at ASC",
        "amount_desc": "amount DESC",
        "amount_asc": "amount ASC"
    }
    order_clause = ALLOWED_SORTS.get(sort, "date_desc")

    if category:
        query = f"SELECT * FROM expenses WHERE user_id=? AND category=? ORDER BY {order_clause};"
        cursor.execute(query, (user_id, category))
    else:
        query = f"SELECT * FROM expenses WHERE user_id=? ORDER BY {order_clause};"
        cursor.execute(query, (user_id,))
        
    return [dict(r) for r in cursor.fetchall()]


@router.get("/summary")
def get_summary(
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    cursor.execute("SELECT category, SUM(amount) as total FROM expenses WHERE user_id=? GROUP BY category;", (user_id,))
    return [dict(r) for r in cursor.fetchall()]


@router.post("/", status_code=201)
@router.post("", status_code=201)
def create_expense(
    data: ExpenseCreateSchema, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    from datetime import date as dt
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    expense_date = data.date or str(dt.today())
    
    try:
        # 1. Harcamayı ekle
        cursor.execute("""
            INSERT INTO expenses (user_id, desc, amount, category, date, mood, color, merchant)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (user_id, data.desc, data.amount, data.category, expense_date, data.mood, data.color, data.merchant))
        
        last_id = cursor.lastrowid

        # 2. 🏅 Yeni harcamayla birlikte rozet kazanma şartlarını tetikle
        check_and_award_badges(user_id, cursor)
        
        # 🎯 Tekli harcamayı diske işle
        db.commit()
        
        cursor.execute("SELECT * FROM expenses WHERE id=?;", (last_id,))
        row = cursor.fetchone()
        return dict(row) if row else {}
    except Exception as e:
        db.rollback()
        print(f"🚨 Harcama Ekleme Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Harcama kaydedilemedi: {str(e)}")


@router.put("/{expense_id}")
def update_expense(
    expense_id: int, 
    data: ExpenseUpdateSchema, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM expenses WHERE id=? AND user_id=?;", (expense_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Harcama bulunamadı.")
    
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek alan seçilmedi.")

    set_clauses = []
    values = []
    for key, val in update_data.items():
        set_clauses.append(f"{key} = ?")
        values.append(val)
        
    values.extend([expense_id, user_id])
    set_query = ", ".join(set_clauses)
    
    try:
        cursor.execute(f"UPDATE expenses SET {set_query} WHERE id=? AND user_id=?;", values)
        
        # 🔄 Harcama güncellendiğinde de rozetleri tekrar kontrol et
        check_and_award_badges(user_id, cursor)
        
        # 🎯 Güncellemeyi diske mühürle
        db.commit()
        
        cursor.execute("SELECT * FROM expenses WHERE id=?;", (expense_id,))
        row = cursor.fetchone()
        return dict(row) if row else {}
    except Exception as e:
        db.rollback()
        print(f"🚨 Harcama Güncelleme Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail="Harcama güncellenemedi.")


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int, 
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM expenses WHERE id=? AND user_id=?;", (expense_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Harcama bulunamadı.")
        
    try:
        cursor.execute("DELETE FROM expenses WHERE id=?;", (expense_id,))
        
        # 🎯 Silme işlemini doğrula ve diske kaydet
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        print(f"🚨 Harcama Silme Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail="Harcama silinemedi.")