import os
import json
import base64
from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai import errors
from auth import get_current_user

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️ 'python-dotenv' paketi eksik. .env verileri okunamazsa 'pip install python-dotenv' yap .")

router = APIRouter(tags=["Receipt", "Expenses"])

def get_client():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="GEMINI_API_KEY sistemde ayarlanmamış."
        )
    return genai.Client(api_key=key)

# 🎯 ENUM DEĞERLERİ
VALID_CATEGORIES = Literal[
    "Market", "Yemek", "İçecek", "Temizlik", "Kişisel Bakım", 
    "Elektronik", "Giyim", "Fatura", "Ulaşım", "Eğlence", "Sağlık", "Diğer"
]

class ReceiptItemSchema(BaseModel):
    desc: str = Field(description="Ürün veya hizmetin adı/açıklaması.")
    amount: float = Field(description="Ürünün fiyatı (Örn: 85.50 veya 120.00). Kuruşları kesinlikle yuvarlama.")
    category: VALID_CATEGORIES = Field(description="Ürünün dahil olduğu en mantıklı kategori.")

class ReceiptResponseSchema(BaseModel):
    merchant: str = Field(description="Fişin ait olduğu mağaza veya işletme adı (Örn: BIM, Migros, Starbucks).")
    # 🎯 DÜZELTME: Structured Outputs şemalarında null olasılığı için 'str | None' standardı getirildi
    date: str | None = Field(default=None, description="Fişin üzerindeki işlem tarihi. YYYY-MM-DD formatında olmalı. Okunmuyorsa null dön.")
    items: List[ReceiptItemSchema] = Field(description="Fişte yer alan tüm harcama kalemleri.")

class ReceiptRequestSchema(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = "image/jpeg"

# =====================================================================
# 🚀 RECEIPT SCAN API ROUTE
# =====================================================================

@router.post("")
def scan_receipt(data: ReceiptRequestSchema, user_id: int = Depends(get_current_user)):
    if not data.imageBase64:
        raise HTTPException(status_code=400, detail="Görsel verisi (imageBase64) zorunludur.")

    # 🛑 Geliştirme ortamında anahtar yoksa sahte veri dönen emniyet supabı
    if not os.getenv("GEMINI_API_KEY"):
        return {
            "success": True,
            "data": {
                "merchant": "MOCK MARKET A.Ş.",
                "date": "2026-05-19",
                "items": [
                    {"desc": "Örnek Kahve (Mock)", "amount": 85.0, "category": "İçecek"},
                    {"desc": "Örnek Çikolata (Mock)", "amount": 35.5, "category": "Market"}
                ]
            }
        }

    raw_base64 = data.imageBase64
    if "," in raw_base64:
        raw_base64 = raw_base64.split(",")[1]

    # 📷 GÖRSEL VERİSİNİ SAF BYTE HALİNE GETİRME
    try:
        decoded_bytes = base64.b64decode(raw_base64)
        image_part = types.Part.from_bytes(
            data=decoded_bytes,
            mime_type=data.mimeType or "image/jpeg"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Görsel base64 formatı çözülemedi: {str(e)}")

    # 🎯 OPTİMİZASYON: Prompt içerisindeki yönlendirmeler enum kurallarına göre zırhlandırıldı
    prompt = """
        Sana yüklenen bu alışveriş fişi veya fatura görselini dikkatlice analiz et.
        Fişteki dükkan/mağaza adını ve fişin kesildiği tarihi bul.
        Ardından fişteki her bir ürünü/kalemi, fiyatını ve ona en uygun kategoriyi tespit et.
        
        KRİTİK REGÜLASYONLAR:
        1. Kategori (category) alanına yazacağın string değer, sana verilen şemadaki listede bulunan kelimelerle BİREBİR (büyük-küçük harf dahil) aynı olmak zorundadır. 'market' yerine 'Market', 'yemek' yerine 'Yemek' yazmalısın. Asla yeni kategori uydurma.
        2. Fiyatları float olarak doğrudan 'amount' alanına yaz (Örn: 14.50 -> 14.5). Kuruşları tam sayıya yuvarlama, aynen koru.
        3. Tarihi mutlaka YYYY-MM-DD formatına dönüştürerek 'date' alanına yaz (Örn: 29.05.2026 -> 2026-05-29). Eğer fişte tarih basılmamışsa veya tamamen okunmaz haldeyse null bırak.
    """

    try:
        client = get_client()
        # Projenin hız ve kota dengesi için gemini-2.5-flash seçimi tam isabet!
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, image_part],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReceiptResponseSchema,
                temperature=0.1  # Yaratıcılığı kısıp tutarlılığı zirveye çekiyoruz
            ),
        )

        if not response.text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Yapay zeka modelinden boş yanıt döndü."
            )

        result_json = json.loads(response.text)
        return {
            "success": True,
            "data": result_json
        }

    except errors.APIError as e:
        print(f"🚨 Gemini API Hatası Detayı: {e}")
        
        if e.code == 429 or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Google Yapay Zeka kotası anlık olarak doldu. Lütfen 1 dakika sonra tekrar deneyin ."
            )
            
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, 
            detail=f"Yapay zeka sağlayıcısından geçersiz yanıt alındı: {str(e)}"
        )
        
    except json.JSONDecodeError as je:
        print(f"🚨 JSON Çözümleme Hatası: {je} - Gelen Metin: {response.text}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Modelin ürettiği veri, beklenen JSON formatına dönüştürülemedi."
        )
        
    except Exception as e:
        print(f"🚨 Fiş Analiz Genel Hatası: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Fiş işlenirken sunucu içi hata: {str(e)}"
        )