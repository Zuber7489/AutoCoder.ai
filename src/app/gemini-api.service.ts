import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CodeGenerationResponse {
  code: string;
  explanation?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  language?: string;
}

export interface ConversationContext {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiApiService {
  private genAI: any;
  private defaultApiKey: string;
  private currentApiKey: string;
  private conversations: Map<string, ConversationContext> = new Map();
  private currentConversationId: string | null = null;
  private readonly MAX_CONVERSATION_LENGTH = 5000; // Maximum messages per conversation
  private readonly STORAGE_KEY = 'gemini_conversations';

  constructor() {
    this.defaultApiKey = environment.geminiApiKey;
    this.currentApiKey = this.getStoredApiKey() || this.defaultApiKey;
    this.initializeGeminiAI();
    this.loadConversationsFromStorage();
  }

  private getStoredApiKey(): string | null {
    return localStorage.getItem('gemini_api_key');
  }

  private initializeGeminiAI() {
    // Initialize the GoogleGenerativeAI instance with current API key
    this.genAI = new GoogleGenerativeAI(this.currentApiKey);
  }

  updateApiKey(newApiKey: string) {
    this.currentApiKey = newApiKey;
    this.initializeGeminiAI();
  }

  resetToDefaultApiKey() {
    this.currentApiKey = this.defaultApiKey;
    this.initializeGeminiAI();
  }

  getCurrentApiKey(): string {
    return this.currentApiKey;
  }

  isUsingCustomApiKey(): boolean {
    return this.currentApiKey !== this.defaultApiKey;
  }

