import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  code?: string;
  language?: string;
  isLoading?: boolean;
  suggestions?: string[];
  explanation?: string;
}

interface QuickExample {
  title: string;
  prompt: string;
  language: string;
  icon: string;
  category: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // Chat-related properties
  chatMessages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;
  selectedLanguage: string = 'html';
  
  // Legacy properties for compatibility
  generatedContent: string = '';
  prompt: string = '';
  copied: boolean = false;
  highlightedCode: SafeHtml = '';
  history: HistoryItem[] = [];
  iframeSrc: SafeResourceUrl | null = null;
  showPreview: boolean = false;
  currentPreviewSize: string = 'desktop';
  
  // New UI state
  activeTab: string = 'chat';
  showSidebar: boolean = window.innerWidth >= 1024; // Start open on desktop, closed on mobile
  isFullscreen: boolean = false;
  autoScroll: boolean = true;
  
  // Enhanced quick examples with categories
  quickExamples: QuickExample[] = [
    { 
      title: 'Modern Landing Page', 
      prompt: 'Create a modern landing page for a SaaS startup with hero section, features grid, testimonials, and CTA. Include dark theme, smooth animations, and mobile-responsive design.', 
      language: 'html', 
      icon: 'fas fa-globe', 
      category: 'Web Pages' 
    },
    { 
      title: 'Todo App with Dark Mode', 
      prompt: 'Build a feature-rich todo application with add/edit/delete tasks, drag & drop reordering, categories, search, local storage, and beautiful dark mode design with animations.', 
      language: 'html', 
      icon: 'fas fa-list-check', 
      category: 'Applications' 
    },
    { 
      title: 'Dashboard UI', 
      prompt: 'Create a modern admin dashboard with sidebar navigation, statistics cards, charts, data tables, and responsive design. Include dark theme and hover animations.', 
      language: 'html', 
      icon: 'fas fa-chart-line', 
      category: 'Dashboards' 
    },
    { 
      title: 'E-commerce Product Card', 
      prompt: 'Design a modern product card component with image gallery, price display, rating stars, add to cart button, and smooth hover effects. Include responsive design.', 
      language: 'html', 
      icon: 'fas fa-shopping-cart', 
      category: 'E-commerce' 
    },
    { 
      title: 'Login & Signup Form', 
      prompt: 'Create beautiful login and signup forms with input validation, password strength meter, social login options, and smooth transitions. Include responsive design and accessibility.', 
      language: 'html', 
      icon: 'fas fa-user-lock', 
      category: 'Authentication' 
    },
    { 
      title: 'Portfolio Website', 
      prompt: 'Build a personal portfolio website with hero section, about, skills, projects gallery, contact form, and smooth scrolling animations. Include dark theme.', 
      language: 'html', 
      icon: 'fas fa-user-tie', 
      category: 'Portfolio' 
    },
    { 
      title: 'Weather App', 
      prompt: 'Create a beautiful weather application showing current weather, 5-day forecast, location search, and animated weather icons. Include responsive design and dark theme.', 
      language: 'html', 
      icon: 'fas fa-cloud-sun', 
      category: 'Applications' 
    },
    { 
      title: 'Pricing Table', 
      prompt: 'Design modern pricing tables with multiple plans, feature comparisons, popular badges, and call-to-action buttons. Include hover effects and responsive design.', 
      language: 'html', 
      icon: 'fas fa-dollar-sign', 
      category: 'Business' 
    }
  ];

  // Language options with icons
  languages = [
    { value: 'html', label: 'HTML + CSS', icon: 'fab fa-html5' },
    { value: 'javascript', label: 'JavaScript', icon: 'fab fa-js-square' },
    { value: 'typescript', label: 'TypeScript', icon: 'fas fa-code' },
    { value: 'react', label: 'React', icon: 'fab fa-react' },
    { value: 'vue', label: 'Vue.js', icon: 'fab fa-vuejs' },
    { value: 'angular', label: 'Angular', icon: 'fab fa-angular' },
    { value: 'python', label: 'Python', icon: 'fab fa-python' },
    { value: 'css', label: 'CSS', icon: 'fab fa-css3-alt' }
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

    // Load chat history
    const savedChat = localStorage.getItem('chatHistory');
    if (savedChat) {
      this.chatMessages = JSON.parse(savedChat);
    } else {
      // Add welcome message
      this.addSystemMessage('Welcome to AutoCoder.ai! I\'m here to help you generate beautiful, functional code. What would you like to build today?');
    }
  }

