// toggle.js - 通用切换按钮功能

// 语言切换功能
class LanguageToggle {
  constructor() {
    this.currentLang = this.detectLanguage();
  }

  detectLanguage() {
    const saved = localStorage.getItem('app-lang');
    if (saved) return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }

  switchLanguage(lang) {
    if (lang !== this.currentLang) {
      this.currentLang = lang;
      localStorage.setItem('app-lang', lang);
      location.reload();
    }
  }

  addLanguageSelector() {
    const langBtn = document.createElement('button');
    langBtn.id = 'langToggleBtn';
    langBtn.className = 'toggle';
    langBtn.title = this.currentLang === 'zh' ? '切换到English' : 'Switch to 中文';
    langBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;
    
    // 根据页面类型设置位置
    const isPopup = document.body.classList.contains('popup-body');
    if (isPopup) {
      langBtn.style.left = '10px';
    } else {
      langBtn.style.right = '60px';
    }
    
    document.body.appendChild(langBtn);
    
    langBtn.addEventListener('click', () => {
      this.switchLanguage(this.currentLang === 'zh' ? 'en' : 'zh');
    });
  }
}

// 监听页面加载，初始化按钮和主题状态
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // 定义主题按钮的细节（图标和状态）
  const themeButtonDetails = {
    'dark': {
      icon: '<img src="images/sun.svg" alt="Light Mode" width="16" height="16">', // 浅色模式图标
      state: 'on'
    },
    'light': {
      icon: '<img src="images/moon.svg" alt="Dark Mode" width="16" height="16">', // 深色模式图标
      state: 'off'
    }
  };

  // 主题切换应用函数
  function applyTheme(theme) {
    // 设置文档根元素的主题属性
    document.documentElement.setAttribute('data-bs-theme', theme);
    // 将当前主题存储到本地存储
    localStorage.setItem('theme', theme);

    // 如果主题切换按钮存在，更新其内容和状态
    if (themeToggleBtn) {
      const details = themeButtonDetails[theme];
      if (details) {
        themeToggleBtn.innerHTML = details.icon;
        themeToggleBtn.setAttribute('data-state', details.state);
      }
    }
  }

  // 应用初始主题
  if (currentTheme) {
    applyTheme(currentTheme);
  } else if (prefersDarkScheme.matches) {
    applyTheme('dark');
  } else {
    applyTheme('light'); // 默认浅色主题
  }

  // 主题切换按钮监听器
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      // 根据当前主题确定新主题
      let newTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      // 应用新主题
      applyTheme(newTheme);
    });
  }

  // 监听操作系统主题变化
  prefersDarkScheme.addEventListener('change', (e) => {
    // 仅当用户未设置偏好时才更改
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  // 初始化语言切换按钮
  const languageToggle = new LanguageToggle();
  languageToggle.addLanguageSelector();
});