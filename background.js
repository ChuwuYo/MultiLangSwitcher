// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 定义规则ID
const RULE_ID = 1;
const DEFAULT_LANGUAGE = 'en-US';

// 函数：发送后台日志消息，用于调试和重要信息输出
function sendBackgroundLog(message, logType = 'info') {
  // 在控制台输出重要信息
  if (logType === 'error' || logType === 'warning' || logType === 'info' || logType === 'success') {
    console.log(`[Background ${logType.toUpperCase()}] ${message}`);
  }

  // 尝试发送到调试页面
  chrome.runtime.sendMessage({
    type: 'DEBUG_LOG', // 消息类型，用于在调试页面区分
    message: `[Background] ${message}`,
    logType: logType // 日志级别 (info, warning, error, success)
  }).catch(error => {
    // 捕获错误避免控制台报错
    // console.warn("Could not send debug log from background:", error);
  });
}

// 规则缓存，避免重复获取已知规则
let rulesCache = null;
let lastAppliedLanguage = null;
let autoSwitchEnabled = false; // 新增：自动切换状态

// 域名到语言的映射规则（可以自己加）
const domainLanguageRules = {
  // 中国地区二级域名
  'com.cn': 'zh-CN',  // 中国商业机构
  'org.cn': 'zh-CN',  // 中国组织机构
  'net.cn': 'zh-CN',  // 中国网络服务机构
  'gov.cn': 'zh-CN',  // 中国政府机构
  'edu.cn': 'zh-CN',  // 中国教育机构
  'ac.cn': 'zh-CN',   // 中国科研机构
  'mil.cn': 'zh-CN',  // 中国军事机构
  // 美国地区二级域名
  'com.us': 'en-US',  // 美国商业机构
  'org.us': 'en-US',  // 美国组织机构
  'gov.us': 'en-US',  // 美国政府机构
  'edu.us': 'en-US',  // 美国教育机构
  'ac.us': 'en-US',   // 美国教育机构
  // 日本地区二级域名
  'co.jp': 'ja',      // 日本商业机构
  'ac.jp': 'ja',      // 日本教育机构
  'go.jp': 'ja',      // 日本政府机构
  'or.jp': 'ja',      // 日本组织机构
  'ne.jp': 'ja',      // 日本网络服务提供商
  // 韩国地区二级域名
  'co.kr': 'ko',      // 韩国商业机构
  'go.kr': 'ko',      // 韩国政府机构
  'ac.kr': 'ko',      // 韩国教育机构
  'or.kr': 'ko',      // 韩国组织机构
  // 新加坡地区二级域名
  'com.sg': 'en',     // 新加坡商业机构
  'org.sg': 'en',     // 新加坡组织机构
  'gov.sg': 'en',     // 新加坡政府机构
  'edu.sg': 'en',     // 新加坡教育机构
  // 印度地区二级域名
  'co.id': 'id',      // 印度商业机构
  'ac.id': 'id',      // 印度教育机构
  'go.id': 'id',      // 印度政府机构
  'or.id': 'id',      // 印度组织机构
  // 台湾地区二级域名
  'com.tw': 'zh-TW',  // 台湾商业机构
  'org.tw': 'zh-TW',  // 台湾组织机构
  'gov.tw': 'zh-TW',  // 台湾政府机构
  'edu.tw': 'zh-TW',  // 台湾教育机构
  // 马来西亚地区二级域名
  'com.my': 'ms',     // 马来西亚商业机构
  'org.my': 'ms',     // 马来西亚组织机构
  'gov.my': 'ms',     // 马来西亚政府机构
  'edu.my': 'ms',     // 马来西亚教育机构
  // 香港地区二级域名
  'com.hk': 'zh-HK',  // 香港商业机构
  'org.hk': 'zh-HK',  // 香港组织机构
  'gov.hk': 'zh-HK',  // 香港政府机构
  'edu.hk': 'zh-HK',  // 香港教育机构
  // 英国地区二级域名
  'co.uk': 'en-GB',   // 英国商业机构
  'org.uk': 'en-GB',  // 英国组织机构
  'gov.uk': 'en-GB',  // 英国政府机构
  'ac.uk': 'en-GB',   // 英国教育机构
  // 法国地区二级域名
  'com.fr': 'fr',     // 法国商业机构
  'org.fr': 'fr',     // 法国组织机构
  'gov.fr': 'fr',     // 法国政府机构
  'edu.fr': 'fr',     // 法国教育机构
  // 德国地区二级域名
  'com.de': 'de',     // 德国商业机构 
  'org.de': 'de',     // 德国组织机构
  'gov.de': 'de',     // 德国政府机构
  'edu.de': 'de',     // 德国教育机构
  // 意大利地区二级域名
  'com.it': 'it',     // 意大利商业机构
  'org.it': 'it',     // 意大利组织机构
  'gov.it': 'it',     // 意大利政府机构
  'ac.it': 'it',      // 意大利教育机构
  // 西班牙地区二级域名
  'com.es': 'es',     // 西班牙商业机构
  'org.es': 'es',     // 西班牙组织机构
  'gov.es': 'es',     // 西班牙政府机构
  'ac.es': 'es',      // 西班牙教育机构
  // 俄罗斯地区二级域名
  'com.ru': 'ru',     // 俄罗斯商业机构
  'org.ru': 'ru',     // 俄罗斯组织机构
  'gov.ru': 'ru',     // 俄罗斯政府机构
  'edu.ru': 'ru',     // 俄罗斯教育机构
  // 中东地区二级域名
  'com.ae': 'ar',     // 商业机构
  'org.ae': 'ar',     // 组织机构
  'gov.ae': 'ar',     // 政府机构
  'edu.ae': 'ar',     // 教育机构
  'com.sa': 'ar',     // 商业机构
  'org.sa': 'ar',     // 组织机构
  'gov.sa': 'ar',     // 政府机构
  'edu.sa': 'ar',     // 教育机构

  // 亚洲 (Asia)
  'af': 'fa',      // 阿富汗 (Afghanistan) - Dari Persian
  'am': 'hy',      // 亚美尼亚 (Armenia) - Armenian
  'az': 'az',      // 阿塞拜疆 (Azerbaijan) - Azerbaijani
  'bh': 'ar',      // 巴林 (Bahrain) - Arabic
  'bd': 'bn',      // 孟加拉国 (Bangladesh) - Bengali
  'bt': 'dz',      // 不丹 (Bhutan) - Dzongkha
  'bn': 'ms',      // 文莱 (Brunei) - Malay
  'kh': 'km',      // 柬埔寨 (Cambodia) - Khmer
  'cn': 'zh-CN',   // 中国大陆 (China) - Simplified Chinese
  'tw': 'zh-TW',   // 中国台湾 (Taiwan) - Traditional Chinese
  'hk': 'zh-HK',   // 中国香港 (Hong Kong) - Traditional Chinese (Cantonese is widely spoken)
  'cy': 'el',      // 塞浦路斯 (Cyprus) - Greek (Turkish is also official)
  'tl': 'pt',      // 东帝汶 (East Timor) - Portuguese (Tetum is also official)
  'ge': 'ka',      // 格鲁吉亚 (Georgia) - Georgian
  'in': 'en',      // 印度 (India) - English (Hindi is official, but English is widely used for official purposes)
  'id': 'id',      // 印度尼西亚 (Indonesia) - Indonesian
  'ir': 'fa',      // 伊朗 (Iran) - Persian
  'iq': 'ar',      // 伊拉克 (Iraq) - Arabic (Kurdish is also official)
  'il': 'he',      // 以色列 (Israel) - Hebrew (Arabic is also official)
  'jp': 'ja',      // 日本 (Japan) - Japanese
  'jo': 'ar',      // 约旦 (Jordan) - Arabic
  'kz': 'kk',      // 哈萨克斯坦 (Kazakhstan) - Kazakh (Russian is also official)
  'kr': 'ko',      // 韩国 (South Korea) - Korean
  'kw': 'ar',      // 科威特 (Kuwait) - Arabic
  'kg': 'ky',      // 吉尔吉斯斯坦 (Kyrgyzstan) - Kyrgyz (Russian is also official)
  'la': 'lo',      // 老挝 (Laos) - Lao
  'lb': 'ar',      // 黎巴嫩 (Lebanon) - Arabic (French and English are widely used)
  'mo': 'zh',      // 澳门 (Macau) - Chinese (Cantonese) (Portuguese is also official)
  'my': 'ms',      // 马来西亚 (Malaysia) - Malay
  'mv': 'dv',      // 马尔代夫 (Maldives) - Dhivehi
  'mn': 'mn',      // 蒙古 (Mongolia) - Mongolian
  'np': 'ne',      // 尼泊尔 (Nepal) - Nepali
  'om': 'ar',      // 阿曼 (Oman) - Arabic
  'pk': 'ur',      // 巴基斯坦 (Pakistan) - Urdu (English is also official)
  'ps': 'ar',      // 巴勒斯坦 (Palestine) - Arabic
  'ph': 'fil',     // 菲律宾 (Philippines) - Filipino (English is also official)
  'qa': 'ar',      // 卡塔尔 (Qatar) - Arabic
  'sa': 'ar',      // 沙特阿拉伯 (Saudi Arabia) - Arabic
  'sg': 'en',      // 新加坡 (Singapore) - English (Malay, Mandarin, and Tamil are also official)
  'lk': 'si',      // 斯里兰卡 (Sri Lanka) - Sinhala (Tamil is also official)
  'sy': 'ar',      // 叙利亚 (Syria) - Arabic
  'tj': 'tg',      // 塔吉克斯坦 (Tajikistan) - Tajik (Persian dialect)
  'th': 'th',      // 泰国 (Thailand) - Thai
  'tr': 'tr',      // 土耳其 (Turkey) - Turkish (listed here as it's often grouped with Asia)
  'tm': 'tk',      // 土库曼斯坦 (Turkmenistan) - Turkmen
  'ae': 'ar',      // 阿联酋 (United Arab Emirates) - Arabic
  'uz': 'uz',      // 乌兹别克斯坦 (Uzbekistan) - Uzbek
  'vn': 'vi',      // 越南 (Vietnam) - Vietnamese
  'ye': 'ar',      // 也门 (Yemen) - Arabic

  // 美洲 (Americas)
  'ag': 'en',      // 安提瓜和巴布达 (Antigua and Barbuda) - English
  'ar': 'es',      // 阿根廷 (Argentina) - Spanish
  'bs': 'en',      // 巴哈马 (Bahamas) - English
  'bb': 'en',      // 巴巴多斯 (Barbados) - English
  'bz': 'en',      // 伯利兹 (Belize) - English (Spanish is widely spoken)
  'bo': 'es',      // 玻利维亚 (Bolivia) - Spanish (Quechua and Aymara are also official)
  'br': 'pt',      // 巴西 (Brazil) - Portuguese
  'ca': 'en',      // 加拿大 (Canada) - English (French is also official)
  'cl': 'es',      // 智利 (Chile) - Spanish
  'co': 'es',      // 哥伦比亚 (Colombia) - Spanish
  'cr': 'es',      // 哥斯达黎加 (Costa Rica) - Spanish
  'cu': 'es',      // 古巴 (Cuba) - Spanish
  'dm': 'en',      // 多米尼克 (Dominica) - English
  'do': 'es',      // 多米尼加共和国 (Dominican Republic) - Spanish
  'ec': 'es',      // 厄瓜多尔 (Ecuador) - Spanish
  'sv': 'es',      // 萨尔瓦多 (El Salvador) - Spanish
  'gd': 'en',      // 格林纳达 (Grenada) - English
  'gt': 'es',      // 危地马拉 (Guatemala) - Spanish
  'gy': 'en',      // 圭亚那 (Guyana) - English
  'ht': 'fr',      // 海地 (Haiti) - French (Haitian Creole is also official)
  'hn': 'es',      // 洪都拉斯 (Honduras) - Spanish
  'jm': 'en',      // 牙买加 (Jamaica) - English
  'mx': 'es',      // 墨西哥 (Mexico) - Spanish
  'ni': 'es',      // 尼加拉瓜 (Nicaragua) - Spanish
  'pa': 'es',      // 巴拿马 (Panama) - Spanish
  'py': 'es',      // 巴拉圭 (Paraguay) - Spanish (Guaraní is also official)
  'pe': 'es',      // 秘鲁 (Peru) - Spanish (Quechua and Aymara are also official)
  'kn': 'en',      // 圣基茨和尼维斯 (Saint Kitts and Nevis) - English
  'lc': 'en',      // 圣卢西亚 (Saint Lucia) - English
  'vc': 'en',      // 圣文森特和格林纳丁斯 (Saint Vincent and the Grenadines) - English
  'sr': 'nl',      // 苏里南 (Suriname) - Dutch
  'tt': 'en',      // 特立尼达和多巴哥 (Trinidad and Tobago) - English
  'us': 'en-US',   // 美国 (United States) - American English
  'gov': 'en-US',  // 美国政府 (US Government) - American English (specific to common government domains)
  'uy': 'es',      // 乌拉圭 (Uruguay) - Spanish
  've': 'es',      // 委内瑞拉 (Venezuela) - Spanish

  // 欧洲 (Europe)
  'eu': 'en',      // 欧盟国家 (European Union) - English (as a common lingua franca for documentation/websites)
  'al': 'sq',      // 阿尔巴尼亚 (Albania) - Albanian
  'ad': 'ca',      // 安道尔 (Andorra) - Catalan
  'at': 'de',      // 奥地利 (Austria) - German
  'by': 'be',      // 白俄罗斯 (Belarus) - Belarusian (Russian is also official)
  'be': 'nl',      // 比利时 (Belgium) - Dutch (French and German are also official)
  'ba': 'bs',      // 波斯尼亚和黑塞哥维那 (Bosnia and Herzegovina) - Bosnian (Serbian and Croatian are also official)
  'bg': 'bg',      // 保加利亚 (Bulgaria) - Bulgarian
  'hr': 'hr',      // 克罗地亚 (Croatia) - Croatian
  'cz': 'cs',      // 捷克 (Czech Republic) - Czech
  'dk': 'da',      // 丹麦 (Denmark) - Danish
  'ee': 'et',      // 爱沙尼亚 (Estonia) - Estonian
  'fi': 'fi',      // 芬兰 (Finland) - Finnish (Swedish is also official)
  'fr': 'fr',      // 法国 (France) - French
  'de': 'de',      // 德国 (Germany) - German
  'gr': 'el',      // 希腊 (Greece) - Greek
  'hu': 'hu',      // 匈牙利 (Hungary) - Hungarian
  'is': 'is',      // 冰岛 (Iceland) - Icelandic
  'ie': 'en',      // 爱尔兰 (Ireland) - English (Irish is also official)
  'it': 'it',      // 意大利 (Italy) - Italian
  'xk': 'sq',      // 科索沃 (Kosovo) - Albanian (Serbian is also official)
  'lv': 'lv',      // 拉脱维亚 (Latvia) - Latvian
  'li': 'de',      // 列支敦士登 (Liechtenstein) - German
  'lt': 'lt',      // 立陶宛 (Lithuania) - Lithuanian
  'lu': 'lb',      // 卢森堡 (Luxembourg) - Luxembourgish (French and German are also official)
  'mk': 'mk',      // 北马其顿 (North Macedonia) - Macedonian
  'mt': 'mt',      // 马耳他 (Malta) - Maltese (English is also official)
  'md': 'ro',      // 摩尔多瓦 (Moldova) - Romanian
  'mc': 'fr',      // 摩纳哥 (Monaco) - French
  'me': 'sr',      // 黑山 (Montenegro) - Serbian
  'nl': 'nl',      // 荷兰 (Netherlands) - Dutch
  'no': 'nb',      // 挪威 (Norway) - Norwegian Bokmål (Nynorsk is also official)
  'pl': 'pl',      // 波兰 (Poland) - Polish
  'pt': 'pt',      // 葡萄牙 (Portugal) - Portuguese
  'ro': 'ro',      // 罗马尼亚 (Romania) - Romanian
  'ru': 'ru',      // 俄罗斯 (Russia) - Russian
  'sm': 'it',      // 圣马力诺 (San Marino) - Italian
  'rs': 'sr',      // 塞尔维亚 (Serbia) - Serbian
  'sk': 'sk',      // 斯洛伐克 (Slovakia) - Slovak
  'si': 'sl',      // 斯洛文尼亚 (Slovenia) - Slovenian
  'es': 'es',      // 西班牙 (Spain) - Spanish (Catalan, Galician, Basque are also official in certain regions)
  'se': 'sv',      // 瑞典 (Sweden) - Swedish
  'ch': 'de',      // 瑞士 (Switzerland) - German (French, Italian, Romansh are also official)
  'ua': 'uk',      // 乌克兰 (Ukraine) - Ukrainian
  'uk': 'en-GB',   // 英国 (United Kingdom) - British English
  'va': 'la',      // 梵蒂冈 (Vatican City) - Latin (Italian and other languages are used for administration)

  // 大洋洲 (Oceania)
  'au': 'en',      // 澳大利亚 (Australia) - English
  'fj': 'en',      // 斐济 (Fiji) - English (Fijian and Hindi are also official)
  'ki': 'en',      // 基里巴斯 (Kiribati) - English (Gilbertese is also official)
  'mh': 'en',      // 马绍尔群岛 (Marshall Islands) - English (Marshallese is also official)
  'fm': 'en',      // 密克罗尼西亚联邦 (Federated States of Micronesia) - English
  'nr': 'en',      // 瑙鲁 (Nauru) - English (Nauruan is also official)
  'nz': 'en',      // 新西兰 (New Zealand) - English (Māori and NZ Sign Language are also official)
  'pw': 'en',      // 帕劳 (Palau) - English (Palauan is also official)
  'pg': 'en',      // 巴布亚新几内亚 (Papua New Guinea) - English (Tok Pisin and Hiri Motu are also official)
  'ws': 'en',      // 萨摩亚 (Samoa) - English (Samoan is also official)
  'sb': 'en',      // 所罗门群岛 (Solomon Islands) - English (Solomon Islands Pidgin is widely spoken)
  'to': 'en',      // 汤加 (Tonga) - English (Tongan is also official)
  'tv': 'en',      // 图瓦卢 (Tuvalu) - English (Tuvaluan is also official)
  'vu': 'bi',      // 瓦努阿图 (Vanuatu) - Bislama (English and French are also official)

  // 非洲基本都使用'en'作为请求头，故不作申明

  // 通用顶级域名 (gTLDs) - 默认使用英文作为通用语言
  'com': 'en',
  'net': 'en',
  'org': 'en',
  'io': 'en',
  'info': 'en',
  'biz': 'en',
  'mobi': 'en',
  'site': 'en',
  'app': 'en',
  'online': 'en',
  'guru': 'en',
  'xyz': 'en',
  'tk': 'en',
  'dev': 'en',
  'club': 'en',
  'shop': 'en',
  'store': 'en',
  'space': 'en',
  'tech': 'en', // 科技相关
  'live': 'en', // 直播、生活相关
  'solutions': 'en', // 解决方案
  'today': 'en', // 今日、时事
  'world': 'en', // 世界
  'agency': 'en', // 代理、机构
  'digital': 'en', // 数字、数字化
  'group': 'en', // 集团、团队
  'media': 'en', // 媒体
  'news': 'en', // 新闻
  'blog': 'en', // 博客
  'art': 'en', // 艺术
  'design': 'en', // 设计
  'photo': 'en', // 照片
  'video': 'en', // 视频
  'travel': 'en', // 旅行
  'finance': 'en', // 金融
  'management': 'en', // 管理
  'consulting': 'en', // 咨询
  'health': 'en', // 健康
  'fitness': 'en', // 健身
  'education': 'en', // 教育
  'school': 'en', // 学校
  'university': 'en', // 大学
  'careers': 'en', // 职业
  'jobs': 'en', // 工作
  'food': 'en', // 食物
  'restaurant': 'en', // 餐厅
  'auto': 'en', // 汽车
  'car': 'en', // 汽车
  'game': 'en', // 游戏
  'sport': 'en', // 体育
  'events': 'en', // 活动
  'global': 'en' // 全球
  // ...可以根据需要添加更多gTLDs
};

