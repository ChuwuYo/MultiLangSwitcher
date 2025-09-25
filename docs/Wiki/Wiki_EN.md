# MultiLangSwitcher Developer Wiki

## Overview

MultiLangSwitcher is a Chrome extension based on Manifest V3 that switches website languages by dynamically modifying the `Accept-Language` HTTP request header. This Wiki integrates the project's core architecture, technical specifications, and development guidelines.

## Table of Contents

- [Product Overview](#product-overview)
- [Core Architecture](#core-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Code Style Guide](#code-style-guide)
- [Development Guide](#development-guide)
- [Performance Requirements](#performance-requirements)
- [Related Documents](#related-documents)

## Product Overview

### Core Features
- **Manual Language Selection**: Switch languages through the popup interface.
- **Custom Language Header**: Supports custom `Accept-Language` request header strings.
- **Automatic Domain Switching**: Automatic language matching based on TLD and second-level domains.
- **Real-time Header Verification**: Real-time request header verification via `detect.html`.
- **English Fallback Mechanism**: Defaults to English for unmatched domains.

### Design Principles
- Uses the latest Manifest V3 standard.
- Pure JavaScript/HTML/CSS implementation, no build system.
- Modular architecture with high code reusability.
- Full internationalization support.
- Robust error handling and fallback mechanisms.

## Core Architecture

### Service Worker Model

```
background.js (Central Service Worker)
├── Manages all extension logic
├── Exclusively manages declarativeNetRequest rules
├── Implements exponential backoff retry mechanism
└── Handles domain-based automatic switching
```

**Key Requirements:**
- `background.js` is the only service worker.
- Must exclusively manage `declarativeNetRequest` rules.
- Must implement a messaging mechanism.
- Must handle tab monitoring and automatic switching.

### Service Worker Initialization and State Management

To handle the fact that a Service Worker can go dormant and restart at any time in Manifest V3, the project uses a robust initialization and state management mechanism to ensure the extension runs correctly at all times.

**Core Principles:**
- **Unified Initialization Entry Point**: All logic related to state restoration (e.g., extension installation, browser startup, unexpected Service Worker restart) is handled by a single `initialize` function to ensure consistent behavior.
- **Lazy Loading and Event-Driven**: Initialization is not performed immediately when the script loads, but is triggered by a guard function `ensureInitialized` the first time state needs to be accessed or a critical event is handled (e.g., `onMessage`, `onUpdated`). This avoids unnecessary upfront work and ensures that the state is ready before any operation is performed.
- **Idempotency**: The initialization process is idempotent. Even if called multiple times, it will only execute effectively once, preventing duplicate operations and state conflicts.

**Implementation Pattern:**
```javascript
// background.js

// Global initialization Promise to prevent duplicate execution
let initializationPromise = null;
// State flag indicating if initialization is complete
let isInitialized = false;

// Guard function: call before performing any operation that requires state
const ensureInitialized = async () => {
 if (!isInitialized) {
   await initialize('lazy'); // Trigger if not initialized
 }
};

// Unified initialization function
const initialize = (reason) => {
 if (initializationPromise) {
   return initializationPromise; // Return existing Promise if in progress
 }
 
 initializationPromise = (async () => {
   // ...execute all initialization logic...
   isInitialized = true; // Mark as complete
 })();
 
 return initializationPromise;
};

// Apply the guard in event listeners
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
 (async () => {
   await ensureInitialized(); // ✅ Ensure state is ready
   // ...handle message...
 })();
 return true;
});
```

### Component Architecture

```
MultiLangSwitcher/
├── root/                       # Main extension files
│   ├── popup.js              # Popup UI logic
│   ├── debug-ui.js           # Debug UI logic
│   └── background.js         # Background Service Worker
├── /shared/                  # Shared utility library (must be used)
│   ├── shared-utils.js       # Logging, language detection, fallback translation system
│   ├── shared-actions.js     # Message passing constants
│   ├── shared-language-options.js  # Language options utility
│   ├── shared-update-checker.js    # Update check functionality
│   └── shared-i18n-base.js   # Base internationalization functionality
├── /i18n/                    # Internationalization system
│   ├── {component}-{lang}.js # Translation files
│   └── {component}-i18n.js   # Internationalization class definitions
└── domain-rules-manager.js   # Domain rules management
```

## Technology Stack

### Required Technologies
- **Manifest V3**: Latest manifest version for Chrome extensions.
- **JavaScript**: ES6+ syntax, external frameworks disabled.
- **Bootstrap 5**: Use existing `bootstrap.min.css` for UI styling.
- **Chrome Extension APIs**:
  - `declarativeNetRequest` - The only method for modifying request headers.
  - `storage.local` - Settings persistence.
  - `tabs` - Tab monitoring for automatic switching.
  - `runtime` - Inter-component message passing.

### Architectural Patterns

#### Fallback Translation System
```
Translation Priority:
1. Primary: Component-specific i18n instances (popupI18n, backgroundI18n, etc.)
2. Secondary: Cross-component translation objects (popupEn, backgroundZh, etc.)
3. Tertiary: Built-in fallback translations in shared-utils.js
4. Auto-detection: Browser language → localStorage → Fallback to English
```

**Key Functions:**
- `getFallbackTranslation()` - Gets fallback translation.
- `getUpdateTranslation()` - Gets update-related translations.
- `sendLocalizedUpdateLog()` - Sends localized debug logs.

#### Message Passing
- Must use `chrome.runtime.sendMessage` for background ↔ UI communication.
- Implement event-driven inter-component updates.
- Must debounce UI updates.

#### Storage Management
- Must persist settings via `chrome.storage.local`.
- Store domain rules in `domain-rules.json`, supporting runtime customization.
- Cache custom rules in browser storage for performance.

## Project Structure

For a detailed project structure, please refer to: [Project Structure Document](./Project_Structure.md)

### File Naming Conventions (Mandatory)

#### JavaScript Files
- **UI Components**: `{page}.js` (popup.js, debug-ui.js)
- **Shared Modules**: `shared-*.js` prefix
- **Managers**: `*-manager.js` suffix
- **Internationalization Files**: `{component}-{lang}.js` and `{component}-i18n.js`

#### HTML Files
- **Extension Pages**: `{function}.html` (popup.html, debug.html)
- **Test Tools**: `test-*.html` prefix

## Code Style Guide

For a detailed code style guide, please refer to: [Code Style Guide](./Code_Style_Guide.md)

### JavaScript Requirements
- **ES6+ Features**: async/await, arrow functions, destructuring, template literals.
- **Variable Declarations**: Use `const`/`let` - do not use `var`.
- **Asynchronous Operations**: Wrap all async operations in try/catch blocks.
- **Module Imports**: Import shared utilities from the `/shared/` directory.

### Error Handling
- **Unified Error Handling Pattern**: Use an early return pattern to avoid deeply nested if-else chains.
- **Exponential Backoff Retry Mechanism**: Implement smart retries for all Chrome API calls, including error classification and retry decisions.
- **Modular Retry Logic**: Split complex retry logic into dedicated helper methods to improve maintainability.
- **Avoid Duplicate Handling**: Ensure the same error is handled only once to avoid redundant calls to error handlers and improve performance.
- **Error Enhancement Mechanism**: Provide detailed error information and fallback suggestions for final failures.
- **Debug Logging**: Log all errors using the `sendDebugLog()` function from shared utilities.
- **Graceful Fallback Solutions**: Provide user-friendly fallback mechanisms for failed operations.
- **User-Friendly Hints**: Display clear error messages and resolution suggestions in UI components.

### Component Creation Rules
1. Place the main file in the root directory.
2. Create corresponding internationalization files in `/i18n/`.
3. Always import shared utilities from `/shared/` - no duplicate code.
4. Strictly follow the established naming conventions.

## Development Guide

### Development Workflow
- **Pure Tech Stack**: JavaScript/HTML/CSS, no build system.
- **Development Testing**: Load as an unpacked extension for development.
- **Request Header Verification**: Use `detect.html` for real-time verification.
- **Rule Checking**: Use `debug.html` for rule checking and troubleshooting.

### Testing Strategy
- Test domain switching with multiple tabs.
- Test various TLD patterns.
- Verify automatic switching and manual selection features.
- Test error handling and fallback mechanisms.

## Performance Requirements

### Background Script Optimization
- Minimize background script execution time and memory usage.
- Use efficient domain matching algorithms (avoid regex where possible).
- Batch and precisely process `declarativeNetRequest` rule updates, targeting only specific rule IDs to avoid affecting other rules.
- Cache domain rules in memory for fast lookups.

#### Domain Matching Algorithm
The project implements an efficient domain matching algorithm that supports multiple matching patterns and intelligent language recognition, providing core support for the "Auto-Switch Language" feature.

**Algorithm Architecture:**
- **Multi-layer Matching Strategy**: Full domain match, language subdomain recognition, second-level domain match, TLD match.
- **Cache System**: Domain query cache and resolution cache, using an LRU strategy to manage memory.
- **Rule Preprocessing**: Group rules by type at startup to improve lookup efficiency.

**Core Features:**
- **Traditional Domain Matching**: Language recognition based on TLD and second-level domains.
- **Modern Website Support**: Recognizes language subdomain patterns like `cn.bing.com`, `zh-hans.react.dev`.
- **Intelligent Inference**: Infers language code from language subdomains when a rule match fails.
- **Performance Optimization**: Multi-layer caching mechanism significantly improves performance for repeated queries.

**Usage Example:**
```javascript
// Basic domain language recognition
const language = await domainRulesManager.getLanguageForDomain('example.com');

// Supported matching patterns
'baidu.com' → 'zh-CN'        // Full domain match
'cn.bing.com' → 'zh-CN'      // Language subdomain recognition
'google.co.jp' → 'ja'        // Second-level domain match
'example.de' → 'de-DE'       // TLD match

// Management functions
domainRulesManager.getCacheStats();      // Cache statistics
domainRulesManager.clearCache();         // Clear cache
```

For more details, please refer to: [Domain Matching Guide](./Domain_Matching_Guide.md)

### UI Performance
- Debounce UI updates to prevent excessive re-rendering.
- Batch DOM operations.
- Use event delegation to reduce the number of event listeners.

## Resource Management Architecture

### Unified Resource Management Strategy

The project adopts a unified resource management architecture to ensure memory safety and performance stability of the browser extension. Resource management mainly involves the correct creation, tracking, and cleanup of browser resources such as event listeners, timers, and message listeners.

#### Core Design Principles
- **Environment Adaptation**: Adopt different resource management strategies based on different runtime environments (page environment vs Service Worker environment)
- **Unified Interface**: All resource operations are managed through a unified `resourceTracker` object
- **Automatic Cleanup**: Automatically clean up resources at appropriate lifecycle nodes to prevent memory leaks
- **Performance Optimization**: Resource management itself occupies minimal memory overhead

#### Environment-Specific Strategies

| Environment Type | Applicable Files | Managed Resources | Cleanup Timing | Complexity |
|-----------------|-----------------|-------------------|----------------|------------|
| Page Environment | `debug-ui.js`, `popup.js`, `toggle.js` | Event listeners, timers, message listeners | `beforeunload` | High |
| Service Worker Environment | `background.js` | Timers | `onSuspend` | Low |

#### Resource Management Best Practices
- **Page Environment**: Manage all types of resources, including DOM event listeners and Chrome API message listeners
- **Service Worker Environment**: Only manage temporary resources like timers; Chrome API event listeners are automatically managed by the system
- **Unified Cleanup**: Clean up all tracked resources when the page unloads or Service Worker suspends
- **Error Safety**: Resource operations include appropriate error handling to avoid cleanup failures affecting functionality

For detailed information, please refer to: [Resource Management Best Practices Guide](./Resource_Management_Guide.md)

## Related Documents

### Core Documents
- [Code Style Guide](./Code_Style_Guide.md) - Detailed code specifications and best practices.
- [Project Structure Document](./Project_Structure.md) - Complete project file structure explanation.
- [I18n Usage Guide](./I18n_Usage_Guide.md) - How to use the internationalization system.
- [Resource Management Best Practices Guide](./Resource_Management_Guide.md) - Resource management architecture and best practices.

### Development Documents
- [Update Log](./Update.md) - Version update records.
- [TODO List](./TODO.md) - To-be-completed features and improvement items.

### GitHub Repository
- Project Address: https://github.com/ChuwuYo/MultiLangSwitcher

## Contribution Guide

### Pre-development Preparation
1. Read this Wiki and related documents.
2. Understand the Chrome Extension Manifest V3 specification.
3. Familiarize yourself with the project's code style and architectural patterns.

### Code Submission Guidelines
1. Follow the project's code style guide.
2. Ensure all new features have corresponding error handling.
3. Add appropriate debug logs and comments.
4. Test feature behavior in different scenarios.

### Issue Reporting
- Use `debug.html` to collect debug information.
- Provide detailed steps to reproduce.
- Include browser version and extension version information.