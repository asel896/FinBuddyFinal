from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3
from typing import Dict, Any

# 🔌 Güvenli veritabanı bağımlılığı ve yetkilendirme mimarimiz
from db.database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/badges", tags=["Gamification"])

# =====================================================================
# 🏅 SİSTEM ROZET TANIMLARI V VERİ SETİ
# =====================================================================
SYSTEM_BADGES_DATA = [
    ("MIRASYEDI", "MirasYedi", "Aylık bütçe sınırını aşarak parayı adeta havaya saçtın!", "💸"),
    ("GURME", "Gurme", "Dışarıda yemek yeme rekoru kırdın, ev yemeği unutuldu.", "🍔"),
    ("SOSYETIK", "Sosyetik", "Tek kalemde devasa bir harcama patlattın, elitizm kokuyor!", "🛍️"),
    ("CIMRI", "Cimri", "Bütçenin %30'undan azını harcadın. Varyemez amca seni!", "🐷"),
    ("TEKNOLOJIK", "Tekno-Bağımlı", "Teknoloji dünyasına yatırım yaptın, devir dijital devir.", "💻"),
    ("KUMBARACI", "Kumbara Üstadı", "Geleceğe yatırım! En az 2 farklı birikim hedefi oluşturdun.", "🎯"),
    ("KAHVEKOLIK", "Kahvekolik", "Damarlarında kan yerine kafein akıyor, kahve harcamaların tavan yaptı.", "☕"),
    ("SABAH_YILDIZI", "Sabah Yıldızı", "Güne erken başlayanlar! Sabah 06:00 - 09:00 arası harcama yaptın.", "🌅"),
    ("GECE_KUSU", "Gece Kuşu", "Gece hayatı ya da uykusuz alışverişler! 23:00 - 04:00 arası harcama yaptın.", "🦉"),
    ("FATURAMATIK", "Faturamatik", "Düzenli vatandaş! Fatura kategorisinde en az 3 harcama kaydettin.", "🧾"),
    ("MAAS_GUNU", "Maaş Günü", "Hesaba taze kan geldi! Bütçeni tek seferde 15.000 TL ve üzerine çıkardın.", "💰"),
    ("ISTIKRARLI", "İstikrarlı", "FinBuddy'yi evlat edindin! Toplamda 15 harcama sınırını devirdin.", "📈"),
    ("REKORTMEN", "Rekortmen", "Cüzdanda büyük bir gedik açıldı! Tek seferde 5000 TL ve üzeri harcama yaptın.", "🏆")
]


