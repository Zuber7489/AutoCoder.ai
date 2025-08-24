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

  // API Key Configuration
  customApiKey: string = '';
  hasCustomApiKey: boolean = false;
  showApiConfig: boolean = false;
  showApiKey: boolean = false;

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

    // Initialize API key configuration
    this.loadApiKeyConfig();
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
      
      // Create preview if HTML or contains HTML
      if (this.selectedLanguage === 'html' || 
          messageToProcess.toLowerCase().includes('html') ||
          messageToProcess.toLowerCase().includes('website') ||
          messageToProcess.toLowerCase().includes('page') ||
          messageToProcess.toLowerCase().includes('landing')) {
        this.createPreview(processedCode);
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
    if (content && (content.includes('<') || content.includes('html') || content.includes('css'))) {
      try {
        // Ensure we have complete HTML structure with proper CSS loading
        let fullHtml = content;
        
        // If it's not a complete HTML document, wrap it properly
        if (!content.includes('<!DOCTYPE') && !content.includes('<html')) {
          // Extract any CSS from the content
          const cssMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
          const cssContent = cssMatch ? cssMatch.join('\n') : '';
          
          // Remove style tags from body content
          const bodyContent = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          
          fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <style>
        /* Base styles for better rendering */
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; }
        ${cssContent.replace(/<\/?style[^>]*>/gi, '')}
    </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
        } else {
          // If it's already complete HTML, ensure CSS is properly embedded
          fullHtml = content;
          if (!content.includes('<style>') && !content.includes('style=')) {
            // Add basic styling if no CSS is present
            fullHtml = content.replace(
              '</head>',
              `    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; }
    </style>
</head>`
            );
          }
        }
        
        // Store the content for direct iframe access
        this.previewContent = fullHtml;
        this.showPreviewModal = true;
        
        console.log('Opening preview with content:', fullHtml.substring(0, 500) + '...');
        
        // Use setTimeout to ensure modal is rendered before setting iframe content
        setTimeout(() => {
          if (this.previewFrame?.nativeElement) {
            const iframe = this.previewFrame.nativeElement as HTMLIFrameElement;
            
            // Use srcdoc for better compatibility
            iframe.srcdoc = fullHtml;
            
            // Fallback: try document.write if srcdoc doesn't work
            iframe.onload = () => {
              try {
                if (!iframe.contentDocument?.body?.innerHTML) {
                  const doc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (doc) {
                    doc.open();
                    doc.write(fullHtml);
                    doc.close();
                  }
                }
                console.log('Preview loaded successfully');
              } catch (error) {
                console.error('Error loading preview content:', error);
              }
            };
            
            // Additional fallback with document.write
            setTimeout(() => {
              try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc && (!doc.body || !doc.body.innerHTML.trim())) {
                  doc.open();
                  doc.write(fullHtml);
                  doc.close();
                  console.log('Used document.write fallback');
                }
              } catch (error) {
                console.error('Fallback method failed:', error);
              }
            }, 500);
          }
        }, 300);
        
      } catch (error) {
        console.error('Error creating preview:', error);
        // Final fallback - just set the content
        this.previewContent = content;
        this.showPreviewModal = true;
      }
    }
  }
  
  // Close preview modal
  closePreview() {
    this.showPreviewModal = false;
    this.previewContent = '';
    
    // Clear iframe content
    if (this.previewFrame?.nativeElement) {
      const iframe = this.previewFrame.nativeElement as HTMLIFrameElement;
      iframe.srcdoc = '';
      iframe.src = 'about:blank';
    }
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
    try {
      // Clean up any previous blob URL
      if (this.iframeSrc) {
        const url = this.iframeSrc.toString();
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }

      // Use the code as-is if it's already a complete HTML document
      let htmlContent = code;
      
      // Only wrap if it's not already a complete HTML document
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
      
      console.log('Preview created successfully with full HTML:', htmlContent.substring(0, 200) + '...');
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
}