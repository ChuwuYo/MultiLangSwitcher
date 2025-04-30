// 调试脚本，用于验证请求头更改是否生效

// 在控制台中显示当前的动态规则
function showCurrentRules() {
  console.log('正在获取当前动态规则...');
  chrome.declarativeNetRequest.getDynamicRules(function(rules) {
    console.log('当前动态规则:', rules);
    
    if (rules.length === 0) {
      console.warn('警告: 没有发现动态规则!');
    } else {
      // 检查规则优先级
      rules.forEach(rule => {
        if (rule.priority < 100) {
          console.warn(`警告: 规则 ${rule.id} 优先级较低 (${rule.priority}), 可能会被静态规则覆盖`);
        }
      });
    }
  });
  
  // 获取匹配的规则
  chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
    console.log('当前匹配的规则:', matchedRules);
  });
}

// 测试请求头是否生效
function testHeaderChange(language) {
  console.log(`正在测试语言 "${language}" 的请求头是否生效...`);
  
  // 使用随机参数避免缓存
  const timestamp = new Date().getTime();
  
  fetch(`https://httpbin.org/headers?_=${timestamp}`, {
    cache: 'no-store',
    credentials: 'omit'
  })
    .then(response => response.json())
    .then(data => {
      const headers = data.headers;
      console.log('收到的请求头:', headers);
      
      if (headers['Accept-Language']) {
        const acceptLanguage = headers['Accept-Language'].toLowerCase();
        const expectedLanguage = language.toLowerCase();
        
        if (acceptLanguage.includes(expectedLanguage)) {
          console.log('%c✓ 请求头已成功更改!', 'color: green; font-weight: bold');
        } else {
          console.error(`✗ 请求头未成功更改! 预期: ${expectedLanguage}, 实际: ${acceptLanguage}`);
        }
      } else {
        console.error('✗ 未检测到Accept-Language请求头!');
      }
    })
    .catch(error => {
      console.error('测试失败:', error);
    });
}

// 导出函数供控制台使用
window.debugHeaders = {
  showRules: showCurrentRules,
  testHeader: testHeaderChange
};

// 在控制台中显示使用说明
console.log('%c请求头调试工具已加载', 'color: blue; font-weight: bold');
console.log('使用方法:');
console.log('1. debugHeaders.showRules() - 显示当前规则');
console.log('2. debugHeaders.testHeader("en-US") - 测试指定语言的请求头是否生效');