# =====================================================================
# 🚀 KULLANICI ROZET, XP VE SAĞLIK SKORU ENDPOINT'İ 🐙
# =====================================================================
@router.get("", status_code=status.HTTP_200_OK)
def get_user_badges(
    user_id: int = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Kullanıcının harcamalarını, bütçesini ve hedeflerini analiz ederek
    kazanılan rozetleri senkronize eder, anlık XP, Seviye ve Sağlık Skorunu hesaplar.
    """
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    # 1. 🛡️ Koruma Adımı: Eksik sistem rozetleri varsa db yükünü hafifleterek ekle
    for code, name, desc, emoji in SYSTEM_BADGES_DATA:
        cursor.execute("""
            INSERT OR IGNORE INTO badges (code, name, description, emoji) 
            VALUES (?, ?, ?, ?);
        """, (code, name, desc, emoji))

    # 2. 📊 Kullanıcı Verilerini Güvenle Çekme
    cursor.execute("SELECT budget FROM users WHERE id = ?;", (user_id,))
    user_row = cursor.fetchone()
    user_budget = user_row["budget"] if (user_row and user_row["budget"]) else 3000
    
    cursor.execute("SELECT SUM(amount) as total, COUNT(*) as total_count FROM expenses WHERE user_id = ?;", (user_id,))
    expense_row = cursor.fetchone()
    total_spent = expense_row["total"] if (expense_row and expense_row["total"] is not None) else 0
    total_expenses_count = expense_row["total_count"] if (expense_row and expense_row["total_count"] is not None) else 0

    # 3. 🎯 ROZET TETİKLEYİCİ MEKANİZMALARI (Gelişmiş Filtreler Entegre Edildi)
    
    # MirasYedi Kontrolü
    if total_spent > user_budget:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'MIRASYEDI', datetime('now'));", (user_id,))
    
    # Gurme Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND (category LIKE '%Yemek%' OR category LIKE '%Restoran%');", (user_id,))
    if cursor.fetchone()["c"] >= 3:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'GURME', datetime('now'));", (user_id,))
    
    # Sosyetik Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND amount >= 1500;", (user_id,))
    if cursor.fetchone()["c"] >= 1:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'SOSYETIK', datetime('now'));", (user_id,))
    
    # Cimri Kontrolü
    if total_expenses_count >= 3 and total_spent > 0 and total_spent <= (user_budget * 0.30):
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'CIMRI', datetime('now'));", (user_id,))
    
    # Tekno-Bağımlı Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND (category LIKE '%Teknoloji%' OR category LIKE '%Elektronik%' OR category LIKE '%Tekno%');", (user_id,))
    if cursor.fetchone()["c"] >= 1:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'TEKNOLOJIK', datetime('now'));", (user_id,))
    
    # Kumbara Üstadı Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM goals WHERE user_id = ?;", (user_id,))
    goals_count = cursor.fetchone()["c"]
    if goals_count >= 2:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'KUMBARACI', datetime('now'));", (user_id,))
    
    # Kahvekolik Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND (LOWER(desc) LIKE '%kahve%' OR LOWER(desc) LIKE '%coffee%' OR LOWER(desc) LIKE '%starbucks%');", (user_id,))
    if cursor.fetchone()["c"] >= 3:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'KAHVEKOLIK', datetime('now'));", (user_id,))
    
    # Sabah Yıldızı Kontrolü (06:00 - 09:00 arası harcama)
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND strftime('%H', date) BETWEEN '06' AND '09';", (user_id,))
    if cursor.fetchone()["c"] >= 1:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'SABAH_YILDIZI', datetime('now'));", (user_id,))
    
    # Gece Kuşu Kontrolü (23:00 - 04:00 arası harcama - Gece Kušu yazım hatası düzeltildi)
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND (strftime('%H', date) >= '23' OR strftime('%H', date) <= '04');", (user_id,))
    if cursor.fetchone()["c"] >= 1:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'GECE_KUSU', datetime('now'));", (user_id,))
    
    # Faturamatik Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND (category LIKE '%Fatura%' OR category LIKE '%Bill%');", (user_id,))
    if cursor.fetchone()["c"] >= 3:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'FATURAMATIK', datetime('now'));", (user_id,))
    
    # Maaş Günü Kontrolü
    if user_budget >= 15000:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'MAAS_GUNU', datetime('now'));", (user_id,))
    
    # İstikrarlı Kontrolü
    if total_expenses_count >= 15:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'ISTIKRARLI', datetime('now'));", (user_id,))
    
    # Rekortmen Kontrolü
    cursor.execute("SELECT COUNT(*) as c FROM expenses WHERE user_id = ? AND amount >= 5000;", (user_id,))
    if cursor.fetchone()["c"] >= 1:
        cursor.execute("INSERT OR IGNORE INTO user_badges (user_id, badge_code, awarded_at) VALUES (?, 'REKORTMEN', datetime('now'));", (user_id,))

    # 4. 🥇 KAZANILAN ROZETLERİN DETAYLARINI GETİRME
    # Sadece kodları değil, frontend'de listelemek için tüm badge detaylarını (emoji, desc) çekiyoruz
    query = """
        SELECT b.code, b.name, b.description, b.emoji, ub.awarded_at 
        FROM user_badges ub 
        JOIN badges b ON ub.badge_code = b.code 
        WHERE ub.user_id = ? ORDER BY ub.awarded_at DESC;
    """
    cursor.execute(query, (user_id,))
    earned_badges_rows = cursor.fetchall()
    earned_codes = [r["code"] for r in earned_badges_rows]
    earned_badges_list = [dict(r) for r in earned_badges_rows]

    # 5. 🧮 MEGA MOTOR HESAPLAMALARI
    # XP ve Seviye Hesaplama
    total_xp = (total_expenses_count * 15) + (goals_count * 60) + (len(earned_codes) * 120)
    level = (total_xp // 300) + 1  # Her 300 XP'de bir seviye atlar
    next_level_xp = level * 300
    current_level_progress = total_xp % 300

    # Finansal Sağlık Skoru (Maks 100)
    health_score = 100
    if total_spent > user_budget:
        health_score -= 40
    elif total_spent > (user_budget * 0.8):
        health_score -= 15
    if goals_count == 0:
        health_score -= 20
    if total_expenses_count == 0:
        health_score -= 10
    health_score = max(10, health_score)

    # Finansal Profil Unvanı Belirleme
    if not earned_codes:
        user_title = "Gizemli Tasarrufçu 🌱"
    elif "MIRASYEDI" in earned_codes or "SOSYETIK" in earned_codes:
        user_title = "Finansal Tehlike / Harcama Canavarı 🦈"
    elif "CIMRI" in earned_codes or "KUMBARACI" in earned_codes:
        user_title = "Geleceğin Milyoneri / Kumbara Üstadı 💰"
    elif len(earned_codes) >= 6:
        user_title = "FinBuddy Kıdemli Müdavimi 🏆"
    else:
        user_title = "Yolun Başında Bir Buddy 🛡️"

    # 🎯 NOT: Commit adımı `get_db` context manager'ı tarafından otomatik mühürlenir.

    return {
        "badges": earned_codes,          # Eski uyumluluk için sadece kodların listesi
        "badges_detailed": earned_badges_list, # Frontend'de basmak için tam detaylı liste (Bonus!)
        "stats": {
            "xp": total_xp,
            "level": level,
            "next_level_xp": next_level_xp,
            "progress": int((current_level_progress / 300) * 100),
            "health_score": health_score,
            "title": user_title  
        }
    }