// shared-debug-core.js - 调试核心功能共享模块
// 提供统一的调试和请求头测试功能

/**
 * 带重试机制的统一请求头测试函数
 * @param {string} language - 要测试的语言代码
 * @param {Object} options - 测试选项
 * @returns {Promise<Object>} 测试结果
 */
const performHeaderTest = async (language, options = {}) => {
  if (!language) {
    throw new Error('Language parameter is required');
  }

  const {
    onProgress = () => {}, // 进度回调
    onResult = () => {}, // 结果回调
    signal = null // AbortSignal用于取消
  } = options;

  try {
    onProgress(`开始测试语言: ${language}`);

    // 生成时间戳避免缓存
    const timestamp = Date.now();
    
    // 使用popup.js的3个请求点最佳实践
    const testUrls = [
      `https://httpbin.org/headers?_=${timestamp}`,
      `https://postman-echo.com/headers?_=${timestamp}`,
      `https://header-echo.addr.tools/?_=${timestamp}`
    ];

    let lastError = null;

    // 依次尝试每个测试URL
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      
      try {
        const hostname = new URL(url).hostname;
        onProgress(`正在尝试: ${hostname}`);

        // 使用AbortSignal支持取消
        const fetchOptions = {
          cache: 'no-store',
          credentials: 'omit',
          signal
        };

        const response = await fetch(url, fetchOptions);

        // 检查响应状态
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${hostname}`);
        }

        // 解析响应数据
        const data = await response.json();
        onProgress(`成功获取头部信息: ${hostname}`);

        // 查找Accept-Language头部
        const headers = data.headers;
        const acceptLangHeader = headers['Accept-Language'] || headers['accept-language'];

        if (!acceptLangHeader) {
          onProgress(`${hostname}: 未检测到 Accept-Language 头部`);
          continue; // 尝试下一个URL
        }

        // 验证语言设置是否生效
        const acceptLanguage = acceptLangHeader.toLowerCase();
        const expectedLanguage = language.toLowerCase();
        const success = acceptLanguage.includes(expectedLanguage);

        const result = {
          success,
          acceptLanguage: acceptLangHeader,
          expectedLanguage: language,
          detectedUrl: hostname,
          sourceUrl: url,
          testUrls
        };

        onResult(result);
        return result;

      } catch (error) {
        lastError = error;
        onProgress(`请求失败: ${hostname} - ${error.message}`);
        
        // 如果是取消操作，直接抛出
        if (error.name === 'AbortError' || signal?.aborted) {
          throw error;
        }
        
        // 尝试下一个URL
        continue;
      }
    }

    // 所有URL都失败
    const errorMsg = `所有检测点都失败了${lastError ? `: ${lastError.message}` : ''}`;
    onProgress(errorMsg);
    
    const result = {
      success: false,
      error: errorMsg,
      testUrls,
      lastError
    };

    onResult(result);
    return result;

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      isCancelled: error.name === 'AbortError'
    };

    onResult(errorResult);
    throw error;
  }
};

/**
 * 获取当前动态规则和匹配规则
 * @returns {Promise<Object>} 规则信息
 */
const getCurrentRules = async () => {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const matchedRules = await chrome.declarativeNetRequest.getMatchedRules({});

    return {
      dynamicRules: rules,
      matchedRules: matchedRules,
      success: true
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 验证 Accept-Language 格式
 * @param {string} languageString - 要验证的语言字符串
 * @returns {boolean} - 如果格式可能有问题返回 true
 */
const validateAcceptLanguageFormat = (languageString) => {
  // 基本格式检查
  const trimmed = languageString.trim();

  // 空字符串检查
  if (!trimmed) {
    return true;
  }

  // 检查是否包含不合法字符（Accept-Language 应该只包含字母、数字、连字符、逗号、分号、等号、点和空格）
  const invalidChars = /[^a-zA-Z0-9\-,;=.\s]/;
  if (invalidChars.test(trimmed)) {
    return true; // 包含不合法字符
  }

  // 检查是否有连续的逗号或以逗号开头/结尾
  if (/,,|^,|,$/.test(trimmed)) {
    return true;
  }

  // 检查基本结构：应该是逗号分隔的语言标签列表
  const parts = trimmed.split(',');
  for (const part of parts) {
    const cleanPart = part.trim();
    if (!cleanPart) {
      return true; // 空的部分
    }

    // 检查每个部分的格式：language-tag 或 language-tag;q=value
    const qIndex = cleanPart.indexOf(';q=');
    const languageTag = qIndex === -1 ? cleanPart : cleanPart.substring(0, qIndex);

    // 更宽松的语言标签验证：支持更复杂的格式如 zh-Hans-CN
    // 基本格式：2-3个字母，可选地跟多个连字符分隔的2-8个字母/数字的子标签
    const languageTagPattern = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
    if (!languageTagPattern.test(languageTag)) {
      return true; // 语言标签格式不正确
    }

    // 如果有质量值，检查其格式
    if (qIndex !== -1) {
      const qValue = cleanPart.substring(qIndex + 3);

      // 检查质量值格式：应该是0到1之间的数字，最多3位小数
      const qValuePattern = /^(0(\.\d{1,3})?|1(\.0{1,3})?)$/;
      if (!qValuePattern.test(qValue)) {
        return true; // 质量值格式不正确
      }
    }
  }

  return false; // 格式看起来正常
};

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
  window.sharedDebugCore = {
    performHeaderTest,
    getCurrentRules,
    validateAcceptLanguageFormat
  };
}