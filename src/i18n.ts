import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ar: {
    translation: {
      appName: "M7 AI",
      tagline: "المساعد الذكي المتقدم",
      chat: "المحادثة",
      newChat: "محادثة جديدة",
      conversations: "المحادثات",
      memory: "الذاكرة",
      profile: "الملف الشخصي",
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
      logout: "تسجيل الخروج",
      guestMode: "الدخول كضيف",
      startChatting: "ابدأ المحادثة الآن",
      home: "الصفحة الرئيسية",
      send: "إرسال",
      searchPlaceholder: "بحث في المحادثات...",
      inputPlaceholder: "اكتب رسالتك هنا...",
      listening: "جارٍ الاستماع... تحدث الآن",
      speaking: "M7 يتحدث...",
      disclaimer: "قد يخطئ M7 AI أحياناً. يُرجى التحقق من المعلومات المهمة."
    }
  },
  en: {
    translation: {
      appName: "M7 AI",
      tagline: "Advanced AI Assistant",
      chat: "Chat",
      newChat: "New Chat",
      conversations: "Conversations",
      memory: "Memory",
      profile: "Profile",
      login: "Sign In",
      signup: "Sign Up",
      logout: "Sign Out",
      guestMode: "Continue as Guest",
      startChatting: "Start Chatting Now",
      home: "Home",
      send: "Send",
      searchPlaceholder: "Search conversations...",
      inputPlaceholder: "Type your message here...",
      listening: "Listening... Speak now",
      speaking: "M7 is speaking...",
      disclaimer: "M7 AI may make mistakes. Verify important info."
    }
  }
};

const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i18nextLng') || localStorage.getItem('m7_lang');
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
  }
  return 'en';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

if (typeof window !== 'undefined') {
  document.documentElement.lang = initialLang;
  document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
  if (!localStorage.getItem('i18nextLng') && !localStorage.getItem('m7_lang')) {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('m7_lang', 'en');
  }
}

export default i18n;