// 指数退避重试配置
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500; // 毫秒

// 更新请求头规则，支持错误重试和规则缓存
function updateHeaderRules(language, retryCount = 0, isAutoSwitch = false) {
  language = language ? language.trim() : DEFAULT_LANGUAGE; // 增加对language空值的处理

  // 如果不是自动切换，并且语言与上次应用的相同，且规则缓存存在，可以跳过更新
  if (!isAutoSwitch && language === lastAppliedLanguage && rulesCache) {
    sendBackgroundLog(`语言设置 ${language} 已经应用，跳过更新`, 'info');
    return Promise.resolve({ status: 'cached', language });
  }

  sendBackgroundLog(`尝试更新请求头规则为: ${language}${retryCount > 0 ? ` (重试 #${retryCount})` : ''}`, 'info');

  // 返回Promise以便支持重试机制
  return new Promise((resolve, reject) => {
    // 获取当前规则以检查是否需要更新
    chrome.declarativeNetRequest.getDynamicRules(existingRules => {
      // 检查是否有错误
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        sendBackgroundLog(`获取现有规则失败: ${error.message}`, 'error');
        handleRuleUpdateError(error, language, retryCount, resolve, reject);
        return;
      }

      // 缓存现有规则
      rulesCache = existingRules;

      // 检查是否已存在相同语言的规则，如果是则跳过更新
      const existingRule = existingRules.find(rule =>
        rule.id === RULE_ID &&
        rule.action.requestHeaders &&
        rule.action.requestHeaders.some(header =>
          header.header === 'Accept-Language' &&
          header.value === language
        )
      );

      if (existingRule) {
        sendBackgroundLog(`已存在相同语言 ${language} 的规则，跳过更新`, 'info');
        lastAppliedLanguage = language;
        resolve({ status: 'unchanged', language });
        return;
      }

      // 直接尝试移除旧规则 (ID 为 RULE_ID) 并添加新规则
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID], // 直接指定要移除的规则 ID
        addRules: [{
          "id": RULE_ID,
          "priority": 100, // 使用更高的优先级覆盖静态规则
          "action": {
            "type": "modifyHeaders",
            "requestHeaders": [
              {
                "header": "Accept-Language",
                "operation": "set",
                "value": language
              }
            ]
          },
          "condition": {
            "urlFilter": "*",
            "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
          }
        }]
      }, function () {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          sendBackgroundLog(`更新 declarativeNetRequest 规则失败: ${error.message}`, 'error');
          handleRuleUpdateError(error, language, retryCount, resolve, reject);
          return;
        }

        // 规则更新成功
        if (!isAutoSwitch) { // 只有手动更新时才记录 lastAppliedLanguage
          lastAppliedLanguage = language;
        }
        sendBackgroundLog(`请求头规则已成功更新为: ${language}`, 'success');
        resolve({ status: 'success', language });
      });
    });
  });
}

