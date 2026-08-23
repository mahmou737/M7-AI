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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
