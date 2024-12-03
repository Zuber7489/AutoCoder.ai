import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GeminiApiService } from './gemini-api.service';
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
  isDarkMode: boolean = false;
  selectedLanguage: string = 'javascript';
  highlightedCode: SafeHtml = '';
  history: HistoryItem[] = [];
  askmeanything: boolean = true;
  iframeSrc: SafeResourceUrl | null = null;
  showPreview: boolean = false;
  currentPreviewSize: string = 'desktop';

  constructor(
    private geminiApi: GeminiApiService,
    private sanitizer: DomSanitizer,
    private clipboard: Clipboard
  ) {
    // Load dark mode preference
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    // Load history from localStorage
    const savedHistory = localStorage.getItem('codeHistory');
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
    }
  }

  ngOnInit() {
    // Apply initial theme
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async generateCode() {
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

  iframeFullscreen() {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      }
    }
  }
}
