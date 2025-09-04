// theme.js - Theme management functionality

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemPreference();
    this.init();
  }

  init() {
    // Apply the current theme
    this.applyTheme(this.currentTheme);
    
    // Set up theme toggle listeners
    this.setupToggleListeners();
    
    // Listen for system theme changes
    this.setupSystemThemeListener();
  }

  getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  setStoredTheme(theme) {
    localStorage.setItem('theme', theme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.setStoredTheme(theme);
    
    // Update toggle button text/icon
    this.updateToggleButton();
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  updateToggleButton() {
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    const icon = this.currentTheme === 'light' ? 'fa-moon' : 'fa-sun';
    const text = this.currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    
    toggleButtons.forEach(button => {
      const iconElement = button.querySelector('i');
      const textElement = button.querySelector('.theme-text');
      
      if (iconElement) {
        iconElement.className = `fas ${icon}`;
      }
      
      if (textElement) {
        textElement.textContent = text;
      }
    });
  }

  setupToggleListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-toggle')) {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  setupSystemThemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Method to create theme toggle button
  static createToggleButton(className = 'theme-toggle') {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = `
      <i class="fas fa-moon"></i>
      <span class="theme-text">Dark Mode</span>
    `;
    return button;
  }

  // Method to add toggle to existing element
  static addToggleToElement(element, className = 'theme-toggle') {
    const button = ThemeManager.createToggleButton(className);
    element.appendChild(button);
    return button;
  }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}