  // Conversation Management Methods
  private loadConversationsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedConversations = JSON.parse(stored);
        // Convert date strings back to Date objects
        Object.values(parsedConversations).forEach((conv: any) => {
          conv.createdAt = new Date(conv.createdAt);
          conv.updatedAt = new Date(conv.updatedAt);
          conv.messages.forEach((msg: any) => {
            msg.timestamp = new Date(msg.timestamp);
          });
          this.conversations.set(conv.id, conv);
        });
      }
    } catch (error) {
      console.error('Error loading conversations from storage:', error);
    }
  }

  private saveConversationsToStorage(): void {
    try {
      const conversationsObject = Object.fromEntries(this.conversations);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conversationsObject));
    } catch (error) {
      console.error('Error saving conversations to storage:', error);
    }
  }

  startNewConversation(title?: string): string {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: ConversationContext = {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      title: title || 'New Conversation'
    };

    this.conversations.set(conversationId, conversation);
    this.currentConversationId = conversationId;
    this.saveConversationsToStorage();
    return conversationId;
  }

  setCurrentConversation(conversationId: string): boolean {
    if (this.conversations.has(conversationId)) {
      this.currentConversationId = conversationId;
      return true;
    }
    return false;
  }

  getCurrentConversation(): ConversationContext | null {
    return this.currentConversationId ? this.conversations.get(this.currentConversationId) || null : null;
  }

  getAllConversations(): ConversationContext[] {
    return Array.from(this.conversations.values()).sort((a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  deleteConversation(conversationId: string): boolean {
    const deleted = this.conversations.delete(conversationId);
    if (deleted) {
      if (this.currentConversationId === conversationId) {
        this.currentConversationId = null;
      }
      this.saveConversationsToStorage();
    }
    return deleted;
  }

  clearAllConversations(): void {
    this.conversations.clear();
    this.currentConversationId = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private addMessageToConversation(role: 'user' | 'assistant', content: string, language?: string): void {
    if (!this.currentConversationId) {
      this.startNewConversation();
    }

    const conversation = this.conversations.get(this.currentConversationId!);
    if (conversation) {
      const message: ChatMessage = {
        role,
        content,
        timestamp: new Date(),
        language
      };

      conversation.messages.push(message);
      conversation.updatedAt = new Date();

      // Trim conversation if it gets too long (keep last MAX_CONVERSATION_LENGTH messages)
      if (conversation.messages.length > this.MAX_CONVERSATION_LENGTH) {
        conversation.messages = conversation.messages.slice(-this.MAX_CONVERSATION_LENGTH);
      }

      this.saveConversationsToStorage();
    }
  }

  private getConversationContext(): string {
    const conversation = this.getCurrentConversation();
    if (!conversation || conversation.messages.length === 0) {
      return '';
    }

    // Get last 10 messages for context (to avoid token limits)
    const recentMessages = conversation.messages.slice(-10);
    const context = recentMessages.map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');

    return `Previous conversation context:\n${context}\n\n`;
  }

  async generateCode(prompt: string, language: string = 'javascript'): Promise<string> {
    try {
      // Add user message to conversation
      this.addMessageToConversation('user', prompt, language);

      // Use the improved Gemini 2.0 Flash model
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Get conversation context and create enhanced language-specific prompts
      const context = this.getConversationContext();
      const languagePrompt = context + this.buildEnhancedPrompt(prompt, language);

      const result = await model.generateContent(languagePrompt);
      const response = await result.response;
      const text = response.text();

      // Clean up and enhance the response
      const cleanedResponse = this.cleanAndEnhanceCodeResponse(text, language);

      // Add assistant response to conversation
      this.addMessageToConversation('assistant', cleanedResponse, language);

      return cleanedResponse;
    } catch (error: any) {
      console.error('Error in generateCode:', error);

      // Check for API key related errors
      if (error?.message?.includes('API_KEY') || error?.message?.includes('Invalid API key') || error?.message?.includes('403') || error?.status === 403) {
        throw new Error('❌ Invalid API key. Please check your Gemini API key in the sidebar settings.');
      }

      if (error?.message?.includes('quota') || error?.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('📊 API quota exceeded. Please try again later or use your own API key.');
      }

      // Fallback to regular gemini-2.0-flash if experimental fails
      try {
        const fallbackModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const context = this.getConversationContext();
        const languagePrompt = context + this.buildEnhancedPrompt(prompt, language);
        const result = await fallbackModel.generateContent(languagePrompt);
        const response = await result.response;
        const text = response.text();
        const cleanedResponse = this.cleanAndEnhanceCodeResponse(text, language);

        // Add assistant response to conversation even on fallback
        this.addMessageToConversation('assistant', cleanedResponse, language);

        return cleanedResponse;
      } catch (fallbackError: any) {
        console.error('Fallback error:', fallbackError);
        if (fallbackError?.message?.includes('API_KEY') || fallbackError?.message?.includes('Invalid API key') || fallbackError?.message?.includes('403') || fallbackError?.status === 403) {
          throw new Error('❌ Invalid API key. Please check your Gemini API key in the sidebar settings.');
        }
        throw new Error('⚠️ Failed to generate code. Please try again or check your API key.');
      }
    }
  }

  private buildEnhancedPrompt(prompt: string, language: string): string {
    const baseInstructions = `You are a helpful coding assistant. Please generate clean, well-documented code.`;

    switch (language.toLowerCase()) {
      case 'html':
      case 'htmlcss':
        return `${baseInstructions}

Create HTML code for: ${prompt}

Return ONLY the complete, functional HTML code.`;
      
      case 'css':
        return `${baseInstructions}

Generate CSS for: ${prompt}

Return ONLY the CSS code.`;
      
      case 'javascript':
      case 'js':
        return `${baseInstructions}

Create JavaScript code for: ${prompt}

Return ONLY the JavaScript code with comments.`;
      
      case 'typescript':
      case 'ts':
        return `${baseInstructions}

Generate TypeScript code for: ${prompt}

Return ONLY the TypeScript code.`;
      
      case 'react':
      case 'jsx':
        return `${baseInstructions}

Generate a React component for: ${prompt}

Return ONLY the React component code.`;
      
      case 'vue':
        return `${baseInstructions}

Generate a Vue 3 component for: ${prompt}

Return ONLY the Vue component code.`;
      
      case 'angular':
        return `${baseInstructions}

Generate an Angular component for: ${prompt}

Return ONLY the Angular component code.`;
      
      case 'python':
        return `${baseInstructions}

Generate Python code for: ${prompt}

Return ONLY the Python code.`;
      
      default:
        return `${baseInstructions}

Generate ${language} code for: ${prompt}

Return ONLY the ${language} code.`;
    }
  }

  private cleanAndEnhanceCodeResponse(text: string, language: string): string {
    // Enhanced markdown code block removal
    let cleanedText = text
      .replace(/```[\w-]*\n?/g, '') // Remove opening code blocks
      .replace(/```\s*$/g, '') // Remove closing code blocks
      .replace(/^\s*```[\w-]*\s*/g, '') // Remove opening blocks at start
      .replace(/\s*```\s*$/g, '') // Remove closing blocks at end
      .replace(/^```[\w-]*\s*/gm, '') // Remove any remaining code block markers
      .replace(/```$/gm, '') // Remove closing markers
      .replace(/~~~[\w-]*\n?/g, '') // Remove alternative code blocks
      .replace(/~~~\s*$/g, '') // Remove alternative closing blocks
      .trim();

    // Advanced AI response prefix removal
    cleanedText = cleanedText
      .replace(/^Here's.*?[:\n]\s*/i, '')
      .replace(/^Here is.*?[:\n]\s*/i, '')
      .replace(/^This is.*?[:\n]\s*/i, '')
      .replace(/^Below is.*?[:\n]\s*/i, '')
      .replace(/^I'll create.*?[:\n]\s*/i, '')
      .replace(/^Let me create.*?[:\n]\s*/i, '')
      .replace(/^Here's the.*?[:\n]\s*/i, '')
      .replace(/^Here are.*?[:\n]\s*/i, '')
      .replace(/^The following.*?[:\n]\s*/i, '')
      .replace(/^Here's a.*?[:\n]\s*/i, '')
      .replace(/^\*\*.*?\*\*\s*/g, '') // Remove bold markdown
      .replace(/^###.*?$/gm, '') // Remove headers
      .replace(/^##.*?$/gm, '') // Remove subheaders
      .replace(/^#.*?$/gm, '') // Remove main headers
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
      .trim();

    // Language-specific enhancements
    if (language === 'html' || language === 'htmlcss') {
      // Ensure we have a complete HTML document
      if (!cleanedText.includes('<!DOCTYPE') && !cleanedText.includes('<html')) {
        // If it's just a fragment, wrap it in a complete HTML structure
        cleanedText = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
${cleanedText}
    </div>
</body>
</html>`;
      }
      
      // Enhance existing HTML with better styling if needed
      if (!cleanedText.includes('font-family') && cleanedText.includes('<style>')) {
        cleanedText = cleanedText.replace(
          /<style>/i,
          `<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            box-sizing: border-box;
        }`
        );
      }
    }

    // Final cleanup and formatting
    return cleanedText
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .trim();
  }



  // Method to explain code
  async explainCode(code: string, language: string): Promise<string> {
    try {
      // Add user message to conversation
      const userPrompt = `Please explain what this ${language} code does:\n\n${code}`;
      this.addMessageToConversation('user', userPrompt, language);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const context = this.getConversationContext();
      const prompt = context + `Provide a brief explanation of what this ${language} code does:\n\n${code}\n\nKeep the explanation concise and beginner-friendly.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const explanation = response.text().trim();

      // Add assistant response to conversation
      this.addMessageToConversation('assistant', explanation, language);

      return explanation;
    } catch (error) {
      console.error('Error explaining code:', error);
      return 'Unable to generate explanation.';
    }
  }

  // Enhanced code validation and improvement
  async validateAndImproveCode(code: string, language: string): Promise<{ validatedCode: string; improvements: string[] }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Analyze this ${language} code and provide:
1. VALIDATED CODE: Fix any issues, improve syntax, add missing parts
2. IMPROVEMENTS: List specific improvements made

Code to analyze:
${code}

Return in this format:
VALIDATED_CODE_HERE

IMPROVEMENTS:
- Improvement 1
- Improvement 2
- Improvement 3`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      const parts = text.split('IMPROVEMENTS:');
      const validatedCode = parts[0].replace('VALIDATED_CODE_HERE', '').trim();
      const improvementsText = parts[1] || '';
      const improvements = improvementsText
        .split('\n')
        .map((line: string) => line.replace(/^-\s*/, '').trim())
        .filter((line: string) => line.length > 0);

      return {
        validatedCode: this.cleanAndEnhanceCodeResponse(validatedCode, language),
        improvements
      };
    } catch (error) {
      console.error('Error validating code:', error);
      return {
        validatedCode: code,
        improvements: ['Unable to validate code due to API error']
      };
    }
  }

  // Generate optimized code with performance improvements
  async generateOptimizedCode(prompt: string, language: string): Promise<{ code: string; optimizations: string[] }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const optimizationPrompt = `Create highly optimized ${language} code for: ${prompt}

REQUIREMENTS:
- Performance optimized with efficient algorithms
- Minimal memory usage and no memory leaks
- Fast execution and minimal CPU usage
- Optimized for the specific use case
- Best practices for performance
- Include performance metrics/comments

Also provide a list of optimizations made.`;

      const result = await model.generateContent(optimizationPrompt);
      const response = await result.response;
      const text = response.text();

      // Extract code and optimizations
      const codeMatch = text.match(/```[\w-]*\n([\s\S]*?)\n```/);
      const code = codeMatch ? codeMatch[1].trim() : text.split('OPTIMIZATIONS')[0].trim();

      const optimizationsText = text.split('OPTIMIZATIONS')[1] || text.split('Optimizations')[1] || '';
      const optimizations = optimizationsText
        .split('\n')
        .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
        .filter((line: string) => line.length > 0 && !line.toLowerCase().includes('optimizations'));

      return {
        code: this.cleanAndEnhanceCodeResponse(code, language),
        optimizations: optimizations.length > 0 ? optimizations : ['Code optimized for performance']
      };
    } catch (error) {
      console.error('Error generating optimized code:', error);
      const fallbackCode = await this.generateCode(prompt, language);
      return {
        code: fallbackCode,
        optimizations: ['Unable to generate optimizations due to API error']
      };
    }
  }

  // Generate code with comprehensive testing
  async generateTestedCode(prompt: string, language: string): Promise<{ code: string; tests: string; coverage: string }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const testPrompt = `Create ${language} code with comprehensive tests for: ${prompt}

REQUIREMENTS:
1. Main functional code
2. Unit tests (Jest/Mocha style)
3. Integration tests if applicable
4. Code coverage considerations
5. Test documentation

Return in this format:
MAIN_CODE_HERE

TESTS_HERE

COVERAGE_NOTES_HERE`;

      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      const parts = text.split(/(?:MAIN_CODE|TESTS|COVERAGE_NOTES)_HERE/);
      const code = parts[1]?.trim() || text.split('TESTS_HERE')[0].trim();
      const tests = parts[3]?.trim() || text.split('TESTS_HERE')[1]?.split('COVERAGE_NOTES_HERE')[0]?.trim() || 'Tests not generated';
      const coverage = parts[5]?.trim() || text.split('COVERAGE_NOTES_HERE')[1]?.trim() || 'Coverage analysis not available';

      return {
        code: this.cleanAndEnhanceCodeResponse(code, language),
        tests: this.cleanAndEnhanceCodeResponse(tests, language),
        coverage
      };
    } catch (error) {
      console.error('Error generating tested code:', error);
      const fallbackCode = await this.generateCode(prompt, language);
      return {
        code: fallbackCode,
        tests: `// Unit tests for ${language} code\n// Add your test cases here`,
        coverage: 'Unable to generate coverage analysis'
      };
    }
  }

  // Advanced code review and suggestions
  async performCodeReview(code: string, language: string): Promise<{
    score: number;
    issues: Array<{ type: string; severity: string; description: string; suggestion: string }>;
    recommendations: string[];
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const reviewPrompt = `Perform a comprehensive code review of this ${language} code:

${code}

Provide:
1. OVERALL SCORE (0-100)
2. ISSUES_FOUND (JSON format)
3. RECOMMENDATIONS (list)

Format:
SCORE: [number]

ISSUES:
[
  {
    "type": "performance|security|maintainability|functionality",
    "severity": "critical|high|medium|low",
    "description": "brief description",
    "suggestion": "how to fix"
  }
]

RECOMMENDATIONS:
- Recommendation 1
- Recommendation 2`;

      const result = await model.generateContent(reviewPrompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;

      let issues: Array<{ type: string; severity: string; description: string; suggestion: string }> = [];
      try {
        const issuesMatch = text.match(/ISSUES:\s*\[([\s\S]*?)\]/);
        if (issuesMatch) {
          issues = JSON.parse(`[${issuesMatch[1]}]`);
        }
      } catch (e) {
        // Fallback issues
        issues = [{
          type: 'general',
          severity: 'medium',
          description: 'Code review completed',
          suggestion: 'Review completed successfully'
        }];
      }

      const recommendationsText = text.split('RECOMMENDATIONS:')[1] || '';
      const recommendations = recommendationsText
        .split('\n')
        .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
        .filter((line: string) => line.length > 0);

      return { score, issues, recommendations };
    } catch (error) {
      console.error('Error performing code review:', error);
      return {
        score: 75,
        issues: [{
          type: 'general',
          severity: 'low',
          description: 'Code review could not be completed',
          suggestion: 'Manual review recommended'
        }],
        recommendations: ['Consider manual code review']
      };
    }
  }
}
