import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  ar: {
    translation: {
      search_placeholder: "بحث في المحادثات...",
      no_conversations: "لا توجد محادثات سابقة",
      new_chat: "محادثة جديدة",
    }
  },
  en: {
    translation: {
      search_placeholder: "Search conversations...",
      no_conversations: "No previous conversations",
      new_chat: "New Chat",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
