// 共享的语言选项列表
const LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "简体中文 (zh-CN)" },
  { value: "zh-TW", label: "繁体中文 (zh-TW)" },
  { value: "zh-HK", label: "繁体中文 (香港) (zh-HK)" },
  { value: "en-US", label: "English (US) (en-US)" },
  { value: "en-GB", label: "English (UK) (en-GB)" },
  { value: "en-AU", label: "English (Australia) (en-AU)" },
  { value: "en-CA", label: "English (Canada) (en-CA)" },
  { value: "ja", label: "日本語 (ja)" },
  { value: "ko", label: "한국어 (ko)" },
  { value: "fr", label: "Français (fr)" },
  { value: "fr-CA", label: "Français (Canada) (fr-CA)" },
  { value: "de", label: "Deutsch (de)" },
  { value: "de-AT", label: "Deutsch (Österreich) (de-AT)" },
  { value: "de-CH", label: "Deutsch (Schweiz) (de-CH)" },
  { value: "es", label: "Español (es)" },
  { value: "es-MX", label: "Español (México) (es-MX)" },
  { value: "es-AR", label: "Español (Argentina) (es-AR)" },
  { value: "ru", label: "Русский (ru)" },
  { value: "pt-BR", label: "Português (Brasil) (pt-BR)" },
  { value: "pt-PT", label: "Português (Portugal) (pt-PT)" },
  { value: "it", label: "Italiano (it)" },
  { value: "ar", label: "العربية (ar)" },
  { value: "hi", label: "हिन्दी (hi)" },
  { value: "bn", label: "বাংলা (bn)" },
  { value: "ur", label: "اردو (ur)" },
  { value: "fa", label: "فارسی (fa)" },
  { value: "tr", label: "Türkçe (tr)" },
  { value: "nl", label: "Nederlands (nl)" },
  { value: "nl-BE", label: "Nederlands (België) (nl-BE)" },
  { value: "pl", label: "Polski (pl)" },
  { value: "sv", label: "Svenska (sv)" },
  { value: "fi", label: "Suomi (fi)" },
  { value: "da", label: "Dansk (da)" },
  { value: "no", label: "Norsk (no)" },
  { value: "cs", label: "Čeština (cs)" },
  { value: "sk", label: "Slovenčina (sk)" },
  { value: "hu", label: "Magyar (hu)" },
  { value: "ro", label: "Română (ro)" },
  { value: "bg", label: "Български (bg)" },
  { value: "hr", label: "Hrvatski (hr)" },
  { value: "sr", label: "Српски (sr)" },
  { value: "sl", label: "Slovenščina (sl)" },
  { value: "et", label: "Eesti (et)" },
  { value: "lv", label: "Latviešu (lv)" },
  { value: "lt", label: "Lietuvių (lt)" },
  { value: "el", label: "Ελληνικά (el)" },
  { value: "he", label: "עברית (he)" },
  { value: "th", label: "ไทย (th)" },
  { value: "vi", label: "Tiếng Việt (vi)" },
  { value: "id", label: "Bahasa Indonesia (id)" },
  { value: "ms", label: "Bahasa Melayu (ms)" },
  { value: "tl", label: "Filipino (tl)" },
  { value: "uk", label: "Українська (uk)" },
  { value: "be", label: "Беларуская (be)" },
  { value: "ka", label: "ქართული (ka)" },
  { value: "hy", label: "Հայերեն (hy)" },
  { value: "az", label: "Azərbaycan (az)" },
  { value: "kk", label: "Қазақша (kk)" },
  { value: "ky", label: "Кыргызча (ky)" },
  { value: "uz", label: "O'zbek (uz)" },
  { value: "mn", label: "Монгол (mn)" },
  { value: "ta", label: "தமிழ் (ta)" }
];

// 生成语言选项HTML
function generateLanguageOptions() {
  return LANGUAGE_OPTIONS.map(option => 
    `<option value="${option.value}">${option.label}</option>`
  ).join('');
}

// 填充语言选择框
function populateLanguageSelect(selectElement) {
  if (selectElement) {
    selectElement.innerHTML = generateLanguageOptions();
  }
}