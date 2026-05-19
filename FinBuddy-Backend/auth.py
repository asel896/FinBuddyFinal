import jwt
from datetime import datetime, timedelta, timezone # 🚀 DÜZELTME: timezone eklendi
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# 🔐 İleride .env'den okumak için hazır:
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "SUPER_SECRET_BUDDYOCTO_KEY_98765")
ALGORITHM = "HS256"

security = HTTPBearer()

def create_access_token(user_id: int) -> str:
    """
    Kullanıcı giriş yaptığında ona özel 7 günlük bir token üretir.
    """
    payload = {
        "sub": str(user_id),
        # 🚀 DÜZELTME: timezone.utc ile hatasız zaman yönetimi
        "exp": datetime.now(timezone.utc) + timedelta(days=7) 
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> int:
    """
    Token'ı doğrular ve gerçek user_id'yi döner.
    """
    token = credentials.credentials
    if not token or token in ["undefined", "null"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token bulunamadı, lütfen tekrar giriş yapın."
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token içeriği geçersiz."
            )
        
        return int(user_id)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Oturum süresi dolmuş, lütfen tekrar giriş yapın."
        )
    except Exception as e:
        print(f"🚨 JWT Decode Hatası: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik doğrulanamadı, geçersiz token."
        )