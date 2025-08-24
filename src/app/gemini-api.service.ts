import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CodeGenerationResponse {
  code: string;
  explanation?: string;
  suggestions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiApiService {
  private genAI: any;
  private defaultApiKey: string;
  private currentApiKey: string;

  constructor() {
    this.defaultApiKey = environment.geminiApiKey;
    this.currentApiKey = this.getStoredApiKey() || this.defaultApiKey;
    this.initializeGeminiAI();
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

  async generateCode(prompt: string, language: string = 'javascript'): Promise<string> {
    try {
      // Use the improved Gemini 2.0 Flash model
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Create enhanced language-specific prompts
      const languagePrompt = this.buildEnhancedPrompt(prompt, language);

      const result = await model.generateContent(languagePrompt);
      const response = await result.response;
      const text = response.text();

      // Clean up and enhance the response
      return this.cleanAndEnhanceCodeResponse(text, language);
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
        const languagePrompt = this.buildEnhancedPrompt(prompt, language);
        const result = await fallbackModel.generateContent(languagePrompt);
        const response = await result.response;
        const text = response.text();
        return this.cleanAndEnhanceCodeResponse(text, language);
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
    const baseInstructions = `You are an expert software engineer. Create beautiful, professional, production-ready code that follows modern best practices.`;
    
    switch (language.toLowerCase()) {
      case 'html':
      case 'htmlcss':
        return `${baseInstructions}

Create a stunning, modern HTML page with embedded CSS for: ${prompt}

IMPORTANT REQUIREMENTS:
- Generate a COMPLETE HTML document with DOCTYPE
- Use modern, beautiful design with gradients and animations
- Implement a professional dark theme (#0f172a background, #1e293b cards)
- Add responsive design that works on all devices
- Use modern CSS Grid and Flexbox layouts
- Include smooth hover effects and micro-interactions
- Add subtle shadows, border-radius, and modern typography
- Use professional color palette (blues, purples, grays)
- Include loading animations if applicable
- Add proper spacing and visual hierarchy
- Use CSS custom properties for consistent theming
- Ensure excellent user experience and accessibility

Style Guidelines:
- Font: 'Inter', 'Segoe UI', sans-serif
- Primary colors: #3b82f6 (blue), #8b5cf6 (purple)
- Background: #0f172a, Cards: #1e293b
- Text: #e2e8f0, Muted: #94a3b8
- Borders: #334155
- Shadows: rgba(0, 0, 0, 0.3)

Return ONLY the complete HTML code. No explanations or markdown blocks.`;
      
      case 'css':
        return `${baseInstructions}

Generate modern CSS for: ${prompt}

Requirements:
- Use modern CSS features (custom properties, flexbox, grid)
- Implement responsive design with media queries
- Add smooth transitions and animations
- Use a consistent color scheme and typography
- Include hover and focus states
- Apply best practices for performance
- Use BEM or similar naming convention

Return ONLY the CSS code. No explanations or markdown.`;
      
      case 'javascript':
      case 'js':
        return `${baseInstructions}

Generate modern, high-quality JavaScript for: ${prompt}

Requirements:
- Use ES6+ syntax (arrow functions, destructuring, template literals)
- Implement comprehensive error handling with try-catch
- Add detailed comments explaining complex logic
- Use modern async/await for asynchronous operations
- Include input validation and type checking
- Follow clean code principles (DRY, SOLID)
- Use meaningful variable and function names
- Optimize for performance and readability
- Add JSDoc comments for functions
- Include proper event handling

Return ONLY the JavaScript code. No explanations or markdown blocks.`;
      
      case 'typescript':
      case 'ts':
        return `${baseInstructions}

Generate TypeScript code for: ${prompt}

Requirements:
- Use strong typing with interfaces and types
- Implement proper error handling
- Follow TypeScript best practices
- Use modern ES6+ features
- Add comprehensive JSDoc comments
- Include proper imports/exports
- Use generics where appropriate

Return ONLY the TypeScript code. No explanations or markdown.`;
      
      case 'react':
      case 'jsx':
        return `${baseInstructions}

Generate a React component for: ${prompt}

Requirements:
- Use functional components with hooks
- Implement proper TypeScript typing
- Add proper props validation
- Use modern React patterns
- Include error boundaries where needed
- Follow React best practices
- Add accessibility features
- Use modern styling approach

Return ONLY the React component code. No explanations or markdown.`;
      
      case 'vue':
        return `${baseInstructions}

Generate a Vue 3 component for: ${prompt}

Requirements:
- Use Composition API
- Implement proper TypeScript typing
- Add reactive data and computed properties
- Follow Vue 3 best practices
- Include proper template structure
- Use modern Vue features
- Add proper event handling

Return ONLY the Vue component code. No explanations or markdown.`;
      
      case 'angular':
        return `${baseInstructions}

Generate an Angular component for: ${prompt}

Requirements:
- Use modern Angular features
- Implement proper TypeScript typing
- Add component lifecycle hooks
- Follow Angular style guide
- Use dependency injection
- Include proper template and styling
- Add form validation if needed

Return ONLY the Angular component code. No explanations or markdown.`;
      
      case 'python':
        return `${baseInstructions}

Generate Python code for: ${prompt}

Requirements:
- Follow PEP 8 style guidelines
- Use type hints
- Add comprehensive docstrings
- Implement proper error handling
- Use modern Python features
- Include input validation
- Follow clean code principles

Return ONLY the Python code. No explanations or markdown.`;
      
      default:
        return `${baseInstructions}

Generate clean, well-documented ${language} code for: ${prompt}

Requirements:
- Follow language best practices
- Add proper comments and documentation
- Implement error handling
- Use modern language features
- Ensure code readability and maintainability

Return ONLY the ${language} code. No explanations or markdown.`;
    }
  }

  private cleanAndEnhanceCodeResponse(text: string, language: string): string {
    // Remove various markdown code block patterns
    let cleanedText = text
      .replace(/```[\w-]*\n?/g, '') // Remove opening code blocks
      .replace(/```\s*$/g, '') // Remove closing code blocks
      .replace(/^\s*```[\w-]*\s*/g, '') // Remove opening blocks at start
      .replace(/\s*```\s*$/g, '') // Remove closing blocks at end
      .replace(/^```[\w-]*\s*/gm, '') // Remove any remaining code block markers
      .replace(/```$/gm, '') // Remove closing markers
      .trim();

    // Remove common AI response prefixes
    cleanedText = cleanedText
      .replace(/^Here's.*?[:\n]\s*/i, '')
      .replace(/^Here is.*?[:\n]\s*/i, '')
      .replace(/^This is.*?[:\n]\s*/i, '')
      .replace(/^Below is.*?[:\n]\s*/i, '')
      .replace(/^I'll create.*?[:\n]\s*/i, '')
      .replace(/^Let me create.*?[:\n]\s*/i, '')
      .replace(/^\*\*.*?\*\*\s*/g, '') // Remove bold markdown
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

  // Method to get code suggestions
  async getCodeSuggestions(code: string, language: string): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Analyze this ${language} code and provide 3 specific improvement suggestions:\n\n${code}\n\nProvide only the suggestions as a numbered list, no explanations.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text.split('\n').filter((line: string) => line.trim().match(/^\d+\./)).slice(0, 3);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  // Method to explain code
  async explainCode(code: string, language: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Provide a brief explanation of what this ${language} code does:\n\n${code}\n\nKeep the explanation concise and beginner-friendly.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error explaining code:', error);
      return 'Unable to generate explanation.';
    }
  }
}