// 处理规则更新错误，实现指数退避重试
function handleRuleUpdateError(error, language, retryCount, resolve, reject) {
  // 对不同类型的错误进行分类处理
  let errorType = 'unknown';
  let canRetry = true;

  // 分析错误类型
  if (error.message.includes('quota')) {
    errorType = 'quota_exceeded';
    canRetry = false; // 配额错误通常无法通过重试解决
  } else if (error.message.includes('permission')) {
    errorType = 'permission_denied';
    canRetry = false; // 权限错误通常无法通过重试解决
  } else if (error.message.includes('network')) {
    errorType = 'network_error';
    // 网络错误可以重试
  }

  // 记录详细错误信息
  sendBackgroundLog(`规则更新错误类型: ${errorType}, 消息: ${error.message}`, 'error');

  // 如果可以重试且未超过最大重试次数
  if (canRetry && retryCount < MAX_RETRY_ATTEMPTS) {
    const nextRetryCount = retryCount + 1;
    const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount); // 指数退避

    sendBackgroundLog(`将在 ${delay}ms 后进行第 ${nextRetryCount} 次重试`, 'warning');

    setTimeout(() => {
      // 递归调用更新函数进行重试
      updateHeaderRules(language, nextRetryCount)
        .then(resolve)
        .catch(reject);
    }, delay);
  } else {
    // 超过重试次数或不可重试的错误
    const finalError = new Error(`更新规则失败 (${errorType}): ${error.message}`);
    finalError.originalError = error;
    finalError.type = errorType;
    finalError.retryCount = retryCount;

    sendBackgroundLog(`已达到最大重试次数或错误不可重试，放弃更新`, 'error');
    reject(finalError);

    // 通知用户出现了问题
    chrome.runtime.sendMessage({
      type: 'UPDATE_ERROR',
      error: {
        type: errorType,
        message: error.message,
        retryCount: retryCount
      }
    }).catch(() => {
      // 忽略发送消息的错误
    });
  }
}


// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(function (details) {
  sendBackgroundLog(`MultiLangSwitcher 扩展已安装/更新. Reason: ${details.reason}`, 'info');

  // 从存储中获取当前语言设置和自动切换状态并应用
  chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled'], function (result) {
    autoSwitchEnabled = !!result.autoSwitchEnabled; // 更新内存中的状态
    sendBackgroundLog(`加载存储的自动切换状态: ${autoSwitchEnabled}`, 'info');

    if (autoSwitchEnabled) {
      sendBackgroundLog('自动切换已启用，将应用默认语言(en)直到首次导航触发规则。', 'info');
      // 当自动切换启用时，默认使用英语 ('en')，直到访问特定域名时再切换或用户手动更改
      updateHeaderRules('en', 0, true).then(() => { // 标记为自动切换初始化
        notifyPopupUIUpdate(true, 'en'); // 通知UI当前是自动模式且语言为'en'
      });
    } else if (result.currentLanguage) {
      updateHeaderRules(result.currentLanguage);
      sendBackgroundLog(`加载并应用存储的语言设置: ${result.currentLanguage}`, 'info');
      notifyPopupUIUpdate(autoSwitchEnabled, result.currentLanguage);
    } else {
      // 如果没有保存的语言设置，并且自动切换未启用，使用默认值并保存
      chrome.storage.local.set({
        currentLanguage: DEFAULT_LANGUAGE
      }, function () {
        if (chrome.runtime.lastError) {
          sendBackgroundLog(`保存默认语言设置 ${DEFAULT_LANGUAGE} 到 storage 失败: ${chrome.runtime.lastError.message}`, 'error');
        }
        updateHeaderRules(DEFAULT_LANGUAGE);
        sendBackgroundLog(`未找到存储的语言设置，使用并保存默认值: ${DEFAULT_LANGUAGE}`, 'warning');
        notifyPopupUIUpdate(autoSwitchEnabled, DEFAULT_LANGUAGE);
      });
    }
  });
});