  ngOnInit() {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
    }

    // Handle responsive sidebar
    this.updateSidebarState();
    window.addEventListener('resize', () => this.updateSidebarState());
  }

  private updateSidebarState() {
    if (window.innerWidth < 1024) {
      this.showSidebar = false; // Hide on mobile/tablet
    } else {
      this.showSidebar = true; // Show on desktop
    }
  }

  ngAfterViewChecked() {
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  // Chat methods
  async sendMessage() {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: this.currentMessage,
      timestamp: new Date()
    };

    this.chatMessages.push(userMessage);
    const messageToProcess = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: 'Generating your code...',
      timestamp: new Date(),
      isLoading: true
    };
    this.chatMessages.push(loadingMessage);
    this.saveChatHistory();

    try {
      const generatedCode = await this.geminiApi.generateCode(messageToProcess, this.selectedLanguage);
      
      // Remove loading message
      this.chatMessages = this.chatMessages.filter(msg => !msg.isLoading);
      
      // Add response with code
      const responseMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        content: `I've generated a ${this.selectedLanguage} solution for you:`,
        code: generatedCode,
        language: this.selectedLanguage,
        timestamp: new Date()
      };
      
      this.chatMessages.push(responseMessage);
      
      // Update legacy properties for compatibility
      this.generatedContent = generatedCode;
      this.prompt = messageToProcess;
      this.highlightCode();
      this.addToHistory();
      
      // Create preview if HTML
      if (this.selectedLanguage === 'html' || messageToProcess.toLowerCase().includes('html')) {
        this.createPreview(generatedCode);
      }
      
      // Get suggestions asynchronously
      this.getSuggestionsForMessage(responseMessage.id, generatedCode);
      
    } catch (error) {
      // Remove loading message
      this.chatMessages = this.chatMessages.filter(msg => !msg.isLoading);
      
      const errorMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        content: 'Sorry, I encountered an error generating your code. Please try again with a different prompt.',
        timestamp: new Date()
      };
      this.chatMessages.push(errorMessage);
    } finally {
      this.isLoading = false;
      this.saveChatHistory();
    }
  }

  private async getSuggestionsForMessage(messageId: string, code: string) {
    try {
      const suggestions = await this.geminiApi.getCodeSuggestions(code, this.selectedLanguage);
      const message = this.chatMessages.find(msg => msg.id === messageId);
      if (message && suggestions.length > 0) {
        message.suggestions = suggestions;
        this.saveChatHistory();
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  }

  addSystemMessage(content: string) {
    const systemMessage: ChatMessage = {
      id: this.generateId(),
      type: 'system',
      content,
      timestamp: new Date()
    };
    this.chatMessages.push(systemMessage);
    this.saveChatHistory();
  }

  clearChat() {
    this.chatMessages = [];
    this.addSystemMessage('Chat cleared! Ready for a new conversation.');
    localStorage.removeItem('chatHistory');
  }

  useQuickExample(example: QuickExample) {
    this.currentMessage = example.prompt;
    this.selectedLanguage = example.language;
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private scrollToBottom() {
    if (this.chatContainer?.nativeElement) {
      const container = this.chatContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(this.chatMessages));
  }

  // Legacy methods for compatibility
  async generateCode() {
    if (this.prompt.trim()) {
      this.currentMessage = this.prompt;
      await this.sendMessage();
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

  copyToClipboard(code?: string) {
    const textToCopy = code || this.generatedContent;
    if (textToCopy) {
      this.clipboard.copy(textToCopy);
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
    if (this.history.length > 20) {
      this.history.pop();
    }

    localStorage.setItem('codeHistory', JSON.stringify(this.history));
  }

  loadFromHistory(item: HistoryItem) {
    this.prompt = item.prompt;
    this.selectedLanguage = item.language;
    this.generatedContent = item.code;
    this.highlightCode();
    
    // Add to chat
    this.currentMessage = item.prompt;
  }

  setPrompt(prompt: string) {
    this.currentMessage = prompt;
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
      if (previewContainer && previewContainer.requestFullscreen) {
        previewContainer.requestFullscreen();
      }
    }
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getCurrentLanguageIcon(): string {
    const language = this.languages.find(lang => lang.value === this.selectedLanguage);
    return language ? language.icon : 'fas fa-code';
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  logout() {
    localStorage.setItem('isAuthenticated', 'false');
    this.router.navigate(['/']);
  }
}