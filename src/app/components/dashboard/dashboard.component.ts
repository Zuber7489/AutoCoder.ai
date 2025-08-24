import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
    private authService: AuthService
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
    // Only auto-scroll if not user scrolling and auto-scroll is enabled
    if (this.autoScroll && !this.isUserScrolling) {
      this.scrollToBottom();
    }
    
    // Set up scroll listener if not already done
    if (this.chatContainer?.nativeElement && !this.chatContainer.nativeElement.onscroll) {
      this.setupScrollListener();
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
      
      // Get suggestions asynchronously
      this.getSuggestionsForMessage(responseMessage.id, processedCode);
      
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
    this.conversation = []; // Sync with template
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
  
  // Set up scroll event listener to detect user scrolling
  private setupScrollListener() {
    if (this.chatContainer?.nativeElement) {
      const container = this.chatContainer.nativeElement;
      
      container.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
        
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
            }
          }, 500);
        } else if (isAtBottom) {
          // User scrolled back to bottom, re-enable auto-scroll
          this.isUserScrolling = false;
          this.showScrollToBottom = false;
          clearTimeout(this.scrollTimeout);
        }
      });
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
    
    // Add welcome message
    this.addSystemMessage('Welcome to AutoCoder.ai! I\'m here to help you generate beautiful, functional code. What would you like to build today?');
    
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
  
  getLanguageIcon(languageValue: string): string {
    const language = this.languages.find(lang => lang.value === languageValue);
    return language ? language.icon : 'fas fa-code';
  }
  
  // Get highlighted code for display
  getHighlightedCode(code: string, language?: string): string {
    if (!code) return '';
    
    try {
      const lang = language || this.selectedLanguage;
      const highlighted = hljs.highlight(code, { language: lang }).value;
      return highlighted;
    } catch (error) {
      console.log('Highlighting failed, using plain text:', error);
      // Return HTML-escaped code if highlighting fails
      return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      
      // Show success message
      this.addSystemMessage('✅ API key saved successfully! You can now use your custom Gemini API key.');
      
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
    
    // Show info message
    this.addSystemMessage('🔄 Switched back to default API key.');
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
      
      this.addSystemMessage('✅ All data cleared successfully! Chat history and settings have been reset.');
      this.closeProfileModal();
    }
  }

  // Template compatibility methods
  trackByMessage(index: number, message: ChatMessage): string {
    return message.id;
  }

  // Show preview method for template compatibility - opens in new tab
  showPreviewMethod(code?: string) {
    if (code) {
      this.openPreviewInNewTab(code);
    }
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
          
          // Show success message
          this.addSystemMessage('✅ Live preview opened in a new tab!');
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
            this.addSystemMessage('✅ Live preview opened in a new tab!');
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
}