// 通知popup更新UI的函数
function notifyPopupUIUpdate(autoSwitchEnabled, currentLanguage) {
  chrome.runtime.sendMessage({
    type: 'AUTO_SWITCH_UI_UPDATE',
    autoSwitchEnabled: autoSwitchEnabled,
    currentLanguage: currentLanguage
  }).catch(error => {
    // console.warn("Could not send UI update to popup:", error);
  });
}

// 处理自动切换逻辑
function handleAutoSwitch(details) {
  if (!autoSwitchEnabled || details.method !== 'GET' || !details.url || details.tabId < 0) {
    return; // 如果自动切换关闭，或不是GET请求，或没有URL，或不是来自标签页的请求，则不处理
  }

  try {
    const url = new URL(details.url);
    const hostname = url.hostname;
    // 获取顶级域名 (TLD)
    const parts = hostname.split('.');
    const tld = parts.length > 1 ? parts[parts.length - 1] : null;
    // 尝试获取二级域名作为更精确的匹配，例如 .com.cn 中的 cn
    const sld = parts.length > 2 ? parts[parts.length - 2] : null;

    let targetLanguage = null;
    let matchedRule = null;

    // 优先匹配更具体的规则，如 'com.cn' -> 'cn'
    if (sld && domainLanguageRules[sld + '.' + tld]) {
      targetLanguage = domainLanguageRules[sld + '.' + tld];
      matchedRule = sld + '.' + tld;
    } else if (tld && domainLanguageRules[tld]) {
      targetLanguage = domainLanguageRules[tld];
      matchedRule = tld;

      // 检查URL路径中是否包含语言代码，如果包含则不覆盖域名规则
      const pathParts = url.pathname.split('/');
      const hasLanguageInPath = pathParts.some(part => part === 'en' || part === 'zh' || part === 'fr' || part === 'de' || part === 'es' || part === 'ru' || part === 'it');

      // 如果URL路径中包含语言代码，记录日志但仍然使用域名规则
      if (hasLanguageInPath) {
        sendBackgroundLog(`注意: 域名 ${hostname} 的URL路径中包含语言代码，但仍然使用域名规则 ${matchedRule} -> ${targetLanguage}`, 'info');
      }
    }

    if (targetLanguage) {
      sendBackgroundLog(`自动切换: 检测到域名 ${hostname} (匹配规则 TLD/SLD: ${matchedRule}), 目标语言: ${targetLanguage}`, 'info');
      updateHeaderRules(targetLanguage, 0, true).then(updateResult => {
        if (updateResult.status === 'success' || updateResult.status === 'unchanged') {
          sendBackgroundLog(`为 ${hostname} 应用语言 ${targetLanguage} 成功`, 'info');
          notifyPopupUIUpdate(autoSwitchEnabled, targetLanguage); // 更新UI
        } else {
          sendBackgroundLog(`为 ${hostname} 应用语言 ${targetLanguage} 失败: ${updateResult.message}`, 'error');
        }
      }).catch(error => {
        sendBackgroundLog(`更新 ${hostname} 的规则时出错: ${error.message}`, 'error');
      });
    } else {
      // 如果没有特定域名规则，默认使用英语('en')
      const fallbackLanguage = 'en';
      sendBackgroundLog(`自动切换: 域名 ${hostname} 无匹配规则, 默认使用语言: ${fallbackLanguage}`, 'info');

      updateHeaderRules(fallbackLanguage, 0, true).then(updateResult => {
        if (updateResult.status === 'success' || updateResult.status === 'unchanged') {
          sendBackgroundLog(`为 ${hostname} 应用默认/回退语言 ${fallbackLanguage} 成功`, 'info');
          notifyPopupUIUpdate(autoSwitchEnabled, fallbackLanguage); // 更新UI
        } else {
          sendBackgroundLog(`为 ${hostname} 应用默认/回退语言 ${fallbackLanguage} 失败: ${updateResult.message}`, 'error');
        }
      }).catch(error => {
        sendBackgroundLog(`更新 ${hostname} 的默认/回退规则时出错: ${error.message}`, 'error');
      });
    }
  } catch (e) {
    sendBackgroundLog(`解析URL或处理自动切换时出错: ${e.message}`, 'error');
  }
}

