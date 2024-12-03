import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      // For text-only input, use the gemini-pro model
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Create a language-specific prompt
      let languagePrompt = '';
      
      if (language === 'htmlcss') {
        languagePrompt = `Generate a complete HTML page with internal CSS styling for the following requirement:
${prompt}

Please include both HTML structure and CSS styling in a single file. Make sure to:
1. Use internal CSS (style tag in head)
2. Make it visually appealing and modern
3. Include responsive design
4. Use proper semantic HTML5 elements
5. Add hover effects and transitions where appropriate

Return ONLY the complete HTML code with internal CSS, no explanations or markdown.`;
      } else {
        languagePrompt = `Generate code in ${language} for the following requirement:\n${prompt}\n` +
          `Please provide only the code without any explanations or markdown formatting.`;
      }

      const result = await model.generateContent(languagePrompt);
      const response = await result.response;
      const text = response.text();

      // Clean up the response
      return this.cleanCodeResponse(text);
    } catch (error) {
      console.error('Error in generateCode:', error);
      throw error;
    }
  }

  private cleanCodeResponse(text: string): string {
    // Remove code block markers if present
    let cleanedText = text.replace(/```[\w-]*\n?/g, '');
    
    // Remove any trailing/leading code block markers
    cleanedText = cleanedText.replace(/```$/g, '');
    
    // Trim whitespace
    cleanedText = cleanedText.trim();
    
    return cleanedText;
  }
}
