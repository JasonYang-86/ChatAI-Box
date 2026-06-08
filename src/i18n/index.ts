import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const savedLang = localStorage.getItem('chatai-language');
const lang = savedLang === 'en-US' ? 'en-US' : 'zh-CN';

// 确保非英文时清除旧值，使用中文
if (savedLang !== 'en-US' && savedLang !== null) {
  localStorage.removeItem('chatai-language');
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: lang,
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
