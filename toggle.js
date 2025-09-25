// toggle.js - 通用切换按钮功能

// --- 资源管理器  ---
const resourceTracker = {
  eventListeners: [],
  timers: [],
  intervals: [],
  messageListeners: [],

  // 事件监听器管理
  addEventListener: function(element, event, handler, options = null) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  },

  removeEventListener: function(element, event, handler, options = null) {
    element.removeEventListener(event, handler, options);
    this.eventListeners = this.eventListeners.filter(
      listener => !(listener.element === element &&
                   listener.event === event &&
                   listener.handler === handler &&
                   listener.options === options)
    );
  },

  // 定时器管理
  setTimeout: function(callback, delay) {
    const id = setTimeout(callback, delay);
    this.timers.push(id);
    return id;
  },

  setInterval: function(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  },

  clearTimeout: function(id) {
    clearTimeout(id);
    this.timers = this.timers.filter(timerId => timerId !== id);
  },

  clearInterval: function(id) {
    clearInterval(id);
    this.intervals = this.intervals.filter(intervalId => intervalId !== id);
  },

  // 统一清理方法
  cleanup: function() {
    // 清理事件监听器
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];

    // 清理定时器
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
  }
};

// 语言切换功能
class LanguageToggle {
  constructor() {
    this.currentLang = this.detectLanguage();
  }

  /**
   * 检测当前语言设置
   * @returns {string} 语言代码 ('zh' 或 'en')
   */
  detectLanguage() {
    const saved = localStorage.getItem('app-lang');
    if (saved) return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }

  /**
   * 切换语言设置
   * @param {string} lang - 目标语言代码
   */
  async switchLanguage(lang) {
    try {
      if (lang === this.currentLang) return;

      this.currentLang = lang;
      localStorage.setItem('app-lang', lang);
      location.reload();
    } catch (error) {
      console.error('Error switching language:', error);
    }
  }

  /**
   * 添加语言选择器按钮到页面
   */
  addLanguageSelector() {
    const langBtn = document.createElement('button');
    langBtn.id = 'langToggleBtn';
    langBtn.className = 'toggle';
    langBtn.title = this.currentLang === 'zh' ? 'English' : '中文';
    langBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;

    // 根据页面类型设置位置
    const isPopup = document.body.classList.contains('popup-body');
    langBtn.style[isPopup ? 'left' : 'right'] = isPopup ? '10px' : '60px';

    document.body.appendChild(langBtn);

    resourceTracker.addEventListener(langBtn, 'click', () => {
      this.switchLanguage(this.currentLang === 'zh' ? 'en' : 'zh');
    });
  }
}

/**
 * 主题管理功能类
 */
class ThemeManager {
  constructor() {
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.currentTheme = localStorage.getItem('theme') || null;
    this.prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    this.themeButtonDetails = {
      'dark': {
        icon: '<img src="images/sun.svg" alt="Light Mode" width="16" height="16" class="invert-on-dark">',
        state: 'on'
      },
      'light': {
        icon: '<img src="images/moon.svg" alt="Dark Mode" width="16" height="16" class="invert-on-dark">',
        state: 'off'
      }
    };
  }

  /**
   * 初始化主题管理器
   */
  init() {
    // 应用初始主题
    if (this.currentTheme) {
      this.applyTheme(this.currentTheme);
    } else {
      this.applyTheme(this.prefersDarkScheme.matches ? 'dark' : 'light');
    }

    this.setupEventListeners();
  }

  /**
   * 应用指定主题
   * @param {string} theme - 主题名称 ('dark' 或 'light')
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);

    if (!this.themeToggleBtn) return;

    const details = this.themeButtonDetails[theme];
    if (details) {
      this.themeToggleBtn.innerHTML = details.icon;
      this.themeToggleBtn.setAttribute('data-state', details.state);
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 主题切换按钮监听器
    if (this.themeToggleBtn) {
      resourceTracker.addEventListener(this.themeToggleBtn, 'click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
      });
    }

    // 监听操作系统主题变化
    resourceTracker.addEventListener(this.prefersDarkScheme, 'change', (e) => {
      // 仅当用户未设置偏好时才更改
      if (!localStorage.getItem('theme')) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

/**
 * 初始化页面功能
 */
const initializePage = async () => {
  try {
    // 初始化主题管理
    const themeManager = new ThemeManager();
    themeManager.init();

    // 初始化语言切换按钮
    const languageToggle = new LanguageToggle();
    languageToggle.addLanguageSelector();
  } catch (error) {
    console.error('Error initializing page:', error);
  }
};

// 监听页面加载，初始化按钮和主题状态
resourceTracker.addEventListener(document, 'DOMContentLoaded', initializePage);

// 页面卸载时的清理
resourceTracker.addEventListener(window, 'beforeunload', () => {
  resourceTracker.cleanup();
});