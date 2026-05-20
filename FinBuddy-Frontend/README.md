🤖 FinBuddy: Kişisel Finansal Yol Arkadaşı (Frontend)
FinBuddy, harcamaları sadece rakam olarak değil, arkasındaki duygularla birlikte analiz eden, kullanıcıyla sohbet edebilen ve finansal hedeflere ulaştıran yeni nesil bir "Psikolojik Finans" asistanıdır.

Bu döküman, projenin frontend mimarisini, kullanıcı deneyimi (UX) hedeflerini ve geliştirme sürecindeki görev dağılımını kapsar.

🌟 Frontend Vizyonu
"Finansal stres, yanlış kararların değil, farkındalık eksikliğinin sonucudur." FinBuddy'nin arayüzü, bu farkındalığı en basit ve samimi şekilde kullanıcıya sunmayı amaçlar.

🎯 Neyi Hedefliyoruz?
Karmaşıklığı Gidermek: Banka uygulamalarındaki o soğuk ve karmaşık tablolar yerine, anlaşılır grafikler ve rehberlik eden bir asistan.

Duygusal Bağ: Harcama anındaki ruh halini (mutlu, üzgün, stresli) veriye dönüştürmek.

Motivasyon: Kullanıcıyı tasarrufa teşvik eden "Buddy" (Arkadaş) bildirimleri ve ilerleme barları.

🏗️ Teknik Yapılandırma
Framework: React.js / Vite (Hızlı ve modern geliştirme ortamı).

Styling: Tailwind CSS (Modern ve responsive tasarım).

State Management: Redux Toolkit veya Context API (Anlık veri akışı için).

Visuals: Recharts veya Chart.js (Duygu-harcama korelasyonu analizi için).

Animations: Framer Motion (Akıcı geçişler ve interaktif widget'lar).

🚀 Uygulanacak "Vurucu" Özellikler
1. BuddyChat (AI Sohbet Arayüzü)
Kullanıcının "Bu ay neden çok harcadım?" sorusuna sadece metinle değil, anlık oluşturulan grafiklerle cevap veren akıllı mesajlaşma ekranı.

2. MoodCheck (Duygu Odaklı Giriş)
Harcama girilirken sadece miktar değil, o anki ruh halinin (Emoji tabanlı) seçildiği interaktif form yapısı.

3. Hedef Takip & Motivasyon (BuddyGoals)
Kullanıcının hayallerini (örn: iPhone, Tatil) görselleştiren ve harcama alışkanlıklarına göre "Hedefine şu kadar yaklaştın/uzaklaştın" diyen dinamik barlar.

4. Akıllı Fiş Okuma UI (OCR Dashboard)
Kullanıcının yüklediği fiş fotoğraflarının işlenme sürecini gösteren "Skeleton Screens" ve onay mekanizması.

📂 Dosya Yapısı (Frontend Architecture)
Plaintext
/src
  /components     # Atomik bileşenler (Buton, Input, Modal)
  /features       # Ana modüller (Chatbot, Dashboard, Analytics)
  /hooks          # API entegrasyonu ve logic kısımları
  /pages          # Sayfa yapıları (Giriş, Ana Sayfa, Profil)
  /styles         # Global CSS ve Tailwind konfigürasyonu
  /assets         # Logo, ikonlar ve illüstrasyonlar
📡 Backend Entegrasyon Planı (API Beklentileri)
Backend tarafıyla aşağıdaki veri modelleri üzerinden haberleşeceğiz:

GET /api/dashboard: Kullanıcının genel finansal özeti ve duygu analizi.

POST /api/spend: Miktar, kategori ve ruh hali (mood) içeren harcama kaydı.

POST /api/chat: AI asistanına gönderilen doğal dil mesajları.

🛠️ Kurulum ve Başlatma
Repoyu klonlayın ve ilgili branch'e geçin.

Bağımlılıkları yükleyin:

Bash
npm install
Uygulamayı yerel ortamda başlatın:

Bash
npm run dev
📝 Ekip Notu
FinBuddy'nin gücü, backend'deki yapay zeka ile frontend'deki kullanıcı dostu tasarımın uyumundan gelir. Tasarımda "Kullanıcıyı yargılayan değil, ona yol gösteren bir arkadaş" tonunu koruyacağız.

Yılmaz - Frontend Developer

FinBuddy: Harca, Anla, Biriktir!