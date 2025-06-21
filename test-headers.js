// --- MD5 Hashing Function (Simple Implementation) ---
// Based on https://github.com/blueimp/JavaScript-MD5
/*
 * JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/* eslint-disable */
function md5(string) {
  function safeAdd(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff)
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
  }

  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt))
  }

  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
  }
  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t)
  }

  function binlMD5(x, len) {
    x[len >> 5] |= 0x80 << (len % 32)
    x[(((len + 64) >>> 9) << 4) + 14] = len

    var i
    var olda
    var oldb
    var oldc
    var oldd
    var a = 1732584193
    var b = -271733879
    var c = -1732584194
    var d = 271733878

    for (i = 0; i < x.length; i += 16) {
      olda = a
      oldb = b
      oldc = c
      oldd = d

      a = md5ff(a, b, c, d, x[i], 7, -680876936)
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)

      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
      b = md5gg(b, c, d, a, x[i], 20, -373897302)
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)

      a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
      d = md5hh(d, a, b, c, x[i], 11, -358537222)
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)

      a = md5ii(a, b, c, d, x[i], 6, -198630844)
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
      d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
      b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
      d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
      b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
      d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
      b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)

      a = safeAdd(a, olda)
      b = safeAdd(b, oldb)
      c = safeAdd(c, oldc)
      d = safeAdd(d, oldd)
    }
    return [a, b, c, d]
  }

  function binl2rstr(input) {
    var i
    var output = ''
    var length32 = input.length * 32
    for (i = 0; i < length32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff)
    }
    return output
  }

  function rstr2binl(input) {
    var i
    var output = []
    output[(input.length >> 2) - 1] = undefined
    for (i = 0; i < output.length; i += 1) {
      output[i] = 0
    }
    var length8 = input.length * 8
    for (i = 0; i < length8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32)
    }
    return output
  }

  function rstrMD5(s) {
    return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
  }

  function rstr2hex(input) {
    var hexTab = '0123456789abcdef'
    var output = ''
    var x
    var i
    for (i = 0; i < input.length; i += 1) {
      x = input.charCodeAt(i)
      output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
    }
    return output
  }

  function str2rstrUTF8(input) {
    // 使用 decodeURIComponent 替代已弃用的 unescape
    return decodeURIComponent(encodeURIComponent(input))
  }

  function rawMD5(s) {
    return rstrMD5(str2rstrUTF8(s))
  }
  function hexMD5(s) {
    return rstr2hex(rawMD5(s))
  }

  return hexMD5(string)
}
/* eslint-enable */
// --- End MD5 Hashing Function ---

// --- 新增功能：浏览器兼容性检查 ---
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = "未知浏览器";
  let browserVersion = "未知版本";
  let fullVersion = "";

  let tem;
  let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    browserName = 'Internet Explorer';
    browserVersion = tem[1] || '';
    fullVersion = browserVersion;
  } else if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge|Edg)\/(\d+)/);
    if (tem != null) {
      const browserParts = tem.slice(1);
      if (browserParts[0].startsWith('Edg')) browserParts[0] = 'Edge (Chromium)';
      else if (browserParts[0] === 'Edge') browserParts[0] = 'Edge (Legacy)';
      browserName = browserParts.join(' ').replace('OPR', 'Opera');
      browserVersion = browserParts.length > 1 ? browserParts[1] : '';
      fullVersion = ua.match(/\b(OPR|Edge|Edg)\/([\d.]+)/) ? ua.match(/\b(OPR|Edge|Edg)\/([\d.]+)/)[2] : browserVersion;
    } else {
      browserName = 'Chrome';
      browserVersion = M[2];
      fullVersion = ua.match(/\bChrome\/([\d.]+)/) ? ua.match(/\bChrome\/([\d.]+)/)[1] : browserVersion;
    }
  } else if (M[1] === 'Firefox') {
    browserName = 'Firefox';
    browserVersion = M[2];
    fullVersion = ua.match(/\bFirefox\/([\d.]+)/) ? ua.match(/\bFirefox\/([\d.]+)/)[1] : browserVersion;
  } else if (M[1] === 'Safari') {
    tem = ua.match(/version\/(\d+)/i);
    browserName = 'Safari';
    browserVersion = tem ? tem[1] : M[2];
    fullVersion = ua.match(/version\/([\d.]+)/i) ? ua.match(/version\/([\d.]+)/i)[1] : browserVersion;
  } else if (M[1] === 'MSIE') {
    browserName = 'Internet Explorer';
    browserVersion = M[2];
    fullVersion = browserVersion;
  } else {
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    browserName = M[0];
    browserVersion = M[1];
    fullVersion = M[1];
  }
  
  let os = "未知操作系统";
  if (navigator.appVersion.indexOf("Win")!=-1) os="Windows";
  if (navigator.appVersion.indexOf("Mac")!=-1) os="MacOS";
  if (navigator.appVersion.indexOf("X11")!=-1) os="UNIX";
  if (navigator.appVersion.indexOf("Linux")!=-1) os="Linux";

  return {
    name: browserName,
    version: browserVersion,
    fullVersion: fullVersion || browserVersion,
    os: os,
    userAgent: ua
  };
}

