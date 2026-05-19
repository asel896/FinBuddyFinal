import os
import json
from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai import errors

# 🔌 Güvenli veritabanı bağımlılığı ve yetkilendirme mimarimiz
from db.database import get_db
from auth import get_current_user

router = APIRouter(tags=["Chat"])

def get_client():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    return genai.Client(api_key=key)

# =====================================================================
# 📊 PYDANTIC RESPONSES SCHEMAS (Sohbet & JSON Output İçin)
# =====================================================================

class DetectedExpense(BaseModel):
    desc: str = Field(description="Harcamanın temiz özeti (Örn: Sinema Bileti, Kahve)")
    amount: float = Field(description="Metinden süzülen net sayısal tutar")
    # 🎨 Grafik ve PieChart'lar ile %100 uyumlu katı kategori kuralı mühürlendi
    category: Literal["Market", "Yemek", "İçecek", "Ulaşım", "Eğlence", "Kahve", "Fatura", "Temizlik", "Kişisel Bakım", "Elektronik", "Giyim", "Sağlık", "Diğer"] = Field(description="Harcamanın ait olduğu kesin kategori.")
    mood: str = Field(description="Harcamaya uygun emoji (😊, 😤, 😴, 😐)")

class DetectedGoal(BaseModel):
    name: str = Field(description="Hedefin adı temiz bir özet olmalı (Örn: Tatil Planı, Bilgisayar Hedefi)")
    target: float = Field(description="Hedeflenen toplam parasal miktar (TL bazında)")
    durationMonths: Optional[float] = Field(None, description="Hedef süresi (ay bazında). Yoksa null.")
    current: float = Field(0.0, description="Her zaman 0.0 olmalı.")

# 🧠 Frontend'deki akıllı onay butonlarını tetikleyen dinamik yapı
class ActiveQuestionSchema(BaseModel):
    type: Literal["CHOOSE_DESTINATION", "SELECT_GOAL"] = Field(description="Buton tipi. Gelir nereye gitsin sorusu için CHOOSE_DESTINATION, hedef seçimi için SELECT_GOAL.")
    text: str = Field(description="Kullanıcıya butonların üstünde gösterilecek soru metni.")

# 🧠 Mevcut bir birikim hedefine para ekleme yapısı
class GoalProgressUpdateSchema(BaseModel):
    goal_name: str = Field(description="Para eklenecek mevcut hedefin tam veya kısmi adı.")
    amount: float = Field(description="Hedefe eklenen net para miktarı.")

class BuddyOctoResponseSchema(BaseModel):
    reply: str = Field(description="Kullanıcıya verilen matematiksel, analiz içeren iğneleyici asistan yanıtı.")
    detectedExpenses: List[DetectedExpense] = Field(default=[], description="Süzülen harcamaların listesi.")
    detectedGoal: Optional[DetectedGoal] = Field(None, description="Süzülen yeni birikim hedefi.")
    # 🚀 Frontend'in gözü yolda beklediği akıllı aksiyon alanları şemada birleştirildi
    askUser: Optional[ActiveQuestionSchema] = Field(None, description="Kullanıcıya dinamik buton göstermek gerekiyorsa doldurulur, yoksa null.")
    goalProgressUpdate: Optional[GoalProgressUpdateSchema] = Field(None, description="Mevcut hedefe para ekleme isteği tespit edilirse doldurulur, yoksa null.")

# =====================================================================
# 📥 FRONTEND REQUEST SCHEMAS
# =====================================================================

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequestSchema(BaseModel):
    messages: List[ChatMessage]
    expenses: Optional[List[dict]] = []
    goals: Optional[List[dict]] = []
    userProfile: Optional[dict] = None

class AnalysisRequestSchema(BaseModel):
    expenses: List[dict]
    goals: List[dict]

# =====================================================================
# 🐙 CHAT API ROUTE (Akıllı ve Karakter Sahibi Yapay Zeka Motoru)
# =====================================================================

