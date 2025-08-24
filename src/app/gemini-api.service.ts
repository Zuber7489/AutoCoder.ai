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

  constructor() {
    const apiKey = environment.geminiApiKey;
    // Initialize the GoogleGenerativeAI instance
    this.genAI = new GoogleGenerativeAI(apiKey);
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
    } catch (error) {
      console.error('Error in generateCode:', error);
      // Fallback to regular gemini-2.0-flash if experimental fails
      try {
        const fallbackModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const languagePrompt = this.buildEnhancedPrompt(prompt, language);
        const result = await fallbackModel.generateContent(languagePrompt);
        const response = await result.response;
        const text = response.text();
        return this.cleanAndEnhanceCodeResponse(text, language);
      } catch (fallbackError) {
        throw new Error('Failed to generate code. Please try again.');
      }
    }
  }

  private buildEnhancedPrompt(prompt: string, language: string): string {
    const baseInstructions = `You are a senior software engineer creating production-ready code. Generate clean, efficient, and well-structured code.`;
    
    switch (language.toLowerCase()) {
      case 'html':
      case 'htmlcss':
        return `${baseInstructions}

Create a complete, modern HTML page with embedded CSS for: ${prompt}

Requirements:
- Use semantic HTML5 elements
- Include comprehensive CSS styling in <style> tags
- Implement responsive design (mobile-first)
- Add smooth animations and hover effects
- Use modern CSS features (flexbox, grid, custom properties)
- Ensure accessibility (ARIA labels, proper contrast)
- Apply dark theme with professional color scheme
- Include proper meta tags and viewport settings
- Use Google Fonts or web-safe fonts
- Add subtle shadows, gradients, and modern UI elements

Return ONLY the complete HTML with embedded CSS. No explanations or markdown.`;
      
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

Generate modern JavaScript for: ${prompt}

Requirements:
- Use ES6+ features (arrow functions, destructuring, modules)
- Implement proper error handling
- Add comprehensive comments
- Follow clean code principles
- Use modern async/await patterns
- Include input validation
- Optimize for performance

Return ONLY the JavaScript code. No explanations or markdown.`;
      
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
      .trim();

    // Remove common prefixes that AI might add
    cleanedText = cleanedText
      .replace(/^Here's.*?:\s*/i, '')
      .replace(/^Here is.*?:\s*/i, '')
      .replace(/^This is.*?:\s*/i, '')
      .replace(/^Below is.*?:\s*/i, '')
      .trim();

    // Language-specific cleaning
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
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
        }
    </style>
</head>
<body>
${cleanedText}
</body>
</html>`;
      }
    }

    // Final cleanup
    return cleanedText
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
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
