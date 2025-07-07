// 共享的语言选项列表
const LANGUAGE_OPTIONS = [
  // 中文选项 (置顶)
  { value: "zh-CN", label: "简体中文 (zh-CN)" }, // 中国
  { value: "zh-HK", label: "繁体中文 (香港) (zh-HK)" }, // 中国香港特别行政区
  { value: "zh-TW", label: "繁体中文 (zh-TW)" }, // 中国台湾地区

  // 英文选项 (置顶)
  { value: "en-US", label: "English (US) (en-US)" }, // 美国
  { value: "en-GB", label: "English (UK) (en-GB)" }, // 英国
  { value: "en-AU", label: "English (Australia) (en-AU)" }, // 澳大利亚
  { value: "en-CA", label: "English (Canada) (en-CA)" }, // 加拿大
  { value: "en-NZ", label: "English (New Zealand) (en-NZ)" }, // 新西兰

  // --- 其他语言 (按常用度排序) ---

  // Tier 1: 全球主要语言
  { value: "ja", label: "日本語 (ja)" }, // 日本
  { value: "ko", label: "한국어 (ko)" }, // 韩国
  { value: "es", label: "Español (es)" }, // 西班牙
  { value: "es-AR", label: "Español (Argentina) (es-AR)" }, // 阿根廷
  { value: "fr", label: "Français (fr)" }, // 法国
  { value: "fr-CA", label: "Français (Canada) (fr-CA)" }, // 加拿大
  { value: "de", label: "Deutsch (de)" }, // 德国
  { value: "de-AT", label: "Deutsch (Österreich) (de-AT)" }, // 奥地利
  { value: "de-CH", label: "Deutsch (Schweiz) (de-CH)" }, // 瑞士
  { value: "pt-BR", label: "Português (Brasil) (pt-BR)" }, // 巴西
  { value: "pt-PT", label: "Português (Portugal) (pt-PT)" }, // 葡萄牙
  { value: "ru", label: "Русский (ru)" }, // 俄罗斯
  { value: "ar", label: "العربية (ar)" }, // 阿拉伯联合酋长国等
  { value: "hi", label: "हिन्दी (hi)" }, // 印度

  // Tier 2: 重要的经济和区域语言
  { value: "id", label: "Bahasa Indonesia (id)" }, // 印度尼西亚
  { value: "it", label: "Italiano (it)" }, // 意大利
  { value: "tr", label: "Türkçe (tr)" }, // 土耳其
  { value: "nl", label: "Nederlands (nl)" }, // 荷兰
  { value: "nl-BE", label: "Nederlands (België) (nl-BE)" }, // 比利时
  { value: "vi", label: "Tiếng Việt (vi)" }, // 越南
  { value: "pl", label: "Polski (pl)" }, // 波兰
  { value: "th", label: "ไทย (th)" }, // 泰国
  { value: "sv", label: "Svenska (sv)" }, // 瑞典
  { value: "fa", label: "فارسی (fa)" }, // 伊朗
  { value: "bn", label: "বাংলা (bn)" }, // 孟加拉国

  // Tier 3: 其他国家和地区的重要语言
  { value: "uk", label: "Українська (uk)" }, // 乌克兰
  { value: "ro", label: "Română (ro)" }, // 罗马尼亚
  { value: "hu", label: "Magyar (hu)" }, // 匈牙利
  { value: "cs", label: "Čeština (cs)" }, // 捷克
  { value: "el", label: "Ελληνικά (el)" }, // 希腊
  { value: "fi", label: "Suomi (fi)" }, // 芬兰
  { value: "da", label: "Dansk (da)" }, // 丹麦
  { value: "no", label: "Norsk (no)" }, // 挪威
  { value: "he", label: "עברית (he)" }, // 以色列
  { value: "ms", label: "Bahasa Melayu (ms)" }, // 马来西亚
  { value: "tl", label: "Filipino (tl)" }, // 菲律宾
  { value: "ur", label: "اردو (ur)" }, // 巴基斯坦

  // Tier 4: 主要的印度次大陆及其他区域语言
  { value: "mr", label: "मराठी (mr)" }, // 印度
  { value: "te", label: "తెలుగు (te)" }, // 印度
  { value: "ta", label: "தமிழ் (ta)" }, // 印度
  { value: "pa", label: "ਪੰਜਾਬੀ (pa)" }, // 印度
  { value: "gu", label: "ગુજરાતી (gu)" }, // 印度
  { value: "kn", label: "ಕನ್ನಡ (kn)" }, // 印度
  { value: "ml", label: "മലയാളം (ml)" }, // 印度
  { value: "jv", label: "Basa Jawa (jv)" }, // 印度尼西亚

  // Tier 5: 其他欧洲及中亚语言
  { value: "sr", label: "Српски (sr)" }, // 塞尔维亚
  { value: "hr", label: "Hrvatski (hr)" }, // 克罗地亚
  { value: "bg", label: "Български (bg)" }, // 保加利亚
  { value: "sk", label: "Slovenčina (sk)" }, // 斯洛伐克
  { value: "sl", label: "Slovenščina (sl)" }, // 斯洛文尼亚
  { value: "bs", label: "Bosanski (bs)" }, // 波斯尼亚和黑塞哥维那
  { value: "lt", label: "Lietuvių (lt)" }, // 立陶宛
  { value: "lv", label: "Latviešu (lv)" }, // 拉脱维亚
  { value: "et", label: "Eesti (et)" }, // 爱沙尼亚
  { value: "uz", label: "O'zbek (uz)" }, // 乌兹别克斯坦
  { value: "kk", label: "Қазақша (kk)" }, // 哈萨克斯坦
  { value: "az", label: "Azərbaycan (az)" }, // 阿塞拜疆
  { value: "be", label: "Беларуская (be)" }, // 白俄罗斯
  { value: "ca", label: "Català (ca)" }, // 西班牙
  { value: "ka", label: "ქართული (ka)" }, // 格鲁吉亚
  { value: "hy", label: "Հայերեն (hy)" }, // 亚美尼亚
  { value: "ky", label: "Кыргызча (ky)" }, // 吉尔吉斯斯坦
  { value: "mn", label: "Монгол (mn)" }, // 蒙古
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