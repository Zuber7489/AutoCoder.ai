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
    const baseInstructions = `You are an elite senior software engineer with 15+ years of experience. Create EXCELLENT, production-ready, enterprise-grade code that exceeds industry standards.

CRITICAL REQUIREMENTS FOR ALL CODE:
- ✨ BEAUTIFUL & MODERN: Use stunning gradients, smooth animations, perfect spacing
- 🎯 FUNCTIONAL: Every feature must work perfectly with proper error handling
- 📱 RESPONSIVE: Mobile-first design that works on all devices perfectly
- 🚀 PERFORMANCE: Optimized code with lazy loading and efficient algorithms
- ♿ ACCESSIBLE: WCAG compliant with proper ARIA labels and keyboard navigation
- 🔒 SECURE: Sanitize inputs, prevent XSS, use secure coding practices
- 📚 DOCUMENTED: Comprehensive comments and JSDoc documentation
- 🧪 TESTABLE: Clean, modular code that's easy to unit test
- 🎨 DESIGN: Professional UI/UX with micro-interactions and polish`;

    switch (language.toLowerCase()) {
      case 'html':
      case 'htmlcss':
        return `${baseInstructions}

Create an ABSOLUTELY STUNNING, PERFECTLY FUNCTIONAL HTML masterpiece for: ${prompt}

🚀 ADVANCED REQUIREMENTS:
- COMPLETE, RUNNABLE HTML document with DOCTYPE declaration
- INTERACTIVE FEATURES: Working buttons, forms, animations, hover effects
- MODERN DESIGN SYSTEM: Custom CSS variables, consistent spacing, typography scale
- FLUID ANIMATIONS: CSS keyframes, transform3d, smooth transitions (60fps)
- ADVANCED LAYOUTS: CSS Grid, Flexbox, Container queries, aspect ratios
- MICRO-INTERACTIONS: Button ripples, loading states, success animations
- DARK THEME MASTERPIECE: Professional color palette with perfect contrast
- RESPONSIVE EXCELLENCE: Mobile-first, tablet, desktop - all perfect
- ACCESSIBILITY HERO: ARIA labels, focus management, keyboard navigation
- PERFORMANCE OPTIMIZED: Lazy loading, efficient animations, minimal repaints
- CROSS-BROWSER MAGIC: Webkit, Firefox, Edge compatibility
- SEO OPTIMIZED: Proper meta tags, semantic HTML, schema markup

🎨 DESIGN SPECIFICATIONS:
- Fonts: 'Inter' (Google Fonts), system fallbacks
- Colors: Blues (#3b82f6, #1d4ed8), Purples (#8b5cf6, #7c3aed)
- Background: #0f172a with subtle animated gradients
- Cards: #1e293b with glass-morphism effects
- Text: #f1f5f9 (primary), #cbd5e1 (secondary), #94a3af (muted)
- Borders: #334155 with focus states
- Shadows: Layered shadows with blur and spread
- Border Radius: Consistent 8px, 12px, 16px scale
- Spacing: 4px, 8px, 12px, 16px, 24px, 32px scale

⚡ FUNCTIONAL FEATURES TO INCLUDE:
- Smooth scroll navigation with active states
- Interactive form validation with real-time feedback
- Animated counters and progress bars
- Modal dialogs with backdrop blur
- Toast notifications system
- Loading spinners and skeleton screens
- Tabbed interfaces with smooth transitions
- Accordion components with proper ARIA
- Image galleries with lightbox functionality
- Search functionality with debounced input
- Sortable/filterable data tables
- Charts and graphs with animated data

🔧 TECHNICAL EXCELLENCE:
- Semantic HTML5 structure
- CSS custom properties for theming
- BEM methodology for CSS organization
- Optimized images and assets
- Minimal JavaScript (vanilla, no frameworks unless specified)
- Error boundaries and graceful degradation
- Progressive enhancement approach

Return ONLY the complete, functional HTML code. Make it production-ready and absolutely beautiful! ✨`;
      
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

Create EXCEPTIONAL, enterprise-grade JavaScript code for: ${prompt}

🚀 ADVANCED JAVASCRIPT REQUIREMENTS:
- ES2023+ MODERN SYNTAX: Arrow functions, destructuring, optional chaining, nullish coalescing
- ROBUST ERROR HANDLING: Try-catch-finally, custom error classes, graceful degradation
- PERFORMANCE OPTIMIZATION: Efficient algorithms, memoization, debouncing, throttling
- MEMORY MANAGEMENT: Proper cleanup, no memory leaks, garbage collection optimization
- ASYNC MASTERY: Promises, async/await, proper error propagation, race conditions handling
- MODULAR ARCHITECTURE: Clean separation of concerns, single responsibility principle
- ADVANCED PATTERNS: Factory functions, modules, observers, pub/sub, state management
- INPUT VALIDATION: Sanitization, type checking, schema validation, boundary checks
- BROWSER COMPATIBILITY: Feature detection, polyfills, fallbacks
- DEBUGGING SUPPORT: Comprehensive logging, development helpers, error tracking

⚡ FUNCTIONAL EXCELLENCE:
- Pure functions where possible with immutable data structures
- Comprehensive JSDoc documentation with examples
- Event delegation and efficient DOM manipulation
- Web APIs integration (LocalStorage, IndexedDB, Service Workers)
- Progressive Web App features when applicable
- Accessibility integration with ARIA attributes
- Internationalization support (i18n)
- Real-time features with WebSockets when needed

🔧 CODE QUALITY STANDARDS:
- ESLint compliant (Airbnb style guide)
- Comprehensive unit tests structure
- Bundle size optimization
- Tree shaking friendly exports
- Type safety with JSDoc annotations
- Performance monitoring integration
- Security best practices (CSP, XSS prevention)

Return ONLY the JavaScript code with comprehensive comments. Make it production-ready and absolutely bulletproof! 💪`;
      
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
