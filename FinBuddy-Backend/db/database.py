import os
import sqlite3
from contextlib import contextmanager

# 🎯 PROJENİN GERÇEK ANA DİZİNİNİ BULUYORUZ (db klasörünün bir üstü)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 🔒 VERİTABANINI KESİN OLARAK 'db' KLASÖRÜNÜN İÇİNE MÜHÜRLÜYORUZ
DB_DIR = os.path.join(BASE_DIR, "db")
DB_PATH = os.path.join(DB_DIR, "finbuddy.db")

# Klasör yoksa otomatik oluştur ki SQLite "kod yürütülemedi" hatası vermesin
os.makedirs(DB_DIR, exist_ok=True)

def init_db():
    """
    Uygulama ilk açıldığında tüm tabloları (rozetler dahil) hazırlar, 
    şemayı doğrular ve günceller.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Performans Ayarları
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. 🏗️ Tabloları Oluşturma (Rozet Sistemleri Entegre Edildi)
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT, 
            budget REAL DEFAULT 0,   -- Aylık harcama limiti (monthlyLimit)
            income REAL DEFAULT 0,   -- 🚀 DÜZELTME: Yapay zeka analizi için kritik gelir alanı
            created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            desc TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT DEFAULT 'Diğer',
            date TEXT NOT NULL,
            mood TEXT DEFAULT '😊',
            color TEXT DEFAULT '#14b8a6',
            merchant TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            target REAL NOT NULL,
            current REAL DEFAULT 0,
            color TEXT DEFAULT '#8b5cf6',
            priority TEXT DEFAULT 'medium',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            emoji TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            badge_code TEXT NOT NULL REFERENCES badges(code) ON DELETE CASCADE,
            awarded_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, badge_code) -- Aynı rozet iki kez kazanılamasın hatalarını önler
        );
    """)
    
    # 2. 🏅 VARSAYILAN ROZETLERİ SİSTEME ENJEKTE ETME
    # (Arkadaşının kodundaki noktalı virgül yazım hatası düzeltildi)
    cursor.executescript("""
        INSERT OR IGNORE INTO badges (code, name, description, emoji) VALUES 
        ('MIRASYEDI', 'MirasYedi', 'Aylık bütçe sınırını aşarak parayı adeta havaya saçtın!', '💸'),
        ('GURME', 'Gurme', 'Dışarıda yemek yeme rekoru kırdın, ev yemeği unutuldu.', '🍔'),
        ('SOSYETIK', 'Sosyetik', 'Tek kalemde devasa bir harcama patlattın, elitizm kokuyor!', '🛍️'),
        ('CIMRI', 'Varyemez', 'Harcamalarını o kadar kıstın ki parayı mezara götüreceksin sanırım.', '💰'),
        ('VIZYONER', 'Vizyoner', 'Finansal hedeflerine bütçe ayırarak geleceğini garanti altına aldın.', '🚀'),
        ('TEKNO_KOLIK', 'Teknoloji Bağımlısı', 'Elektronik ve gadget harcamaların cüzdanı fena hırpaladı.', '💻'),
        ('GEZGIN', 'Seyyah', 'Ulaşım ve seyahat harcamaların tavan yaptı, yerinde duramıyorsun.', '✈️'),
        ('KAHVE_BAZ', 'Kahve Bağımlısı', 'Kafelerde harcanan paralarla neredeyse bir kahve tarlası alabilirdin.', '☕'),
        ('GECE_KUSU', 'Gece Kuşu', 'Gece geç saatlerde yapılan harcamalar bütçeni sinsice kemirmiş.', '🌙'),
        ('ILK_ADIM', 'Bismillah', 'FinBuddy sistemine ilk harcamanı başarıyla kaydederek takibe başladın.', '🌱');
    """)
    
    # 3. 🛡️ DİNAMİK MİGRASYON KONTROLLERİ (Eski veritabanlarının patlamaması için)
    cursor.execute("PRAGMA table_info(users);")
    user_columns = [col[1] for col in cursor.fetchall()]
    
    if "password" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN password TEXT;")
        print("💾 Veritabanına 'password' sütunu başarıyla entegre edildi.")
        
    if "income" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN income REAL DEFAULT 0;")
        print("💵 Veritabanına 'income' sütunu başarıyla entegre edildi.")

    cursor.execute("PRAGMA table_info(goals);")
    goal_columns = [col[1] for col in cursor.fetchall()]
    
    if "priority" not in goal_columns:
        cursor.execute("ALTER TABLE goals ADD COLUMN priority TEXT DEFAULT 'medium';")
        print("🎯 Veritabanına 'priority' sütunu başarıyla entegre edildi.")

    # Arkadaşının ilk kodunda olan opsiyonel group_id migrasyonunu da koruyoruz
    try:
        cursor.execute("PRAGMA table_info(expenses);")
        expense_columns = [col[1] for col in cursor.fetchall()]
        if "group_id" not in expense_columns:
            cursor.execute("ALTER TABLE expenses ADD COLUMN group_id INTEGER;")
            print("👥 Harcamalar tablosuna 'group_id' sütunu başarıyla entegre edildi.")
    except sqlite3.OperationalError:
        pass
        
    conn.commit()
    conn.close()

# Uygulama her ayağa kalktığında şemayı bir kez zorunlu olarak hazırla ve mühürle
init_db()

@contextmanager
def get_db_session():
    """
    FastAPI endpoint'leri ve arka plan işleri için güvenli, 
    işi bitince otomatik kapanan (Thread-Safe Context Manager) DB oturumu sağlar.
    """
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_db():
    """
    FastAPI Bağımlılık Enjeksiyonu (Depends) için jeneratör fonksiyonu.
    """
    with get_db_session() as session:
        yield session