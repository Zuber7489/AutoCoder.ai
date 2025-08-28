import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { GeminiApiService } from '../../gemini-api.service';
import { AuthService } from '../../services/auth.service';
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
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('previewFrame') previewFrame!: ElementRef;

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
  currentPreviewSize: string = 'desktop';
  
  // New UI state
  activeTab: string = 'chat';
  showSidebar: boolean = window.innerWidth >= 1024; // Start open on desktop, closed on mobile
  isFullscreen: boolean = false;
  autoScroll: boolean = true;
  showScrollToBottom: boolean = false;
  isUserScrolling: boolean = false;
  
  // Enhanced quick examples with categories and super cool features
  quickExamples: QuickExample[] = [
    {
      title: '🚀 Modern Landing Page',
      prompt: 'Create a stunning landing page for a SaaS startup with animated hero section, interactive features grid, customer testimonials carousel, and compelling CTA. Include particle effects, smooth scroll animations, dark theme, and full mobile responsiveness.',
      language: 'html',
      icon: 'fas fa-rocket',
      category: 'Web Pages'
    },
    {
      title: '⚡ Smart Todo App',
      prompt: 'Build an intelligent todo application with AI-powered task suggestions, drag & drop reordering, smart categories, advanced search, local storage, voice input, and beautiful animations with dark mode.',
      language: 'html',
      icon: 'fas fa-brain',
      category: 'Applications'
    },
    {
      title: '📊 Analytics Dashboard',
      prompt: 'Create a comprehensive analytics dashboard with interactive charts, real-time data visualization, KPI cards, data tables with sorting/filtering, export functionality, and responsive design with dark theme.',
      language: 'html',
      icon: 'fas fa-chart-line',
      category: 'Dashboards'
    },
    {
      title: '🛒 E-commerce Showcase',
      prompt: 'Design a modern e-commerce product showcase with 3D product viewer, shopping cart with animations, wishlist functionality, user reviews, related products carousel, and smooth transitions.',
      language: 'html',
      icon: 'fas fa-shopping-bag',
      category: 'E-commerce'
    },
    {
      title: '🔐 Secure Auth System',
      prompt: 'Create a comprehensive authentication system with biometric login, social OAuth integration, password strength analyzer, two-factor authentication, animated form transitions, and security best practices.',
      language: 'html',
      icon: 'fas fa-shield-alt',
      category: 'Authentication'
    },
    {
      title: '🎨 Creative Portfolio',
      prompt: 'Build a stunning creative portfolio with parallax scrolling, interactive project galleries, skill visualization, contact form with animations, dark/light theme toggle, and smooth page transitions.',
      language: 'html',
      icon: 'fas fa-palette',
      category: 'Portfolio'
    },
    {
      title: '🌦️ Weather Intelligence',
      prompt: 'Create an intelligent weather application with location detection, 7-day forecast with animations, weather alerts, clothing suggestions based on weather, interactive maps, and beautiful weather visualizations.',
      language: 'html',
      icon: 'fas fa-cloud-sun-rain',
      category: 'Applications'
    },
    {
      title: '💰 Premium Pricing',
      prompt: 'Design elegant pricing tables with annual/monthly toggle, feature comparison matrix, popular plan highlighting, payment integration placeholders, animated counters, and responsive design.',
      language: 'html',
      icon: 'fas fa-crown',
      category: 'Business'
    }
  ];

  // New super cool features
  isTyping: boolean = false;
  typingSpeed: number = 50;
  showConfetti: boolean = false;
  keyboardShortcuts: boolean = true;
  soundEnabled: boolean = false;
  autoSaveEnabled: boolean = true;
  selectedCategory: string = 'All';
  categories: string[] = ['All', 'Web Pages', 'Applications', 'Dashboards', 'E-commerce', 'Authentication', 'Portfolio', 'Business'];

  // API Key Configuration
  customApiKey: string = '';
  hasCustomApiKey: boolean = false;
  showApiConfig: boolean = false;
  showApiKey: boolean = false;

  // User Profile Properties
  userProfilePic: string = '';
  userDisplayName: string = '';
  userEmail: string = '';
  showProfileModal: boolean = false;
  userInfo: any = null;

  // Relative time caching to prevent ExpressionChangedAfterItHasBeenCheckedError
  private relativeTimeCache: Map<string, string> = new Map();
  private timeUpdateInterval: any;
  private lastUpdateTime: number = 0;
  
  // Scroll optimization properties
  private scrollThrottleTimeout: any;
  private isScrolling: boolean = false;
  private scrollListenerAttached: boolean = false;
  
  // Code highlighting cache to improve performance
  private highlightCache: Map<string, string> = new Map();

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
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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

    // Initialize API key configuration
    this.loadApiKeyConfig();
  }

  ngOnInit() {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
    }

    // Initialize user profile data
    this.initializeUserProfile();

    // Handle responsive sidebar
    this.updateSidebarState();
    window.addEventListener('resize', () => this.updateSidebarState());
    
    // Sync template properties
    this.conversation = this.chatMessages;
    this.userInput = this.currentMessage;

    // Initialize relative time cache and start update interval
    this.initializeRelativeTimeCache();
    this.startTimeUpdateInterval();
  }

  ngOnDestroy() {
    // Clean up intervals and timeouts
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.scrollThrottleTimeout) {
      clearTimeout(this.scrollThrottleTimeout);
    }
    
    // Remove scroll event listener if it exists
    if (this.chatContainer?.nativeElement && this.scrollListenerAttached) {
      const container = this.chatContainer.nativeElement;
      container.removeEventListener('scroll', this.throttledScrollHandler.bind(this));
      this.scrollListenerAttached = false;
    }
    
    // Clear caches to prevent memory leaks
    this.relativeTimeCache.clear();
    this.highlightCache.clear();
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
    // Only auto-scroll if not user scrolling, auto-scroll is enabled, and not currently scrolling
    if (this.autoScroll && !this.isUserScrolling && !this.isScrolling) {
      this.scrollToBottom();
    }
    
    // Set up scroll listener only once
    if (this.chatContainer?.nativeElement && !this.scrollListenerAttached) {
      this.setupScrollListener();
      this.scrollListenerAttached = true;
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
    
    // Trigger change detection for OnPush
    this.cdr.markForCheck();

    // Force scroll to bottom after adding user message
    this.isUserScrolling = false; // Ensure auto-scroll works
    this.autoScroll = true;
    setTimeout(() => this.scrollToBottom(), 100);

    try {
      const rawResponse = await this.geminiApi.generateCode(messageToProcess, this.selectedLanguage);
      
      // Process and clean the response
      let processedCode = this.processGeminiResponse(rawResponse);
      
      // Add response with code
      const responseMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        role: 'assistant',
        content: `I've generated a ${this.selectedLanguage} solution for you:`,
        code: processedCode,
        language: this.selectedLanguage,
        timestamp: new Date()
      };
      
      this.chatMessages.push(responseMessage);
      this.conversation = [...this.chatMessages]; // Sync with template
      
      console.log('Raw response:', rawResponse); // Debug log
      console.log('Processed code:', processedCode); // Debug log
      console.log('Response message:', responseMessage); // Debug log
      
      // Update legacy properties for compatibility
      this.generatedContent = processedCode;
      this.prompt = messageToProcess;
      this.highlightCode();
      this.addToHistory();
      
      // Create preview if HTML or contains HTML - Auto-open in new tab
      if (this.selectedLanguage === 'html' ||
          messageToProcess.toLowerCase().includes('html') ||
          messageToProcess.toLowerCase().includes('website') ||
          messageToProcess.toLowerCase().includes('page') ||
          messageToProcess.toLowerCase().includes('landing')) {
        // Auto-open preview in new tab for HTML content
        setTimeout(() => {
          this.openPreviewInNewTab(processedCode);
        }, 500);
      }

      // Celebrate successful code generation
      this.celebrateSuccess();


      
    } catch (error) {
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
      // Trigger change detection for OnPush
      this.cdr.markForCheck();
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
    this.conversation = []; // Sync with template
    this.addSystemMessage('Chat cleared! Ready for a new conversation.');
    
    // Update the current chat in history
    if (this.currentChatId) {
      this.updateCurrentChatInHistory();
    }
    
    this.cdr.markForCheck(); // Trigger change detection for OnPush
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
  

  

  
  // Test preview with sample HTML/CSS
  testPreview() {
    const testContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Preview Test Success!</h1>
        <p>If you can see this styled content, the preview functionality is working correctly.</p>
        <button class="button" onclick="alert('JavaScript is working too!')">Test JavaScript</button>
    </div>
</body>
</html>`;
    
    this.showPreviewMethod(testContent);
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
  
  // Enhanced keyboard input with shortcuts
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }

    // Super cool keyboard shortcuts
    if (this.keyboardShortcuts) {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case '/':
            event.preventDefault();
            this.clearChat();
            break;
          case 'k':
            event.preventDefault();
            this.startNewChat();
            break;
          case 's':
            event.preventDefault();
            this.exportChat();
            break;
          case 'l':
            event.preventDefault();
            this.toggleSidebar();
            break;
        }
      }

      // Quick language switching with number keys
      if (event.altKey && !isNaN(Number(event.key))) {
        const languageIndex = Number(event.key) - 1;
        if (languageIndex >= 0 && languageIndex < this.languages.length) {
          event.preventDefault();
          this.selectedLanguage = this.languages[languageIndex].value;
        }
      }
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
    this.cdr.markForCheck(); // Trigger change detection for OnPush
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Process Gemini API response to extract clean code
  private processGeminiResponse(rawResponse: string): string {
    try {
      let cleanCode = rawResponse;
      
      // Remove markdown code blocks (```html, ```javascript, etc.)
      cleanCode = cleanCode.replace(/```[a-zA-Z]*\n?/g, '');
      cleanCode = cleanCode.replace(/```/g, '');
      
      // Decode HTML entities
      const entityMap: { [key: string]: string } = {
        '\u003c': '<',
        '\u003e': '>',
        '\u0026': '&',
        '\u0022': '"',
        '\u0027': "'",
        '\u003d': '=',
        '\u002f': '/',
        '\u005c': '\\',
        '\n': '\n',
        '\t': '\t',
        '\r': '\r'
      };
      
      // Replace all HTML entities
      Object.keys(entityMap).forEach(entity => {
        const regex = new RegExp(entity, 'g');
        cleanCode = cleanCode.replace(regex, entityMap[entity]);
      });
      
      // Additional cleanup for common issues
      cleanCode = cleanCode.trim();
      
      // If it's still not valid HTML, try to parse as JSON and extract
      if (cleanCode.includes('"text"') && cleanCode.includes('\\u')) {
        try {
          const parsed = JSON.parse(cleanCode);
          if (parsed.text) {
            cleanCode = parsed.text;
            // Remove markdown again after JSON parsing
            cleanCode = cleanCode.replace(/```[a-zA-Z]*\n?/g, '');
            cleanCode = cleanCode.replace(/```/g, '');
            
            // Decode unicode escapes
            cleanCode = cleanCode.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
              return String.fromCharCode(parseInt(code, 16));
            });
          }
        } catch (jsonError) {
          console.log('Not JSON format, using as-is');
        }
      }
      
      console.log('Cleaned code:', cleanCode.substring(0, 200) + '...');
      return cleanCode;
      
    } catch (error) {
      console.error('Error processing Gemini response:', error);
      return rawResponse; // Return original if processing fails
    }
  }

  private scrollToBottom() {
    if (this.chatContainer?.nativeElement) {
      const container = this.chatContainer.nativeElement;
      // Smooth scroll to bottom with offset for fixed input
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      
      // Hide scroll to bottom button when at bottom
      this.showScrollToBottom = false;
    }
  }
  
  // Set up scroll event listener with throttling to prevent performance issues
  private setupScrollListener() {
    if (this.chatContainer?.nativeElement && !this.scrollListenerAttached) {
      const container = this.chatContainer.nativeElement;
      
      // Use throttled scroll handling to prevent UI freezing
      container.addEventListener('scroll', this.throttledScrollHandler.bind(this), { passive: true });
      this.scrollListenerAttached = true;
    }
  }
  
  // Throttled scroll handler to prevent performance issues
  private throttledScrollHandler() {
    // Clear existing timeout
    if (this.scrollThrottleTimeout) {
      clearTimeout(this.scrollThrottleTimeout);
    }
    
    // Set scrolling flag
    this.isScrolling = true;
    
    // Throttle scroll handling to every 100ms
    this.scrollThrottleTimeout = setTimeout(() => {
      this.handleScrollEvent();
      this.isScrolling = false;
    }, 100);
  }
  
  // Actual scroll event handling logic
  private handleScrollEvent() {
    if (!this.chatContainer?.nativeElement) return;
    
    const container = this.chatContainer.nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
    
    // Update scroll state without triggering change detection
    const wasShowingScrollButton = this.showScrollToBottom;
    
    // If user scrolls up from bottom, disable auto-scroll and show button
    if (!isAtBottom && this.autoScroll) {
      this.isUserScrolling = true;
      this.showScrollToBottom = true;
      
      // Re-enable auto-scroll after a delay if user stops scrolling
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        // Check if still not at bottom
        const currentIsAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
        if (!currentIsAtBottom) {
          this.showScrollToBottom = true;
          // Only trigger change detection if button visibility changed
          if (!wasShowingScrollButton) {
            this.cdr.markForCheck();
          }
        }
      }, 500);
    } else if (isAtBottom) {
      // User scrolled back to bottom, re-enable auto-scroll
      this.isUserScrolling = false;
      this.showScrollToBottom = false;
      clearTimeout(this.scrollTimeout);
    }
    
    // Only trigger change detection if scroll button visibility actually changed
    if (wasShowingScrollButton !== this.showScrollToBottom) {
      this.cdr.markForCheck();
    }
  }
  
  private scrollTimeout: any;
  
  // Method to manually scroll to bottom
  scrollToBottomManually() {
    this.isUserScrolling = false;
    this.autoScroll = true;
    this.scrollToBottom();
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
    this.conversation = []; // Sync with template
    this.selectedLanguage = 'html';
    
    // Add enhanced welcome message
    this.addSystemMessage(`🎉 **Welcome to AutoCoder.ai!** 

I'm your AI-powered coding assistant with super cool features!

🚀 **New Features:**
• 🎤 Voice input support
• 🎊 Confetti celebrations for successful code generation
• 💡 Smart suggestions and code analysis
• ⌨️ Keyboard shortcuts (Ctrl+K, Ctrl+/, Ctrl+S, etc.)
• 🏷️ Category-based example filtering
• 🎨 Enhanced animations and visual effects

Try typing **/shortcuts** to see all keyboard shortcuts, or click the voice button to speak your requests!

What amazing project would you like to build today? ✨`);
    
    localStorage.setItem('currentChatId', this.currentChatId);
    
    console.log('Started new chat:', this.currentChatId);
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
      this.conversation = [...selectedChat.messages]; // Sync with template
      this.selectedLanguage = selectedChat.language;
      localStorage.setItem('currentChatId', this.currentChatId);
      
      console.log('Switched to chat:', selectedChat);
      console.log('Messages loaded:', this.chatMessages);
      
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
    const timestamp = new Date();

    const chatHistory: ChatHistory = {
      id: this.currentChatId,
      title: title,
      timestamp: timestamp,
      messages: [...this.chatMessages],
      lastMessage: lastMessage,
      language: this.selectedLanguage
    };

    if (existingChatIndex >= 0) {
      this.chatHistories[existingChatIndex] = chatHistory;
    } else {
      this.chatHistories.unshift(chatHistory);
    }

    // Update relative time cache for this chat
    const dateString = timestamp.toISOString();
    const relativeTime = this.calculateRelativeTime(timestamp);
    this.relativeTimeCache.set(dateString, relativeTime);

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
    
    // Update relative time cache for all chats
    this.initializeRelativeTimeCache();
  }

  toggleHistoryPanel() {
    this.showHistoryPanel = !this.showHistoryPanel;
  }

  // Updated getRelativeTime method that uses caching to prevent ExpressionChangedAfterItHasBeenCheckedError
  getRelativeTime(date: Date): string {
    const dateString = new Date(date).toISOString();
    
    // Return cached value if available
    if (this.relativeTimeCache.has(dateString)) {
      return this.relativeTimeCache.get(dateString)!;
    }
    
    // Calculate and cache the relative time
    const relativeTime = this.calculateRelativeTime(date);
    this.relativeTimeCache.set(dateString, relativeTime);
    return relativeTime;
  }

  private calculateRelativeTime(date: Date): string {
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

  private initializeRelativeTimeCache() {
    // Initialize cache for all existing chat histories
    this.chatHistories.forEach(chat => {
      const dateString = new Date(chat.timestamp).toISOString();
      const relativeTime = this.calculateRelativeTime(chat.timestamp);
      this.relativeTimeCache.set(dateString, relativeTime);
    });
  }

  private startTimeUpdateInterval() {
    // Update relative times every 60 seconds to keep them current (reduced from 30s for better performance)
    this.timeUpdateInterval = setInterval(() => {
      // Only update if the component is still active and has chat histories
      if (this.chatHistories.length > 0) {
        this.updateRelativeTimeCache();
      }
    }, 60000); // 60 seconds
  }

  private updateRelativeTimeCache() {
    // Only update if there are chats to update
    if (this.chatHistories.length === 0) {
      return;
    }

    let hasChanges = false;
    const currentTime = Date.now();
    
    // Only update if enough time has passed (prevent rapid updates)
    if (currentTime - this.lastUpdateTime < 30000) { // 30 seconds minimum between updates
      return;
    }
    
    this.lastUpdateTime = currentTime;
    
    // Update cache for all chat histories
    this.chatHistories.forEach(chat => {
      const dateString = new Date(chat.timestamp).toISOString();
      const newRelativeTime = this.calculateRelativeTime(chat.timestamp);
      const oldRelativeTime = this.relativeTimeCache.get(dateString);
      
      if (oldRelativeTime !== newRelativeTime) {
        this.relativeTimeCache.set(dateString, newRelativeTime);
        hasChanges = true;
      }
    });

    // Only trigger change detection if there were actual changes
    if (hasChanges) {
      // Use markForCheck instead of detectChanges for better performance
      this.cdr.markForCheck();
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
    // Now using new tab approach instead of modal
    this.openPreviewInNewTab(code);
  }

  private highlightCode() {
    if (this.generatedContent) {
      const highlighted = hljs.highlight(this.generatedContent, {
        language: this.selectedLanguage
      }).value;
      this.highlightedCode = this.sanitizer.bypassSecurityTrustHtml(highlighted);
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
  
  getLanguageIcon(languageValue: string): string {
    const language = this.languages.find(lang => lang.value === languageValue);
    return language ? language.icon : 'fas fa-code';
  }
  
  // Get highlighted code for display with caching for better performance
  getHighlightedCode(code: string, language?: string): string {
    if (!code) return '';
    
    const lang = language || this.selectedLanguage;
    const cacheKey = `${lang}:${code.length}:${code.substring(0, 100)}`; // Use length and first 100 chars as key
    
    // Return cached result if available
    if (this.highlightCache.has(cacheKey)) {
      return this.highlightCache.get(cacheKey)!;
    }
    
    try {
      const highlighted = hljs.highlight(code, { language: lang }).value;
      // Cache the result
      this.highlightCache.set(cacheKey, highlighted);
      
      // Limit cache size to prevent memory leaks
      if (this.highlightCache.size > 100) {
        const iterator = this.highlightCache.keys();
        const firstEntry = iterator.next();
        if (!firstEntry.done) {
          this.highlightCache.delete(firstEntry.value);
        }
      }
      
      return highlighted;
    } catch (error) {
      console.log('Highlighting failed, using plain text:', error);
      // Return HTML-escaped code if highlighting fails
      const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      this.highlightCache.set(cacheKey, escapedCode);
      return escapedCode;
    }
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  trackByChatId(index: number, chat: ChatHistory): string {
    return chat.id;
  }

  async logout() {
    try {
      await this.authService.signOutUser();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback logout
      localStorage.setItem('isAuthenticated', 'false');
      this.router.navigate(['/']);
    }
  }

  // Method to manually toggle preview
  togglePreview(code?: string) {
    if (code) {
      this.openPreviewInNewTab(code);
    }
  }

  // API Key Configuration Methods
  loadApiKeyConfig() {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      this.customApiKey = savedApiKey;
      this.hasCustomApiKey = true;
      // Update the service with the custom API key
      this.geminiApi.updateApiKey(savedApiKey);
    }
  }

  toggleApiConfig() {
    this.showApiConfig = !this.showApiConfig;
  }

  toggleApiKeyVisibility() {
    this.showApiKey = !this.showApiKey;
    const input = document.querySelector('.api-key-input') as HTMLInputElement;
    if (input) {
      input.type = this.showApiKey ? 'text' : 'password';
    }
  }

  onApiKeyChange() {
    // Real-time validation or processing can be added here
  }

  saveApiKey() {
    if (this.customApiKey?.trim()) {
      localStorage.setItem('gemini_api_key', this.customApiKey.trim());
      this.hasCustomApiKey = true;
      // Update the service with the new API key
      this.geminiApi.updateApiKey(this.customApiKey.trim());
      
      
      
      // Optionally hide the config section
      setTimeout(() => {
        this.showApiConfig = false;
      }, 2000);
    }
  }

  clearApiKey() {
    localStorage.removeItem('gemini_api_key');
    this.customApiKey = '';
    this.hasCustomApiKey = false;
    this.showApiKey = false;
    
    // Reset to default API key
    this.geminiApi.resetToDefaultApiKey();
    
    
  }

  // User Profile Methods
  private initializeUserProfile() {
    const userInfo = this.authService.getUserInfo();
    if (userInfo) {
      this.userInfo = userInfo;
      this.userDisplayName = userInfo.displayName || userInfo.email?.split('@')[0] || 'User';
      this.userEmail = userInfo.email || 'Guest';
      this.userProfilePic = userInfo.photoURL || '';
    } else {
      // Subscribe to auth state changes
      this.authService.user$.subscribe(user => {
        if (user) {
          this.userInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          this.userDisplayName = user.displayName || user.email?.split('@')[0] || 'User';
          this.userEmail = user.email || 'Guest';
          this.userProfilePic = user.photoURL || '';
        } else {
          this.userInfo = null;
          this.userDisplayName = 'User';
          this.userEmail = 'Guest';
          this.userProfilePic = '';
        }
      });
    }
  }

  openProfileModal() {
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all app data? This will remove chat history, API keys, and other settings.')) {
      // Clear all localStorage except authentication
      const authData = localStorage.getItem('isAuthenticated');
      const userInfo = localStorage.getItem('userInfo');
      localStorage.clear();
      if (authData) localStorage.setItem('isAuthenticated', authData);
      if (userInfo) localStorage.setItem('userInfo', userInfo);
      
      // Reset component state
      this.chatHistories = [];
      this.chatMessages = [];
      this.conversation = [];
      this.currentChatId = '';
      this.customApiKey = '';
      this.hasCustomApiKey = false;
      
      
      this.closeProfileModal();
    }
  }

  // Template compatibility methods
  trackByMessage(index: number, message: ChatMessage): string {
    return message.id;
  }



  // Additional template compatibility methods
  closePreview() {
    // No longer needed as we don't use modal, but keeping for compatibility
    this.showPreviewModal = false;
  }

  // Show preview for any code (general method)
  showPreview(code: string) {
    this.openPreviewInNewTab(code);
  }

  // Check if content contains code
  containsCode(content: string): boolean {
    return content.includes('<') && content.includes('>');
  }

  // Open preview in new browser tab
  openPreviewInNewTab(code: string) {
    try {
      // Create a complete HTML document
      const fullHtmlContent = this.createFullHtmlDocument(code);
      
      // Try direct document.write approach first (more reliable)
      const newTab = window.open('', '_blank');
      if (newTab) {
        try {
          newTab.document.open();
          newTab.document.write(fullHtmlContent);
          newTab.document.close();
          newTab.document.title = 'AutoCoder.ai - Live Preview';
          
          
          return;
        } catch (writeError) {
          console.warn('Document.write failed, trying blob URL approach:', writeError);
          newTab.close();
        }
      }
      
      // Fallback to blob URL approach
      try {
        const blob = new Blob([fullHtmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const blobWindow = window.open(url, '_blank');
        if (blobWindow) {
          // Clean up blob URL after delay
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 5000);
          
          this.addSystemMessage('✅ Live preview opened in a new tab!');
        } else {
          URL.revokeObjectURL(url);
          throw new Error('Popup blocked');
        }
      } catch (blobError) {
        console.warn('Blob URL approach failed:', blobError);
        
        // Final fallback - create a data URL (limited size but more compatible)
        try {
          const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(fullHtmlContent);
          const dataWindow = window.open(dataUrl, '_blank');
          
          if (dataWindow) {
 
          } else {
            throw new Error('All approaches failed');
          }
        } catch (dataError) {
          console.error('All preview methods failed:', dataError);
          alert('Unable to open preview. Please check if popups are blocked or try copying the code manually.');
        }
      }
    } catch (error) {
      console.error('Error opening preview:', error);
      alert('Unable to open preview in new tab. Please check your browser settings.');
    }
  }

  // Create complete HTML document for preview
  private createFullHtmlDocument(code: string): string {
    // Check if code already contains DOCTYPE and html tags
    const hasDoctype = code.toLowerCase().includes('<!doctype');
    const hasHtmlTag = code.toLowerCase().includes('<html');
    
    if (hasDoctype && hasHtmlTag) {
      // Code is already a complete HTML document
      return code;
    }
    
    // Extract CSS and JS if present
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    
    // Remove style and script tags from body content
    let bodyContent = code;
    if (styleMatch) {
      styleMatch.forEach(style => {
        bodyContent = bodyContent.replace(style, '');
      });
    }
    if (scriptMatch) {
      scriptMatch.forEach(script => {
        bodyContent = bodyContent.replace(script, '');
      });
    }
    
    // Create complete HTML structure
    const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoCoder.ai - Live Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #ffffff;
            padding: 20px;
        }
        ${styleMatch ? styleMatch.map(style => style.replace(/<\/?style[^>]*>/gi, '')).join('\n') : ''}
    </style>
    ${scriptMatch ? scriptMatch.join('\n') : ''}
</head>
<body>
    ${bodyContent.trim()}
</body>
</html>`;
    
    return htmlDocument;
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  // Super cool new methods for enhanced functionality

  // Category filtering for quick examples
  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  getFilteredExamples(): QuickExample[] {
    if (this.selectedCategory === 'All') {
      return this.quickExamples;
    }
    return this.quickExamples.filter(example => example.category === this.selectedCategory);
  }

  // Enhanced typing effect for AI responses
  async typeText(text: string, messageId: string): Promise<void> {
    this.isTyping = true;
    const message = this.chatMessages.find(msg => msg.id === messageId);
    if (!message) return;

    message.content = '';
    this.conversation = [...this.chatMessages];

    for (let i = 0; i < text.length; i++) {
      message.content += text[i];
      this.conversation = [...this.chatMessages];
      await this.delay(this.typingSpeed);

      // Trigger change detection
      this.cdr.markForCheck();
    }

    this.isTyping = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Confetti celebration for successful code generation
  celebrateSuccess() {
    if (!this.showConfetti) {
      this.showConfetti = true;
      this.triggerConfetti();

      setTimeout(() => {
        this.showConfetti = false;
        this.cdr.markForCheck();
      }, 3000);
    }
  }

  private triggerConfetti() {
    // Create confetti animation
    const confettiCount = 50;
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    for (let i = 0; i < confettiCount; i++) {
      this.createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
    }
  }

  private createConfettiPiece(color: string) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: ${color};
      top: -10px;
      left: ${Math.random() * 100}vw;
      z-index: 9999;
      pointer-events: none;
      animation: confetti-fall ${2 + Math.random() * 3}s ease-in-out forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;

    document.body.appendChild(confetti);

    setTimeout(() => {
      document.body.removeChild(confetti);
    }, 5000);
  }

  // Voice input functionality
  startVoiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this.addSystemMessage('🎤 Listening... Speak your coding request!');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.currentMessage = transcript;
        this.userInput = transcript;
        this.addSystemMessage(`📝 Heard: "${transcript}"`);
      };

      recognition.onerror = () => {
        this.addSystemMessage('❌ Voice recognition failed. Please try again or type your request.');
      };

      recognition.start();
    } else {
      this.addSystemMessage('❌ Voice input is not supported in your browser.');
    }
  }





  // Quick actions for common tasks
  insertCodeSnippet(snippet: string) {
    const textarea = document.querySelector('.user-input') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);

      textarea.value = before + snippet + after;
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
      textarea.focus();

      this.userInput = textarea.value;
      this.currentMessage = textarea.value;
    }
  }

  // Keyboard shortcuts helper
  showKeyboardShortcuts() {
    const shortcuts = `
🎹 Keyboard Shortcuts:
• Ctrl/Cmd + / - Clear chat
• Ctrl/Cmd + K - New chat
• Ctrl/Cmd + S - Export chat
• Ctrl/Cmd + L - Toggle sidebar
• Alt + 1-8 - Switch language
• Enter - Send message
• Shift + Enter - New line

Type /shortcuts anytime to see this again!
    `.trim();

    this.addSystemMessage(shortcuts);
  }

  // Auto-save functionality
  autoSaveChat() {
    if (this.autoSaveEnabled && this.chatMessages.length > 0) {
      this.saveChatHistory();
      // Show subtle save indicator
      this.addSystemMessage('💾 Chat auto-saved');
      setTimeout(() => {
        // Remove the save message after 2 seconds
        if (this.chatMessages.length > 0 &&
            this.chatMessages[this.chatMessages.length - 1].content === '💾 Chat auto-saved') {
          this.chatMessages.pop();
          this.conversation = [...this.chatMessages];
        }
      }, 2000);
    }
  }

  // Enhanced welcome message with interactive tour
  startInteractiveTour() {
    const steps = [
      '👋 Welcome to AutoCoder.ai!',
      '🚀 Try clicking on the example prompts in the sidebar',
      '⚡ Use keyboard shortcuts: Ctrl+K for new chat, Ctrl+/ to clear',
      '🎨 Switch languages with Alt+1-8 keys',
      '🔧 Configure your API key in the sidebar for better results',
      '💫 Enjoy building amazing things with AI!'
    ];

    let stepIndex = 0;
    const showNextStep = () => {
      if (stepIndex < steps.length) {
        this.addSystemMessage(steps[stepIndex]);
        stepIndex++;
        setTimeout(showNextStep, 2000);
      }
    };

    showNextStep();
  }

  // Advanced code optimization
  async optimizeCode() {
    if (this.currentMessage.trim()) {
      const prompt = `Optimize this code for maximum performance: ${this.currentMessage}`;
      await this.sendMessage();
    } else {
      this.addSystemMessage('💡 Enter a code prompt first, then click Optimize for performance-enhanced code!');
    }
  }

  // Generate code with comprehensive tests
  async generateTests() {
    if (this.currentMessage.trim()) {
      this.addSystemMessage('🧪 Generating code with comprehensive tests...');
      try {
        const result = await this.geminiApi.generateTestedCode(this.currentMessage, this.selectedLanguage);
        const responseMessage: ChatMessage = {
          id: this.generateId(),
          type: 'assistant',
          role: 'assistant',
          content: `✅ **Tested Code Generated!**\n\nHere's your code with comprehensive tests:`,
          code: result.code,
          language: this.selectedLanguage,
          timestamp: new Date()
        };
        this.chatMessages.push(responseMessage);
        this.conversation = [...this.chatMessages];

        // Add tests after a delay
        setTimeout(() => {
          const testMessage: ChatMessage = {
            id: this.generateId(),
            type: 'assistant',
            role: 'assistant',
            content: `🧪 **Unit Tests:**\n\n${result.tests}`,
            timestamp: new Date()
          };
          this.chatMessages.push(testMessage);
          this.conversation = [...this.chatMessages];

          // Add coverage notes
          setTimeout(() => {
            const coverageMessage: ChatMessage = {
              id: this.generateId(),
              type: 'assistant',
              role: 'assistant',
              content: `📊 **Coverage Notes:**\n\n${result.coverage}`,
              timestamp: new Date()
            };
            this.chatMessages.push(coverageMessage);
            this.conversation = [...this.chatMessages];
            this.saveChatHistory();
            this.cdr.markForCheck();
          }, 1000);
        }, 1000);
      } catch (error) {
        this.addSystemMessage('❌ Failed to generate tested code. Please try again.');
      }
    } else {
      this.addSystemMessage('💡 Enter a code prompt first, then click Test for code with comprehensive testing!');
    }
  }

  // Perform comprehensive code review
  async reviewCode() {
    if (this.chatMessages.length > 1) {
      const lastAssistantMessage = [...this.chatMessages].reverse().find(msg => msg.role === 'assistant' && msg.code);
      if (lastAssistantMessage?.code) {
        this.addSystemMessage('🔍 Performing comprehensive code review...');
        try {
          const review = await this.geminiApi.performCodeReview(lastAssistantMessage.code, lastAssistantMessage.language || this.selectedLanguage);

          const reviewMessage: ChatMessage = {
            id: this.generateId(),
            type: 'assistant',
            role: 'assistant',
            content: `📋 **Code Review Results**\n\n🎯 **Overall Score: ${review.score}/100**\n\n${review.issues.map(issue =>
              `🔴 **${issue.severity.toUpperCase()}**: ${issue.description}\n💡 **Suggestion**: ${issue.suggestion}\n`
            ).join('\n')}\n\n📝 **Recommendations:**\n${review.recommendations.map(rec => `• ${rec}`).join('\n')}`,
            timestamp: new Date()
          };
          this.chatMessages.push(reviewMessage);
          this.conversation = [...this.chatMessages];
          this.saveChatHistory();
          this.cdr.markForCheck();
        } catch (error) {
          this.addSystemMessage('❌ Failed to perform code review. Please try again.');
        }
      } else {
        this.addSystemMessage('💡 Generate some code first, then click Review for a comprehensive code analysis!');
      }
    } else {
      this.addSystemMessage('💡 Generate some code first, then click Review for a comprehensive code analysis!');
    }
  }

  // Validate and improve existing code
  async validateCode() {
    if (this.chatMessages.length > 1) {
      const lastAssistantMessage = [...this.chatMessages].reverse().find(msg => msg.role === 'assistant' && msg.code);
      if (lastAssistantMessage?.code) {
        this.addSystemMessage('✅ Validating and improving code...');
        try {
          const result = await this.geminiApi.validateAndImproveCode(lastAssistantMessage.code, lastAssistantMessage.language || this.selectedLanguage);

          const validationMessage: ChatMessage = {
            id: this.generateId(),
            type: 'assistant',
            role: 'assistant',
            content: `🔧 **Code Validation & Improvements**\n\n✅ **Validated Code:**`,
            code: result.validatedCode,
            language: lastAssistantMessage.language || this.selectedLanguage,
            timestamp: new Date()
          };
          this.chatMessages.push(validationMessage);
          this.conversation = [...this.chatMessages];

          // Add improvements after a delay
          setTimeout(() => {
            const improvementsMessage: ChatMessage = {
              id: this.generateId(),
              type: 'assistant',
              role: 'assistant',
              content: `🚀 **Improvements Made:**\n\n${result.improvements.map(imp => `• ${imp}`).join('\n')}`,
              timestamp: new Date()
            };
            this.chatMessages.push(improvementsMessage);
            this.conversation = [...this.chatMessages];
            this.saveChatHistory();
            this.cdr.markForCheck();
          }, 1000);
        } catch (error) {
          this.addSystemMessage('❌ Failed to validate code. Please try again.');
        }
      } else {
        this.addSystemMessage('💡 Generate some code first, then click Validate for code validation and improvements!');
      }
    } else {
      this.addSystemMessage('💡 Generate some code first, then click Validate for code validation and improvements!');
    }
  }

  // Enhanced copy to clipboard with feedback
  copyToClipboard(code?: string) {
    const textToCopy = code || this.generatedContent;
    if (textToCopy) {
      this.clipboard.copy(textToCopy);
      this.copied = true;

      

      setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, 2000);
    }
  }

  // Enhanced preview with better error handling
  showPreviewMethod(code?: string) {
         if (code) {
      this.openPreviewInNewTab(code);
    } else {
      const lastCode = this.chatMessages.slice().reverse().find(msg => msg.code)?.code;
      if (lastCode) {
 
        this.openPreviewInNewTab(lastCode);
      } else {
        this.addSystemMessage('💡 Generate some HTML code first, then click preview to see it live!');
      }
    }
  }

  // Method to get current chat title
  getCurrentChatTitle(): string {
    const currentChat = this.chatHistories.find(chat => chat.id === this.currentChatId);
    return currentChat ? currentChat.title : 'New Chat';
  }

  // Method to share chat
  shareChat(): void {
    // Implementation for sharing chat
    console.log('Share chat functionality');
  }

  // Open code in a new window for viewing/editing
  openCodeInNewWindow(code: string, language?: string): void {
    try {
      const lang = language || this.selectedLanguage || 'text';
      
      // If it's HTML code, render it directly
      if (lang === 'html' || lang === 'css' || code.includes('<html') || code.includes('<!DOCTYPE')) {
        // Create a complete HTML document for rendering
        const fullHtmlContent = this.createFullHtmlDocument(code);
        
        // Open in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.open();
          newWindow.document.write(fullHtmlContent);
          newWindow.document.close();
          newWindow.document.title = `AutoCoder.ai - Live Preview`;
        } else {
          alert('Please allow popups for this site to view the website preview.');
        }
      } else {
        // For non-HTML code, show code viewer
        this.showCodeViewer(code, lang);
      }
    } catch (error) {
      console.error('Error opening code in new window:', error);
      alert('Unable to open preview. Please check your browser settings.');
    }
  }

  // Show code viewer for non-HTML languages
  private showCodeViewer(code: string, language: string): void {
    const languageDisplayName = this.languages.find(l => l.value === language)?.label || language;

    const codeViewerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoCoder.ai - Code Viewer</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Fira Code', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            line-height: 1.5;
            overflow-x: auto;
        }
        .header {
            background: #2d2d30;
            padding: 15px 20px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header h1 {
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
        }
        .header .language {
            color: #cccccc;
            font-size: 14px;
            background: #3e3e42;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        .action-btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        .action-btn:hover {
            background: #1177bb;
        }
        .code-container {
            padding: 20px;
            max-width: 100%;
        }
        .code-block {
            background: #1e1e1e;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .code-header {
            background: #2d2d30;
            padding: 12px 16px;
            border-bottom: 1px solid #3e3e42;
            font-size: 14px;
            color: #cccccc;
        }
        pre {
            margin: 0;
            padding: 16px;
            background: #1e1e1e !important;
            overflow-x: auto;
            font-size: 13px;
            line-height: 1.4;
        }
        code {
            font-family: inherit;
            background: transparent !important;
            color: inherit;
        }
        .line-numbers {
            counter-reset: linenumber;
        }
        .line-numbers .line-numbers-rows {
            position: absolute;
            pointer-events: none;
            top: 0;
            font-size: 100%;
            left: -3.8em;
            width: 3em;
            letter-spacing: -1px;
            border-right: 1px solid #3e3e42;
            user-select: none;
        }
        .line-numbers-rows > span {
            pointer-events: none;
            display: block;
            counter-increment: linenumber;
        }
        .line-numbers-rows > span:before {
            content: counter(linenumber);
            color: #858585;
            display: block;
            padding-right: 0.8em;
            text-align: right;
        }
        .token.comment {
            color: #6a9955;
        }
        .token.string {
            color: #ce9178;
        }
        .token.number {
            color: #b5cea8;
        }
        .token.keyword {
            color: #569cd6;
        }
        .token.function {
            color: #dcdcaa;
        }
        .footer {
            background: #2d2d30;
            padding: 10px 20px;
            border-top: 1px solid #3e3e42;
            text-align: center;
            color: #cccccc;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>AutoCoder.ai Code Viewer</h1>
            <span class="language">${languageDisplayName}</span>
        </div>
        <div class="actions">
            <button class="action-btn" onclick="copyCode()">📋 Copy Code</button>
            <button class="action-btn" onclick="downloadCode()">💾 Download</button>
            <button class="action-btn" onclick="printCode()">🖨️ Print</button>
        </div>
    </div>

    <div class="code-container">
        <div class="code-block">
            <div class="code-header">Generated Code</div>
            <pre class="line-numbers"><code id="code-content" class="language-${language}">${this.escapeHtml(code)}</code></pre>
        </div>
    </div>

    <div class="footer">
        Generated by AutoCoder.ai • ${new Date().toLocaleString()}
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
    <script>
        const code = \`${code.replace(/`/g, '\\`')}\`;

        function copyCode() {
            navigator.clipboard.writeText(code).then(() => {
                showNotification('Code copied to clipboard!');
            });
        }

        function downloadCode() {
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`autocoder-\${Date.now()}.\${getFileExtension()}\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Code downloaded!');
        }

        function printCode() {
            window.print();
        }

        function getFileExtension() {
            const lang = '${language}';
            const extensions = {
                'html': 'html',
                'javascript': 'js',
                'typescript': 'ts',
                'python': 'py',
                'css': 'css',
                'react': 'jsx',
                'vue': 'vue',
                'angular': 'ts'
            };
            return extensions[lang] || 'txt';
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4caf50;
                color: white;
                padding: 12px 16px;
                border-radius: 4px;
                z-index: 1000;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            \`;
            document.body.appendChild(notification);
            setTimeout(() => document.body.removeChild(notification), 3000);
        }

        // Initialize Prism.js
        document.addEventListener('DOMContentLoaded', function() {
            Prism.highlightAll();
        });
    </script>
</body>
</html>`;

    // Open code viewer in new window
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(codeViewerHtml);
      newWindow.document.close();
      newWindow.document.title = `AutoCoder.ai - ${languageDisplayName} Code Viewer`;
    } else {
      alert('Please allow popups for this site to view code.');
    }
  }

  // Helper method to escape HTML for safe display
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}