function checkApiSupport() {
  const apis = [
    { name: 'localStorage', supported: typeof localStorage !== 'undefined' },
    { name: 'sessionStorage', supported: typeof sessionStorage !== 'undefined' },
    { name: 'IndexedDB', supported: !!window.indexedDB },
    { name: 'WebSockets', supported: 'WebSocket' in window || 'MozWebSocket' in window },
    { name: 'Promises', supported: typeof Promise !== 'undefined' && Promise.toString().indexOf('[native code]') !== -1 },
    { name: 'fetch API', supported: typeof fetch === 'function' },
    { name: 'Service Workers', supported: 'serviceWorker' in navigator },
    { name: 'Intl (Internationalization)', supported: typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function' },
    { name: 'URL API (URLSearchParams)', supported: typeof URL !== 'undefined' && typeof URLSearchParams !== 'undefined' },
    { name: 'Beacon API', supported: 'sendBeacon' in navigator },
    { name: 'WebRTC (RTCPeerConnection)', supported: !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection) },
    { name: 'WebGL', supported: (function() { try { const canvas = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))); } catch(e) { return false; } })() }
  ];
  return apis;
}

function performCompatibilityChecks() {
  const browserInfoEl = document.getElementById('browserInfoDisplay');
  const apiListEl = document.getElementById('apiCompatibilityList');

  const browser = getBrowserInfo();
  if (browserInfoEl) {
    browserInfoEl.textContent = `${browser.name} ${browser.fullVersion} on ${browser.os}`;
  }

  if (apiListEl) {
    apiListEl.innerHTML = ''; 
    const apis = checkApiSupport();
    apis.forEach(api => {
      const listItem = document.createElement('li');
      listItem.className = `list-group-item d-flex justify-content-between align-items-center ${api.supported ? 'list-group-item-success' : 'list-group-item-danger'}`;
      
      const apiNameSpan = document.createElement('span');
      apiNameSpan.textContent = api.name;
      
      const badgeSpan = document.createElement('span');
      badgeSpan.className = `badge ${api.supported ? 'bg-success' : 'bg-danger'}`; 
      badgeSpan.textContent = api.supported ? '支持' : '不支持';
      
      listItem.appendChild(apiNameSpan);
      listItem.appendChild(badgeSpan);
      apiListEl.appendChild(listItem);
    });
  }
}
// --- 兼容性检查功能结束 ---

