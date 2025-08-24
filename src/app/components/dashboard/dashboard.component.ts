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
  role: 'user' | 'assistant' | 'system'; // Template compatibility
  content: string;
  timestamp: Date;
  code?: string;
  language?: string;
  isLoading?: boolean;
  suggestions?: string[];
  explanation?: string;
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
  lastMessage: string;
  language: string;
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
  
  // Template compatibility properties
  conversation: ChatMessage[] = [];
  userInput: string = '';
  sidebarVisible: boolean = false;
  showPreviewModal: boolean = false;
  previewContent: string = '';
  
  // Chat history properties
  chatHistories: ChatHistory[] = [];
  currentChatId: string = '';
  showHistoryPanel: boolean = true;
  
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

    // Load chat histories
    const savedChatHistories = localStorage.getItem('chatHistories');
    if (savedChatHistories) {
      this.chatHistories = JSON.parse(savedChatHistories).map((chat: any) => ({
        ...chat,
        timestamp: new Date(chat.timestamp),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    }

    // Load or create current chat
    const currentChatId = localStorage.getItem('currentChatId');
    if (currentChatId && this.chatHistories.find(chat => chat.id === currentChatId)) {
      this.currentChatId = currentChatId;
      const currentChat = this.chatHistories.find(chat => chat.id === currentChatId);
      if (currentChat) {
        this.chatMessages = currentChat.messages;
        this.selectedLanguage = currentChat.language;
      }
    } else {
      // Create new chat session
      this.startNewChat();
    }
    
    // Initialize template compatibility properties
    this.conversation = this.chatMessages;
    this.userInput = this.currentMessage;
    this.sidebarVisible = window.innerWidth >= 768;
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
    
    // Sync template properties
    this.conversation = this.chatMessages;
    this.userInput = this.currentMessage;
  }

  private updateSidebarState() {
    if (window.innerWidth < 1024) {
      this.showSidebar = false; // Hide on mobile/tablet
      this.sidebarVisible = false;
    } else {
      this.showSidebar = true; // Show on desktop
      this.sidebarVisible = true;
    }
  }

  ngAfterViewChecked() {
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  // Chat methods
  async sendMessage() {
    // Sync input properties
    if (this.userInput && !this.currentMessage) {
      this.currentMessage = this.userInput;
    }
    
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      role: 'user',
      content: this.currentMessage,
      timestamp: new Date()
    };

    this.chatMessages.push(userMessage);
    this.conversation = [...this.chatMessages]; // Sync with template property
    
    const messageToProcess = this.currentMessage;
    this.currentMessage = '';
    this.userInput = ''; // Clear template input
    this.isLoading = true;

    // Force scroll to bottom after adding user message
    setTimeout(() => this.scrollToBottom(), 100);

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      role: 'assistant',
      content: 'Generating your code...',
      timestamp: new Date(),
      isLoading: true
    };
    this.chatMessages.push(loadingMessage);
    this.conversation = [...this.chatMessages]; // Sync with template
    this.saveChatHistory();

    // Force scroll to bottom after adding loading message
    setTimeout(() => this.scrollToBottom(), 150);

    try {
      const generatedCode = await this.geminiApi.generateCode(messageToProcess, this.selectedLanguage);
      
      // Remove loading message
      this.chatMessages = this.chatMessages.filter(msg => !msg.isLoading);
      
      // Add response with code
      const responseMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        role: 'assistant',
        content: `I've generated a ${this.selectedLanguage} solution for you:`,
        code: generatedCode,
        language: this.selectedLanguage,
        timestamp: new Date()
      };
      
      this.chatMessages.push(responseMessage);
      this.conversation = [...this.chatMessages]; // Sync with template
      
      // Update legacy properties for compatibility
      this.generatedContent = generatedCode;
      this.prompt = messageToProcess;
      this.highlightCode();
      this.addToHistory();
      
      // Create preview if HTML or contains HTML
      if (this.selectedLanguage === 'html' || 
          messageToProcess.toLowerCase().includes('html') ||
          messageToProcess.toLowerCase().includes('website') ||
          messageToProcess.toLowerCase().includes('page') ||
          messageToProcess.toLowerCase().includes('landing')) {
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
        role: 'assistant',
        content: 'Sorry, I encountered an error generating your code. Please try again with a different prompt.',
        timestamp: new Date()
      };
      this.chatMessages.push(errorMessage);
      this.conversation = [...this.chatMessages]; // Sync with template
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
      role: 'system',
      content,
      timestamp: new Date()
    };
    this.chatMessages.push(systemMessage);
    this.conversation = [...this.chatMessages]; // Sync with template
    this.saveChatHistory();
  }

  clearChat() {
    this.chatMessages = [];
    this.addSystemMessage('Chat cleared! Ready for a new conversation.');
    
    // Update the current chat in history
    if (this.currentChatId) {
      this.updateCurrentChatInHistory();
    }
  }

  useQuickExample(example: QuickExample) {
    this.currentMessage = example.prompt;
    this.userInput = example.prompt; // Sync with template
    this.selectedLanguage = example.language;
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }
  
  // Template compatibility method
  useExample(example: QuickExample) {
    this.useQuickExample(example);
  }
  
  // Export chat functionality
  exportChat() {
    const chatData = {
      title: this.generateChatTitle(),
      timestamp: new Date().toISOString(),
      language: this.selectedLanguage,
      messages: this.conversation.map(msg => ({
        role: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        code: msg.code,
        language: msg.language
      }))
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `autocode-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  // Template trackBy method
  trackByMessage(index: number, message: ChatMessage): string {
    return message.id;
  }
  
  // Check if message contains code
  containsCode(content: string): boolean {
    return content.includes('<') && content.includes('>') || 
           content.includes('function') || 
           content.includes('class') ||
           content.includes('const') ||
           content.includes('let') ||
           content.includes('var') ||
           content.includes('{') && content.includes('}');
  }
  
  // Show preview method - template expects this to be a method, not a property
  showPreviewMethod(content: string) {
    if (this.containsCode(content)) {
      this.previewContent = content;
      this.showPreviewModal = true;
    }
  }
  
  // Close preview modal
  closePreview() {
    this.showPreviewModal = false;
    this.previewContent = '';
  }
  
  // Regenerate response
  async regenerateResponse(message: ChatMessage) {
    if (message.type !== 'assistant') return;
    
    // Find the user message that preceded this assistant message
    const messageIndex = this.conversation.findIndex(msg => msg.id === message.id);
    if (messageIndex > 0) {
      const userMessage = this.conversation[messageIndex - 1];
      if (userMessage.type === 'user') {
        // Remove the current assistant message
        this.chatMessages = this.chatMessages.filter(msg => msg.id !== message.id);
        this.conversation = [...this.chatMessages];
        
        // Set the user input and regenerate
        this.currentMessage = userMessage.content;
        await this.sendMessage();
      }
    }
  }
  
  // Handle keyboard input
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  // Auto-resize textarea
  autoResize(event: any) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    // Sync with userInput property
    this.userInput = textarea.value;
    this.currentMessage = textarea.value;
  }
  
  // Toggle sidebar method - updated to sync both properties
  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
    this.sidebarVisible = this.showSidebar;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private scrollToBottom() {
    if (this.chatContainer?.nativeElement) {
      const container = this.chatContainer.nativeElement;
      // Smooth scroll to bottom with offset for fixed input
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  private saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(this.chatMessages));
    this.saveChatHistories();
  }

  // Chat History Management Methods
  startNewChat() {
    // Save current chat if it has messages
    if (this.chatMessages.length > 1 && this.currentChatId) {
      this.updateCurrentChatInHistory();
    }

    // Create new chat session
    this.currentChatId = this.generateId();
    this.chatMessages = [];
    this.selectedLanguage = 'html';
    
    // Add welcome message
    this.addSystemMessage('Welcome to AutoCoder.ai! I\'m here to help you generate beautiful, functional code. What would you like to build today?');
    
    localStorage.setItem('currentChatId', this.currentChatId);
  }

  switchToChat(chatId: string) {
    // Save current chat first
    if (this.currentChatId && this.chatMessages.length > 0) {
      this.updateCurrentChatInHistory();
    }

    // Switch to selected chat
    const selectedChat = this.chatHistories.find(chat => chat.id === chatId);
    if (selectedChat) {
      this.currentChatId = chatId;
      this.chatMessages = [...selectedChat.messages];
      this.selectedLanguage = selectedChat.language;
      localStorage.setItem('currentChatId', this.currentChatId);
      
      // Scroll to bottom after switching
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  deleteChat(chatId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (this.chatHistories.length <= 1) {
      // Don't delete the last chat, just clear it
      this.clearChat();
      return;
    }

    this.chatHistories = this.chatHistories.filter(chat => chat.id !== chatId);
    
    if (this.currentChatId === chatId) {
      // Switch to the most recent chat
      const mostRecentChat = this.chatHistories[0];
      if (mostRecentChat) {
        this.switchToChat(mostRecentChat.id);
      } else {
        this.startNewChat();
      }
    }
    
    this.saveChatHistories();
  }

  private updateCurrentChatInHistory() {
    if (!this.currentChatId || this.chatMessages.length === 0) return;

    const existingChatIndex = this.chatHistories.findIndex(chat => chat.id === this.currentChatId);
    const title = this.generateChatTitle();
    const lastMessage = this.getLastUserMessage();

    const chatHistory: ChatHistory = {
      id: this.currentChatId,
      title: title,
      timestamp: new Date(),
      messages: [...this.chatMessages],
      lastMessage: lastMessage,
      language: this.selectedLanguage
    };

    if (existingChatIndex >= 0) {
      this.chatHistories[existingChatIndex] = chatHistory;
    } else {
      this.chatHistories.unshift(chatHistory);
    }

    // Keep only last 50 chats
    if (this.chatHistories.length > 50) {
      this.chatHistories = this.chatHistories.slice(0, 50);
    }
  }

  private generateChatTitle(): string {
    const userMessages = this.chatMessages.filter(msg => msg.type === 'user');
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0].content;
      // Truncate to 40 characters and add ellipsis
      return firstMessage.length > 40 ? firstMessage.substring(0, 40) + '...' : firstMessage;
    }
    return 'New Chat';
  }

  private getLastUserMessage(): string {
    const userMessages = this.chatMessages.filter(msg => msg.type === 'user');
    if (userMessages.length > 0) {
      return userMessages[userMessages.length - 1].content;
    }
    return '';
  }

  private saveChatHistories() {
    // Update current chat in history before saving
    if (this.currentChatId && this.chatMessages.length > 0) {
      this.updateCurrentChatInHistory();
    }
    
    localStorage.setItem('chatHistories', JSON.stringify(this.chatHistories));
  }

  toggleHistoryPanel() {
    this.showHistoryPanel = !this.showHistoryPanel;
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }

  // Legacy methods for compatibility
  async generateCode() {
    if (this.prompt.trim()) {
      this.currentMessage = this.prompt;
      await this.sendMessage();
    }
  }

  private createPreview(code: string) {
    try {
      // Clean up any previous blob URL
      if (this.iframeSrc) {
        const url = this.iframeSrc.toString();
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }

      // Ensure we have valid HTML content
      let htmlContent = code;
      if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
        body {
            margin: 0;
            padding: 1rem;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #e2e8f0;
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
      }

      // Create new blob URL for the iframe
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.showPreview = true;

      // Clean up blob URL after 30 seconds
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      
      console.log('Preview created successfully');
    } catch (error) {
      console.error('Error creating preview:', error);
      this.showPreview = false;
    }
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
    // Preview size is now handled by CSS classes
  }

  iframeFullscreen() {
    const previewPanel = document.querySelector('.preview-panel');
    if (previewPanel) {
      if (previewPanel.requestFullscreen) {
        previewPanel.requestFullscreen();
      } else if ((previewPanel as any).webkitRequestFullscreen) {
        (previewPanel as any).webkitRequestFullscreen();
      } else if ((previewPanel as any).msRequestFullscreen) {
        (previewPanel as any).msRequestFullscreen();
      }
    }
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

  trackByChatId(index: number, chat: ChatHistory): string {
    return chat.id;
  }

  logout() {
    localStorage.setItem('isAuthenticated', 'false');
    this.router.navigate(['/']);
  }

  // Method to manually toggle preview
  togglePreview(code?: string) {
    if (this.showPreview) {
      this.showPreview = false;
      if (this.iframeSrc) {
        const url = this.iframeSrc.toString();
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    } else if (code) {
      this.createPreview(code);
    }
  }
}