import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { GeminiApiService } from './gemini-api.service';
import hljs from 'highlight.js';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';
import { filter } from 'rxjs/operators';

interface HistoryItem {
  timestamp: Date;
  prompt: string;
  code: string;
  language: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'AutoCoder';
  generatedContent: string = '';
  prompt: string = '';
  isLoading: boolean = false;
  copied: boolean = false;
  isDarkMode: boolean = true; // Default to dark mode
  selectedLanguage: string = 'javascript';
  highlightedCode: SafeHtml = '';
  history: HistoryItem[] = [];
  askmeanything: boolean = true;
  iframeSrc: SafeResourceUrl | null = null;
  showPreview: boolean = false;
  currentPreviewSize: string = 'desktop';
  isAuthenticated: boolean = false; // Add authentication state
  showAuthModal: boolean = false; // Control auth modal visibility
  isDashboard: boolean = false; // Track if current route is dashboard
  quickExamples = [
    { title: 'Todo App', prompt: 'Create a modern todo application with add, edit, delete, and mark complete functionality. Include drag and drop reordering, local storage persistence, and a clean responsive design with dark mode support.', language: 'html' },
    { title: 'Weather Widget', prompt: 'Build a beautiful weather widget component that displays current weather, 5-day forecast, and has smooth animations. Include location detection and multiple city support.', language: 'javascript' },
    { title: 'Login Form', prompt: 'Design a modern login form with email validation, password strength indicator, social login buttons, and smooth hover animations. Include responsive design and accessibility features.', language: 'html' },
    { title: 'Dashboard Cards', prompt: 'Create a set of dashboard cards showing statistics with animated counters, progress bars, and charts. Include hover effects and a modern gradient design.', language: 'css' },
    { title: 'Shopping Cart', prompt: 'Build a shopping cart component with add/remove items, quantity controls, price calculations, and checkout flow. Include animations and responsive design.', language: 'react' }
  ];

  constructor(
    private geminiApi: GeminiApiService,
    private sanitizer: DomSanitizer,
    private clipboard: Clipboard,
    private router: Router
  ) {
    // Load dark mode preference (default to true for dark mode)
    this.isDarkMode = localStorage.getItem('darkMode') !== 'false';
    // Check authentication status
    this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    // Load history from localStorage
    const savedHistory = localStorage.getItem('codeHistory');
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
    }

    // Subscribe to router events to detect dashboard route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navigationEvent = event as NavigationEnd;
      this.isDashboard = navigationEvent.url.includes('/dashboard') || navigationEvent.url.includes('/login');
    });
  }

  ngOnInit() {
    // Apply initial theme - always dark
    this.isDarkMode = true;
    this.applyTheme();
    // Also apply to document
    document.documentElement.classList.add('dark');
    document.body.classList.add('bg-gray-900', 'text-white');
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyTheme();
  }

  private applyTheme() {
    // Always apply dark theme
    document.documentElement.classList.add('dark');
    document.body.classList.add('bg-gray-900', 'text-white');
    document.body.classList.remove('bg-white', 'text-black');
  }



  private createPreview(code: string) {
    // Clean up any previous blob URL
    if (this.iframeSrc) {
      const url = this.iframeSrc.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }

    // Create new blob URL for the iframe
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.showPreview = true;

    // Clean up blob URL after 10 seconds
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  private highlightCode() {
    if (this.generatedContent) {
      const highlighted = hljs.highlight(this.generatedContent, {
        language: this.selectedLanguage
      }).value;
      this.highlightedCode = this.sanitizer.bypassSecurityTrustHtml(highlighted);
    }
  }

  copyToClipboard() {
    if (this.generatedContent) {
      this.clipboard.copy(this.generatedContent);
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    }
  }

  private addToHistory() {
    const historyItem: HistoryItem = {
      timestamp: new Date(),
      prompt: this.prompt,
      code: this.generatedContent,
      language: this.selectedLanguage
    };

    this.history.unshift(historyItem);
    if (this.history.length > 10) {
      this.history.pop();
    }

    localStorage.setItem('codeHistory', JSON.stringify(this.history));
  }

  loadFromHistory(item: HistoryItem) {
    this.prompt = item.prompt;
    this.selectedLanguage = item.language;
    this.generatedContent = item.code;
    this.highlightCode();
  }

  updateIframe(code: string) {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    // Clean up old blob URLs to prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  setPreviewSize(size: string) {
    this.currentPreviewSize = size;
    const previewElement = document.querySelector('iframe');
    if (previewElement) {
      switch (size) {
        case 'mobile':
          previewElement.style.maxWidth = '375px';
          break;
        case 'tablet':
          previewElement.style.maxWidth = '768px';
          break;
        case 'desktop':
          previewElement.style.maxWidth = '100%';
          break;
      }
      previewElement.style.margin = 'auto';
    }
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  iframeFullscreen() {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      // Fix for proper fullscreen
      const previewContainer = iframe.parentElement;
      if (previewContainer) {
        if (previewContainer.requestFullscreen) {
          previewContainer.requestFullscreen();
        }
      }
    }
  }

  // Authentication methods
  login(email: string, password: string) {
    // Simple authentication logic (you can enhance this)
    if (email && password) {
      this.isAuthenticated = true;
      localStorage.setItem('isAuthenticated', 'true');
      this.showAuthModal = false;
    }
  }

  logout() {
    this.isAuthenticated = false;
    localStorage.setItem('isAuthenticated', 'false');
  }

  toggleAuthModal() {
    this.showAuthModal = !this.showAuthModal;
  }

  // Override generateCode to check authentication
  async generateCode() {
    if (!this.isAuthenticated) {
      this.showAuthModal = true;
      return;
    }

    this.askmeanything = false;
    if (!this.prompt.trim()) return;

    this.isLoading = true;
    this.copied = false;
    this.iframeSrc = null;
    this.showPreview = false;

    try {
      const response = await this.geminiApi.generateCode(this.prompt, this.selectedLanguage);
      this.generatedContent = response;
      this.highlightCode();
      this.addToHistory();
      
      // Create preview if HTML or CSS
      if (this.selectedLanguage === 'html' || this.prompt.toLowerCase().includes('html')) {
        this.createPreview(this.generatedContent);
      }
    } catch (error) {
      console.error('Error generating code:', error);
      this.generatedContent = 'Error generating code. Please try again.';
    } finally {
      this.askmeanything = false;
      this.isLoading = false;
    }
  }
}