// 监听来自 popup 或 debug 页面的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'UPDATE_RULES') {
    try {
      const language = request.language;
      sendBackgroundLog(`收到更新规则请求，语言: ${language}`, 'info');
      updateHeaderRules(language)
        .then(result => {
          sendBackgroundLog(`规则更新完成，状态: ${result.status}`, 'info');
          chrome.storage.local.set({ currentLanguage: language }, () => {
            if (chrome.runtime.lastError) {
              sendBackgroundLog(`保存语言设置 ${language} 到 storage 失败: ${chrome.runtime.lastError.message}`, 'error');
            }
            if (typeof sendResponse === 'function') {
              sendResponse({ status: 'success', language: result.language });
            }
            // 手动更新规则后，也通知popup更新UI
            notifyPopupUIUpdate(autoSwitchEnabled, result.language);
          });
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          sendBackgroundLog(`规则更新失败: ${errorMessage}`, 'error');
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'error', message: `规则更新时发生错误: ${errorMessage}` });
          }
        });
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      sendBackgroundLog(`处理 UPDATE_RULES 时发生同步错误: ${errorMessage}`, 'error');
      if (typeof sendResponse === 'function') {
        sendResponse({ status: 'error', message: `处理规则更新时发生意外错误: ${errorMessage}` });
      }
    }
    return true;
  } else if (request.type === 'AUTO_SWITCH_TOGGLED') {
    autoSwitchEnabled = request.enabled;
    sendBackgroundLog(`自动切换功能状态已更新为: ${autoSwitchEnabled}`, 'info');
    chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled }); // 保存状态

    if (autoSwitchEnabled) {
      sendBackgroundLog('自动切换已启用。后续请求将根据域名自动切换语言。', 'info');
      // 启用自动切换时，先应用默认的英语
      updateHeaderRules('en', 0, true).then(() => {
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'success' });
        }
        notifyPopupUIUpdate(true, 'en');
      }).catch(error => {
        sendBackgroundLog(`自动切换启用时更新规则失败: ${error.message}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'error', message: `自动切换启用时更新规则失败: ${error.message}` });
        }
      });
    } else {
      // 禁用自动切换时，恢复到用户之前手动设置的语言
      chrome.storage.local.get(['currentLanguage'], function (result) {
        const language = result.currentLanguage || DEFAULT_LANGUAGE;
        sendBackgroundLog(`自动切换已禁用。恢复到用户设置的语言: ${language}`, 'info');
        updateHeaderRules(language).then(() => {
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'success' });
          }
          notifyPopupUIUpdate(false, language);
        }).catch(error => {
          sendBackgroundLog(`自动切换禁用时更新规则失败: ${error.message}`, 'error');
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'error', message: `自动切换禁用时更新规则失败: ${error.message}` });
          }
        });
      });
    }
    // 由于此分支中的 sendResponse 是在异步操作 (.then() 或回调) 中调用的，
    // 因此整个 'AUTO_SWITCH_TOGGLED' 分支必须返回 true。
    return true;
  } else if (request.type === 'GET_DOMAIN_RULES') {
    sendBackgroundLog('收到获取域名映射规则请求', 'info');
    try {
      // domainLanguageRules 是一个同步可访问的常量对象
      if (typeof sendResponse === 'function') {
        sendResponse({ domainRules: domainLanguageRules });
      }
    } catch (e) {
      sendBackgroundLog(`发送 domainRules 时出错: ${e.message}`, 'error');
      if (typeof sendResponse === 'function') {
        sendResponse({ error: `发送 domainRules 时出错: ${e.message}` });
      }
    }
    return true;
  }
});

// 注册网络请求监听器以实现自动切换 (Manifest V3 compatible)
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (autoSwitchEnabled) {
      // 确保自动切换已启用
      handleAutoSwitch(details);
    }
    return {};
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// 监听标签页更新以实现自动切换 (Manifest V3 compatible)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 确保自动切换已启用，标签页加载完成，并且有有效的URL (http or https)
  if (autoSwitchEnabled && changeInfo.status === 'complete' && tab && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) {
    sendBackgroundLog(`Tab updated: ${tab.url}, Status: ${changeInfo.status}`, 'info');
    try {
      const url = new URL(tab.url);
      const currentHostname = url.hostname.toLowerCase();
      let targetLanguage = null;

      // 遍历域名规则，查找匹配项
      for (const ruleDomainKey in domainLanguageRules) {
        // 检查主机名是否以 ".<ruleDomainKey>" 结尾，或者完全等于 "<ruleDomainKey>"
        if (currentHostname.endsWith(`.${ruleDomainKey}`) || currentHostname === ruleDomainKey) {
          targetLanguage = domainLanguageRules[ruleDomainKey];
          sendBackgroundLog(`Domain rule '${ruleDomainKey}' matched for hostname '${currentHostname}'. Setting language to: ${targetLanguage}`, 'info');
          break; // 使用第一个匹配的规则
        }
      }

      if (targetLanguage) {
        sendBackgroundLog(`Auto-switching for hostname '${currentHostname}' to language '${targetLanguage}'.`, 'info');
        // 调用 updateHeaderRules 更新请求头，标记为自动切换 (isAutoSwitch = true)
        updateHeaderRules(targetLanguage, 0, true)
          .then(result => {
            sendBackgroundLog(`Auto-switch updateHeaderRules successful for ${currentHostname}: ${result.status}`, 'info');
          })
          .catch(error => {
            sendBackgroundLog(`Auto-switch updateHeaderRules failed for ${currentHostname}: ${error.message}`, 'error');
          });
      } else {
        // 如果没有匹配的规则，默认使用英语
        const defaultLanguage = 'en';
        sendBackgroundLog(`域名 '${currentHostname}' 没有匹配的规则，使用默认语言: ${defaultLanguage}`, 'info');
        updateHeaderRules(defaultLanguage, 0, true)
          .then(result => {
            sendBackgroundLog(`已为 ${currentHostname} 应用默认语言(en): ${result.status}`, 'info');
            notifyPopupUIUpdate(true, defaultLanguage);
          })
          .catch(error => {
            sendBackgroundLog(`为 ${currentHostname} 应用默认语言失败: ${error.message}`, 'error');
          });
      }
    } catch (e) {
      // 捕获并记录解析URL或处理过程中可能发生的任何错误
      sendBackgroundLog(`Error processing URL ('${tab.url}') for auto-switch: ${e.message}`, 'error');
    }
  }
});