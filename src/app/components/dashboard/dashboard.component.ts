import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GeminiApiService } from '../../gemini-api.service';
import hljs from 'highlight.js';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';

interface HistoryItem {
  timestamp: Date;
  prompt: string;
  code: string;
  language: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  generatedContent: string = '';
  prompt: string = '';
  isLoading: boolean = false;
  copied: boolean = false;
  selectedLanguage: string = 'javascript';
  highlightedCode: SafeHtml = '';
  history: HistoryItem[] = [];
  iframeSrc: SafeResourceUrl | null = null;
  showPreview: boolean = false;
  currentPreviewSize: string = 'desktop';
  
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
    // Load history from localStorage
    const savedHistory = localStorage.getItem('codeHistory');
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
    }
  }

  ngOnInit() {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
    }
  }

  async generateCode() {
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
      this.isLoading = false;
    }
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

  setPrompt(prompt: string) {
    this.prompt = prompt;
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

  iframeFullscreen() {
    const iframe = document.querySelector('#preview-container');
    if (iframe) {
      const previewContainer = iframe;
      if (previewContainer) {
        if (previewContainer.requestFullscreen) {
          previewContainer.requestFullscreen();
        }
      }
    }
  }

  logout() {
    localStorage.setItem('isAuthenticated', 'false');
    this.router.navigate(['/']);
  }
}