// 获取并显示当前请求头 (并行请求与超时)
async function fetchAndDisplayHeaders() {
  const headerInfoElement = document.getElementById('headerInfo');
  const headerLanguageInfo = document.getElementById('headerLanguageInfo');
  headerInfoElement.textContent = '正在获取请求头信息...';
  headerLanguageInfo.textContent = '正在检测...';

  const timestamp = new Date().getTime();
  const TIMEOUT_MS = 5000; 

  const urls = [
    `https://postman-echo.com/headers?_=${timestamp}`,
    `https://httpbin.org/headers?_=${timestamp}`,
    `https://header-echo.addr.tools/?_=${timestamp}`,
  ];

  function processHeadersData(data) {
    const headers = data.headers;
    let formattedHeaders = JSON.stringify(headers, null, 2);
    headerInfoElement.textContent = formattedHeaders; 

    const existingAlertInfoP = headerInfoElement.parentElement.querySelector('p.mt-2');
    if (existingAlertInfoP) {
        existingAlertInfoP.remove();
    }

    const acceptLanguage = headers['Accept-Language'] || headers['accept-language'];

    if (acceptLanguage) {
      console.log('检测到的Accept-Language:', acceptLanguage);
      headerLanguageInfo.innerHTML = `
        <p class="mb-1"><strong>当前值:</strong></p>
        <p class="text-success fw-bold">${acceptLanguage}</p>
        <p class="mb-0 mt-2 small text-muted">通过请求头检测</p>
      `;
    } else {
      console.log('未检测到Accept-Language请求头');
      headerLanguageInfo.innerHTML = `
        <p class="text-warning">未检测到Accept-Language请求头</p>
        <p class="mt-2">请自行跳转到 <a href="https://webcha.cn/" target="_blank">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank">https://www.browserscan.net/zh</a> 进行查看。</p>
      `;
    }
  }

  function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status} 来自 ${url}`);
      }
      return response.json();
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`请求 ${url} 超时 (${timeoutMs}ms)`);
      }
      throw error;
    });
  }

  try {
    const promises = urls.map(url => fetchWithTimeout(url, TIMEOUT_MS));
    const firstSuccessfulResponse = await Promise.any(promises);
    processHeadersData(firstSuccessfulResponse);
  } catch (error) {
    console.error('所有获取请求头的尝试都失败了:', error);
    let combinedErrorMessage = '获取请求头信息失败 (所有服务均失败或超时)。';
    if (error instanceof AggregateError) {
        combinedErrorMessage += ' 详细错误: ' + error.errors.map(e => e.message || e).join('; ');
    }
    headerInfoElement.textContent = combinedErrorMessage;
    headerLanguageInfo.innerHTML = `
      <p class="text-danger">检测失败 (所有服务均失败或超时)。</p>
      <p class="small text-muted">${error.errors ? error.errors.map(e => e.message || e).join('; ') : (error.message || error)}</p>
      <p class="mt-2">请自行跳转到 <a href="https://webcha.cn/" target="_blank">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank">https://www.browserscan.net/zh</a> 进行查看。</p>
    `;
  }
}

// 检测 JavaScript 语言偏好
function detectJsLanguage() {
  const jsLanguageInfoElement = document.getElementById('jsLanguageInfo');
  try {
    const lang = navigator.language || 'N/A';
    const langs = navigator.languages ? navigator.languages.join(', ') : 'N/A';
    jsLanguageInfoElement.innerHTML = `
      <p class="mb-1"><strong>navigator.language:</strong></p>
      <p class="text-info fw-bold">${lang}</p>
      <p class="mb-1 mt-2"><strong>navigator.languages:</strong></p>
      <p class="text-info fw-bold">${langs}</p>
      <p class="mb-0 mt-2 small text-muted">通过 JavaScript 检测</p>
    `;
    console.log('JS Language:', { language: lang, languages: langs });
  } catch (error) {
    jsLanguageInfoElement.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
    console.error('JS 语言检测失败:', error);
  }
}

// 检测 Canvas 指纹
function detectCanvasFingerprint() {
  const canvasInfoElement = document.getElementById('canvasFingerprintInfo');
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'BrowserLeaks,com <canvas> 1.0';
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText(txt, 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText(txt, 4, 17);

    const dataUrl = canvas.toDataURL();
    const fingerprint = md5(dataUrl);

    canvasInfoElement.innerHTML = `
      <p class="mb-1"><strong>Canvas hash:</strong></p>
      <p class="text-dark fw-bold small">${fingerprint}</p>
      <p class="mb-0 mt-2 small text-muted">通过 Canvas API 检测</p>
    `;
    console.log('Canvas Fingerprint (MD5):', fingerprint);
  } catch (error) {
    canvasInfoElement.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
    console.error('Canvas 指纹检测失败:', error);
  }
}

// 检测 WebGL 指纹
function detectWebglFingerprint() {
  const webglInfoElement = document.getElementById('webglFingerprintInfo');
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      webglInfoElement.innerHTML = '<p class="text-warning">WebGL 不支持或已禁用。</p>';
      console.warn('WebGL not supported');
      return;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'N/A';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'N/A';
    const version = gl.getParameter(gl.VERSION) || 'N/A';
    const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || 'N/A';

    const fingerprintData = `${vendor} | ${renderer} | ${version} | ${shadingLanguageVersion}`;
    const fingerprint = md5(fingerprintData);

    webglInfoElement.innerHTML = `
      <p class="mb-1"><strong>WebGL hash:</strong></p>
      <p class="text-dark fw-bold small">${fingerprint}</p>
      <p class="mb-1 mt-2"><strong>WebGL unmasked vendor:</strong></p>
      <p class="text-dark small">${vendor}</p>
      <p class="mb-1 mt-2"><strong>WebGL unmasked renderer:</strong></p>
      <p class="text-dark small">${renderer}</p>
      <p class="mb-1 mt-2"><strong>WebGL version:</strong></p>
      <p class="text-dark small">${version}</p>
      <p class="mb-1 mt-2"><strong>Shading Language Version:</strong></p>
      <p class="text-dark small">${shadingLanguageVersion}</p>
      <p class="mb-0 mt-2 small text-muted">通过 WebGL API 检测</p>
    `;
    console.log('WebGL Fingerprint (MD5):', fingerprint);
    console.log('WebGL Details:', { vendor, renderer, version, shadingLanguageVersion });
  } catch (error) {
    webglInfoElement.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
    console.error('WebGL 指纹检测失败:', error);
  }
}

// 检测 AudioContext 指纹 (异步)
async function detectAudioFingerprint() {
  const audioInfoElement = document.getElementById('audioFingerprintInfo');
  audioInfoElement.innerHTML = '<p>检测中...</p>';
  try {
    const audioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!audioCtx) {
      audioInfoElement.innerHTML = '<p class="text-warning">AudioContext 不支持。</p>';
      console.warn('AudioContext not supported');
      return;
    }

    const context = new audioCtx(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    const renderedBuffer = await context.startRendering();
    const bufferData = renderedBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) {
        if (bufferData[i]) {
            sum += Math.abs(bufferData[i]);
        }
    }
    const fingerprintData = sum.toString();
    const fingerprint = md5(fingerprintData);

    audioInfoElement.innerHTML = `
      <p class="mb-1"><strong>AudioContext hash:</strong></p>
      <p class="text-dark fw-bold small">${fingerprint}</p>
      <p class="mb-0 mt-2 small text-muted">通过 AudioContext API 检测</p>
    `;
    console.log('Audio Fingerprint (MD5):', fingerprint);

  } catch (error) {
    audioInfoElement.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
    console.error('AudioContext 指纹检测失败:', error);
  }
}

// 检测国际化 API
function detectIntlApi() {
  const intlApiInfoElement = document.getElementById('intlApiInfo');
  try {
    const dateTimeLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'N/A';
    const numberFormatLocale = Intl.NumberFormat().resolvedOptions().locale || 'N/A';
    intlApiInfoElement.innerHTML = `
      <p class="mb-1"><strong>DateTimeFormat Locale:</strong></p>
      <p class="text-secondary fw-bold">${dateTimeLocale}</p>
      <p class="mb-1 mt-2"><strong>NumberFormat Locale:</strong></p>
      <p class="text-secondary fw-bold">${numberFormatLocale}</p>
      <p class="mb-0 mt-2 small text-muted">通过 Intl API 检测</p>
    `;
    console.log('Intl API Locale:', { dateTime: dateTimeLocale, numberFormat: numberFormatLocale });
  } catch (error) {
    intlApiInfoElement.innerHTML = `<p class="text-danger">检测失败: ${error.message}</p>`;
    console.error('Intl API 检测失败:', error);
  }
}

// 检测 WebRTC IP 泄露
function detectWebRtc() {
  const webRtcInfoElement = document.getElementById('webRtcInfo');
  webRtcInfoElement.innerHTML = '<p>正在尝试检测 WebRTC 本地 IP...</p>';
  let ips = [];

  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel(''); 
    pc.onicecandidate = (e) => {
      if (!e || !e.candidate || !e.candidate.candidate) return;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/i;
      const ipMatch = ipRegex.exec(e.candidate.candidate);
      if (ipMatch && ips.indexOf(ipMatch[1]) === -1) {
        ips.push(ipMatch[1]);
      }
    };
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(err => console.error('WebRTC setLocalDescription 失败:', err));

    setTimeout(() => {
      pc.close(); 
      if (ips.length > 0) {
        webRtcInfoElement.innerHTML = `
          <p class="mb-1"><strong>WebRTC 本地 IP 地址 (用于连接优化):</strong></p>
          <p class="small text-muted mb-1">这是 WebRTC 的正常行为，有助于建立直接连接，但也可能暴露您的本地网络 IP 地址。</p>
          <ul class="list-unstyled mb-0">
            ${ips.map(ip => `<li class="text-info fw-bold">${ip}</li>`).join('')}
          </ul>
          <p class="mb-0 mt-2 small text-muted">通过 WebRTC 检测</p>
        `;
        console.info('WebRTC 检测到本地 IP (正常行为):', ips);
      } else {
        webRtcInfoElement.innerHTML = '<p class="text-success">未检测到 WebRTC 本地 IP 地址暴露。</p><p class="mb-0 mt-2 small text-muted">通过 WebRTC 检测</p>';
        console.log('WebRTC 未检测到本地 IP');
      }
    }, 1000); 
  } catch (error) {
    webRtcInfoElement.innerHTML = `<p class="text-danger">WebRTC 检测失败或不受支持: ${error.message}</p>`;
    console.error('WebRTC 检测失败:', error);
  }
}

// 检测部分浏览器指纹信息
function detectFingerprint() {
  const fingerprintInfoElement = document.getElementById('fingerprintInfo');
  try {
    const ua = navigator.userAgent || 'N/A';
    const screenRes = `${screen.width}x${screen.height}x${screen.colorDepth}` || 'N/A';
    const timezoneOffset = new Date().getTimezoneOffset();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'N/A';
    const plugins = navigator.plugins ? Array.from(navigator.plugins).map(p => p.name).join(', ') : 'N/A (受限)';

    fingerprintInfoElement.innerHTML = `
      <p class="mb-1"><strong>User Agent:</strong></p>
      <p class="text-success small">${ua}</p>
      <p class="mb-1 mt-2"><strong>Screen information:</strong></p>
      <p class="text-success fw-bold">${screenRes}</p>
      <p class="mb-1 mt-2"><strong>Timezone:</strong></p>
      <p class="text-success fw-bold">${timezone} (Offset: ${timezoneOffset})</p>
      <p class="mb-1 mt-2"><strong>Plugins:</strong></p>
      <p class="text-success small">${plugins}</p>
      <p class="mb-0 mt-2 small text-muted">部分浏览器指纹信息</p>
    `;
    console.log('Fingerprint Info:', { ua, screenRes, timezone, timezoneOffset, plugins });
  } catch (error) {
    fingerprintInfoElement.innerHTML = `<p class="text-danger">指纹检测失败: ${error.message}</p>`;
    console.error('指纹检测失败:', error);
  }
}

// 页面加载完成后获取请求头和执行其他检测
window.addEventListener('DOMContentLoaded', function() {
  // 延迟执行，确保扩展规则已应用
  setTimeout(function() {
    fetchAndDisplayHeaders();
    detectJsLanguage();
    detectIntlApi();
    detectWebRtc();
    detectFingerprint();
    detectCanvasFingerprint();
    detectWebglFingerprint();
    detectAudioFingerprint(); // 异步
    performCompatibilityChecks(); // 兼容性检查
  }, 1000);

  // 添加刷新按钮功能
  const refreshButton = document.createElement('button');
  refreshButton.className = 'btn btn-primary mt-3';
  refreshButton.textContent = '刷新检测信息'; // 修改了按钮文字
  refreshButton.onclick = function() {
    fetchAndDisplayHeaders();
    detectJsLanguage();
    detectIntlApi();
    detectWebRtc();
    detectFingerprint();
    detectCanvasFingerprint();
    detectWebglFingerprint();
    detectAudioFingerprint(); // 异步
    performCompatibilityChecks(); // 新增：刷新时也执行兼容性检查
  };
  
  // 尝试将刷新按钮添加到特定的 .header-info.mt-4 div
  const headerInfoDiv = document.querySelector('.header-info.mt-4'); 
  if (headerInfoDiv) {
     headerInfoDiv.appendChild(refreshButton);
  } else {
     // 如果特定的div找不到，尝试添加到 class 为 container 的元素内最后一个 class 为 header-info 的元素
     const container = document.querySelector('.container');
     if (container) {
         const allHeaderInfoDivs = container.querySelectorAll('.header-info');
         if (allHeaderInfoDivs.length > 0) {
             allHeaderInfoDivs[allHeaderInfoDivs.length - 1].appendChild(refreshButton);
         } else {
              // 如果还是找不到，就直接附加到 container 的末尾，位置可能不理想
              container.appendChild(refreshButton);
              console.warn("未能精确找到 .header-info 用于附加刷新按钮，按钮已附加到 .container 末尾。");
         }
     } else {
         console.error("未能找到 .container 用于附加刷新按钮。");
     }
  }
});