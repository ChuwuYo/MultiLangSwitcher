// 共享的语言选项列表
const LANGUAGE_OPTIONS = [
  // 中文圈
  { value: "zh-CN", label: "简体中文 (zh-CN)" }, // 中国大陆、新加坡
  { value: "zh-HK", label: "繁体中文 (香港) (zh-HK)" }, // 中国香港特别行政区
  { value: "zh-TW", label: "繁体中文 (台湾) (zh-TW)" }, // 中国台湾地区

  // 英语主流变体
  { value: "en-US", label: "English (US) (en-US)" }, // 美国
  { value: "en-GB", label: "English (UK) (en-GB)" }, // 英国
  { value: "en-AU", label: "English (Australia) (en-AU)" }, // 澳大利亚
  { value: "en-IE", label: "English (Ireland) (en-IE)" }, // 爱尔兰
  { value: "en-NZ", label: "English (New Zealand) (en-NZ)" }, // 新西兰
  { value: "en-CA", label: "English (Canada) (en-CA)" }, // 加拿大
  { value: "en-IN", label: "English (India) (en-IN)" }, // 印度
  { value: "en-SG", label: "English (Singapore) (en-SG)" }, // 新加坡

  // 西班牙语
  { value: "es-ES", label: "Español (Spain) (es-ES)" }, // 西班牙
  { value: "es-AR", label: "Español (Argentina) (es-AR)" }, // 阿根廷
  { value: "es-MX", label: "Español (México) (es-MX)" }, // 墨西哥

  // 法语
  { value: "fr-FR", label: "Français (France) (fr-FR)" }, // 法国
  { value: "fr-CA", label: "Français (Canada) (fr-CA)" }, // 加拿大魁北克
  { value: "fr-BE", label: "Français (Belgique) (fr-BE)" }, // 比利时

  // 德语
  { value: "de-DE", label: "Deutsch (Germany) (de-DE)" }, // 德国
  { value: "de-AT", label: "Deutsch (Österreich) (de-AT)" }, // 奥地利
  { value: "de-CH", label: "Deutsch (Schweiz) (de-CH)" }, // 瑞士

  // 亚洲高频语种
  { value: "ja", label: "日本語 (ja)" }, // 日本
  { value: "ko", label: "한국어 (ko)" }, // 韩国
  { value: "ms", label: "Bahasa Melayu (ms)" }, // 马来西亚
  { value: "id", label: "Bahasa Indonesia (id)" }, // 印度尼西亚
  { value: "vi", label: "Tiếng Việt (vi)" }, // 越南
  { value: "th", label: "ไทย (th)" }, // 泰国
  { value: "tl", label: "Filipino (tl)" }, // 菲律宾

  // 葡萄牙语
  { value: "pt-PT", label: "Português (Portugal) (pt-PT)" }, // 葡萄牙
  { value: "pt-BR", label: "Português (Brasil) (pt-BR)" }, // 巴西

  // 俄语及东欧高频语种
  { value: "ru", label: "Русский (ru)" }, // 俄罗斯
  { value: "uk", label: "Українська (uk)" }, // 乌克兰
  { value: "pl", label: "Polski (pl)" }, // 波兰
  { value: "ro", label: "Română (ro)" }, // 罗马尼亚
  { value: "hu", label: "Magyar (hu)" }, // 匈牙利
  { value: "cs", label: "Čeština (cs)" }, // 捷克
  { value: "el", label: "Ελληνικά (el)" }, // 希腊

  // 北欧
  { value: "sv", label: "Svenska (sv)" }, // 瑞典
  { value: "fi", label: "Suomi (fi)" }, // 芬兰
  { value: "no", label: "Norsk (no)" }, // 挪威
  { value: "da", label: "Dansk (da)" }, // 丹麦

  // 中东和西亚
  { value: "tr", label: "Türkçe (tr)" }, // 土耳其
  { value: "ar", label: "العربية (ar)" }, // 阿拉伯国家（沙特、阿联酋等）
  { value: "he", label: "עברית (he)" }, // 以色列

  // 印度次大陆
  { value: "hi", label: "हिन्दी (hi)" }, // 印度北部
  { value: "ta", label: "தமிழ் (ta)" }, // 印度南部、斯里兰卡
  { value: "bn", label: "বাংলা (bn)" }, // 孟加拉国、印度东部

  // 波罗的海
  { value: "lt", label: "Lietuvių (lt)" }, // 立陶宛

  // 较高频的小语种
  { value: "nl", label: "Nederlands (nl)" }, // 荷兰、比利时
  { value: "sl", label: "Slovenščina (sl)" }, // 斯洛文尼亚
  { value: "ca", label: "Català (ca)" }, // 西班牙加泰罗尼亚地区
  { value: "sr", label: "Српски (sr)" }, // 塞尔维亚
  { value: "hr", label: "Hrvatski (hr)" }, // 克罗地亚
  { value: "et", label: "Eesti (et)" }, // 爱沙尼亚
  { value: "lv", label: "Latviešu (lv)" }, // 拉脱维亚
  { value: "sk", label: "Slovenčina (sk)" }, // 斯洛伐克
  { value: "fa", label: "فارسی (fa)" } // 伊朗
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