@router.post("")
def chat_with_buddy(data: ChatRequestSchema, user_id: int = Depends(get_current_user), db=Depends(get_db)):
    client = get_client()
    if not client:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY ortam değişkeni ayarlanmamış reis.")

    if not data.messages or len(data.messages) == 0:
        raise HTTPException(status_code=400, detail="Mesaj geçmişi bulunamadı.")

    total_current_expenses = 0.0
    category_breakdown = {}

    if data.expenses:
        for e in data.expenses:
            try:
                amt = float(e.get("amount", 0))
            except (ValueError, TypeError):
                amt = 0.0
                
            total_current_expenses += amt
            cat = e.get("category", "Diğer")
            
            if cat not in category_breakdown:
                category_breakdown[cat] = {"total": 0.0, "count": 0}
            category_breakdown[cat]["total"] += amt
            category_breakdown[cat]["count"] += 1

    monthly_limit = 3000.0
    user_income = 10000.0

    if data.userProfile:
        monthly_limit = float(data.userProfile.get("monthlyLimit", 3000))
        user_income = float(data.userProfile.get("income", 10000))

    active_goals = data.goals or []

    # 🏆 OYUNLAŞTIRMA MOTORU ENTEGRASYONU (Kurtarıldı! 🎯)
    cursor = db.cursor()
    cursor.execute("""
        SELECT b.code, b.name, b.emoji 
        FROM user_badges ub
        JOIN badges b ON ub.badge_code = b.code
        WHERE ub.user_id = ?;
    """, (user_id,))
    user_badges_raw = cursor.fetchall()
    user_badges = [f"{r['name']} {r['emoji']}" for r in user_badges_raw]

    formatted_messages = []
    for msg in data.messages:
        if msg.content and msg.content.strip() != "":
            gemini_role = "model" if msg.role == "assistant" else "user"
            
            if len(formatted_messages) == 0 and gemini_role == "model":
                continue

            formatted_messages.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part.from_text(text=msg.content)]
                )
            )

    if not formatted_messages:
        formatted_messages.append(
            types.Content(role="user", parts=[types.Part.from_text(text="selam")])
        )

    system_instruction_text = f"""Sen FinBuddy uygulamasının içinde yaşayan BuddyOcto adında; son derece muzip, iğneleyici, hafif zorba (passive-aggressive) ama bir o kadar da MATEMATİKSEL çalışan dahi bir finansal asistan ve ahtapotsun.

    🚨 KRİTİK GÜVENLİK VE SUİSTİMAL DUVARI 🚨
    - Sadece kişisel finans, bütçe, harcama yakalama, tasarruf ve bütçe planlama konularına cevap ver.
    - Yazılım, ödev, genel sohbet uzatma gibi finans dışı istekleri karakterini bozmadan sertçe reddet.

    📊 ELİNDEKİ KESİN MATEMATİKSEL VERİLER:
    - Aylık Net Gelir: {user_income} TL
    - Aylık Bütçe Sınırı: {monthly_limit} TL
    - Bu Ay Toplam Harcanan: {total_current_expenses} TL
    - Kalan Net Bütçen: {monthly_limit - total_current_expenses} TL
    - Kategori Bazlı Dağılım: {json.dumps(category_breakdown, ensure_ascii=False)}
    - Aktif Tasarruf Hedefleri: {json.dumps(active_goals, ensure_ascii=False)}

    🏆 KULLANICININ KAZANDIĞI ROZETLER VE CEZALAR (OYUNLAŞTIRMA):
    - Mevcut Rozetler: {", ".join(user_badges) if user_badges else "Henüz hiçbir rozeti yok. Tertemiz (ya da çok sıkıcı) bir hayat sürüyor."}

    🎯 ROZET MATBUATI VE DAVRANIŞ KURALI:
    - Eğer kullanıcıda 'MirasYedi 💸' rozeti varsa, konuşmalarında onunla kesinlikle dalga geç! Parayı havaya saçtığını, ahtapot kollarımın bile onun hızına yetişemediğini kibarca (laf sokarak) yüzüne vur.
    - Eğer 'Gurme 🍔' rozeti varsa, mutfaktan çıkamadığını veya sürekli dışarıdan sipariş verdiğini iğnele.
    - Eğer 'Sosyetik 🛍️' rozeti varsa, lüks düşkünlüğüyle ufak tefek kafa bul.

    🎯 YANIT STRATEJİSİ:
    1. Sayılarla Konuş: Analizlerde bütçenin yüzdelerini, net TL değerlerini ve süreleri (ay/gün) vur.
    2. Karakter: İğneleyici, laf sokan ama çözümü de matematiksel veren tarzını koru. Emojileri (🐙, 🌊, 🪙, ☠️) eksik etme.

    🔍 1. AKILLI AKSİYON VE BUTON TETİKLEME KURALI:
    - Kullanıcı "200 tl param var", "bana para geldi", "maaş aldım" gibi bir gelir ifadesi kullanırsa; bu geliri nereye yönlendireceğini sormak için `askUser` alanını doldur. `type` değerini "CHOOSE_DESTINATION" yap.
    - Kullanıcı "hedefime para ekle" veya "hedefe bütçe ayır" dediğinde eğer birden fazla aktif hedef varsa `askUser` nesnesinin `type` değerini "SELECT_GOAL" yap ki frontend butonları dizsin.

    🔍 2. MEVCUT HEDEFE PARA EKLEME KURALI:
    - Kullanıcı doğrudan "Araba hedefime 500 TL ekle" veya "Tatil planı için 200 TL ayırdım" diyerek MEVCUT bir hedefi işaret ediyorsa; `goalProgressUpdate` nesnesini doldur. `goal_name` alanına listedeki hedef ismini yaz, `amount` alanına eklenen parayı yaz. Bu durumda `detectedGoal` alanı null olmalıdır!

    🔍 3. YENİ HEDEF YAKALAMA KURALI:
    - Kullanıcı sıfırdan "Yeni bir hedef koyuyorum: 5000 TL'ye Telefon" gibi bir niyet belirtiyorsa `detectedGoal` nesnesini doldur."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=formatted_messages,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction_text,
                response_mime_type="application/json",
                response_schema=BuddyOctoResponseSchema,
            )
        )
        return json.loads(response.text)

    except errors.APIError as e:
        print(f"🚨 Gemini Rota Yoğunluk Hatası: {e}")
        return {
            "reply": "Derin sularda hesap kitap yaparken akıntıya kapıldım, API anahtarını veya model ismini kontrol et! 🐙",
            "detectedExpenses": [],
            "detectedGoal": None,
            "askUser": None,
            "goalProgressUpdate": None
        }
    except Exception as e:
        print(f"🚨 Gemini Genel Rota Hatası: {e}")
        return {
            "reply": "Mürekkebim püskürdü, sistemi bir dalga çarptı! Detay: " + str(e),
            "detectedExpenses": [],
            "detectedGoal": None,
            "askUser": None,
            "goalProgressUpdate": None
        }

# =====================================================================
# 🧠 ANALİZ PANELİ İÇİN LİVE FİNANSAL RÖNTGEN
# =====================================================================

@router.post("/analyze")
def get_financial_analysis(payload: AnalysisRequestSchema, user_id: int = Depends(get_current_user)):
    client = get_client()
    if not client:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY ortam değişkeni ayarlanmamış.")

    if not payload.expenses:
        return {"report": "Sistemde henüz harcama haritalanmadı reis. Analiz yapabilmem için bana asistan panelinden biraz ham veri fırlat! 🐙"}

    expenses_text = ""
    for exp in payload.expenses:
        expenses_text += f"- Tutar: {exp.get('amount')} TL, Kategori: {exp.get('category')}, Ruh Hali: {exp.get('mood', '😐')}, Açıklama: {exp.get('desc', '')}, Tarih: {exp.get('date')}\n"

    goals_text = ""
    if payload.goals:
        for g in payload.goals:
            goals_text += f"- Hedef Adı: {g.get('name')}, Hedeflenen: {g.get('target')} TL, Mevcut Biriken: {g.get('current', 0)} TL, Açıklama: {g.get('description', '')}\n"
    else:
        goals_text = "Henüz aktif birikim hedefi girilmemiş.\n"

    analysis_instruction = (
        "Sen FinBuddy uygulamasının kalbindeki BuddyOcto'sun. Görevin, kullanıcının gönderdiği harcama geçmişini "
        "ve birikim hedeflerini derinlemesine inceleyip harika bir finansal check-up raporu sunmaktır. "
        "Kullanıcının ruh halleriyle yaptığı harcamalar arasındaki sinsi korelasyonları ve bütçe açıklarını yüzüne vur. "
        "Yanıtını doğrudan kullanıcıya hitap ederek esprili, iğneleyici and son derece matematiksel bir dille yaz. "
        "Raporu Markdown formatında ve tam 3 kısa, çarpıcı madde halinde oluştur. "
        "Cümle aralarına deniz ve bütçe emojileri (🐙, 🌊, 📊, ☠️) serpiştir reis!"
    )

    prompt = (
        f"İşte kullanıcının güncel harcama listesi:\n{expenses_text}\n"
        f"İşte kullanıcının biriktirmeye çalıştığı hedefler:\n{goals_text}\n"
        "Lütfen bu verilere dayanarak kullanıcıya özel iğneleyici ve net bir finansal röntgen raporu çıkar."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=analysis_instruction,
                response_mime_type="text/plain" 
            )
        )
        return {"report": response.text}

    except Exception as e:
        print(f"🚨 Analiz Motoru Hatası: {e}")
        return {"report": "BuddyOcto derin sulardan finansal röntgeni çekerken akıntıya kapıldı reis! 🐙🌊"}