// 获取并显示当前请求头
function fetchAndDisplayHeaders() {
  const headerInfoElement = document.getElementById('headerInfo');
  const headerLanguageInfo = document.getElementById('headerLanguageInfo');
  headerInfoElement.textContent = '正在获取请求头信息...';
  headerLanguageInfo.textContent = '正在检测...';
  
  // 使用随机参数避免缓存
  const timestamp = new Date().getTime();
  
  // 创建一个请求来获取请求头信息
  fetch(`https://httpbin.org/headers?_=${timestamp}`, {
    cache: 'no-store', // 完全禁用缓存
    credentials: 'omit' // 不发送cookies
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // 格式化并显示请求头
      const headers = data.headers;
      let formattedHeaders = JSON.stringify(headers, null, 2);
      headerInfoElement.textContent = formattedHeaders;
      
      // 清除之前的语言设置信息
      const previousLanguageInfo = document.querySelector('.alert-info p.mt-2');
      if (previousLanguageInfo) {
        previousLanguageInfo.remove();
      }
      
      // 高亮显示Accept-Language头
      if (headers['Accept-Language']) {
        const acceptLanguage = headers['Accept-Language'];
        document.querySelector('.alert-info').innerHTML += 
          `<p class="mt-2 mb-0">检测到的语言设置: <strong class="text-success">${acceptLanguage}</strong></p>`;
        console.log('检测到的Accept-Language:', acceptLanguage);
        
        // 更新请求头语言卡片
        headerLanguageInfo.innerHTML = `
          <p class="mb-1"><strong>当前值:</strong></p>
          <p class="text-success fw-bold">${acceptLanguage}</p>
          <p class="mb-0 mt-2 small text-muted">通过请求头检测</p>
        `;
      } else {
        console.log('未检测到Accept-Language请求头');
        document.querySelector('.alert-info').innerHTML += 
          `<p class="mt-2 mb-0 text-warning">未检测到Accept-Language请求头</p>`;
        
        // 更新请求头语言卡片
        headerLanguageInfo.innerHTML = `
          <p class="text-warning">未检测到Accept-Language请求头</p>
        `;
      }
    })
    .catch(error => {
      console.error('获取请求头失败:', error);
      headerInfoElement.textContent = '获取请求头信息失败: ' + error.message;
      headerLanguageInfo.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
    });
}

// 检测JavaScript语言偏好
function checkJavaScriptLanguage() {
  const jsLanguageInfo = document.getElementById('jsLanguageInfo');
  jsLanguageInfo.textContent = '正在检测...';
  
  try {
    const navigatorLanguage = navigator.language;
    const navigatorLanguages = navigator.languages ? navigator.languages.join(', ') : '未检测到';
    
    jsLanguageInfo.innerHTML = `
      <p class="mb-1"><strong>navigator.language:</strong></p>
      <p class="text-success fw-bold">${navigatorLanguage}</p>
      <p class="mb-1 mt-2"><strong>navigator.languages:</strong></p>
      <p class="text-success">${navigatorLanguages}</p>
    `;
    
    console.log('检测到的JavaScript语言偏好:', navigatorLanguage);
  } catch (error) {
    console.error('检测JavaScript语言偏好失败:', error);
    jsLanguageInfo.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
  }
}

// 检测国际化API语言
function checkIntlAPI() {
  const intlAPIInfo = document.getElementById('intlAPIInfo');
  intlAPIInfo.textContent = '正在检测...';
  
  try {
    // 获取当前日期格式化示例
    const date = new Date();
    const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'long'
    });
    const formattedDate = dateTimeFormat.format(date);
    
    // 尝试检测使用的语言区域
    const resolvedOptions = dateTimeFormat.resolvedOptions();
    const locale = resolvedOptions.locale;
    
    intlAPIInfo.innerHTML = `
      <p class="mb-1"><strong>检测到的区域设置:</strong></p>
      <p class="text-success fw-bold">${locale}</p>
      <p class="mb-1 mt-2"><strong>格式化示例:</strong></p>
      <p class="small">${formattedDate}</p>
    `;
    
    console.log('检测到的国际化API语言:', locale);
  } catch (error) {
    console.error('检测国际化API失败:', error);
    intlAPIInfo.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
  }
}

// 页面加载完成后获取请求头
window.addEventListener('DOMContentLoaded', function() {
  // 延迟一秒执行，确保扩展规则已应用
  setTimeout(function() {
    fetchAndDisplayHeaders();
    checkJavaScriptLanguage();
    checkIntlAPI();
  }, 1000);
  
  // 添加刷新按钮功能
  const refreshButton = document.createElement('button');
  refreshButton.className = 'btn btn-primary mt-3';
  refreshButton.textContent = '刷新所有信息';
  refreshButton.onclick = function() {
    fetchAndDisplayHeaders();
    checkJavaScriptLanguage();
    checkIntlAPI();
  };
  document.querySelector('.header-info').appendChild(refreshButton);
});