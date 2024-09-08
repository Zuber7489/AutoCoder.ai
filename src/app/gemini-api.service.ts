import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';
@Injectable({
  providedIn: 'root'
})
export class GeminiApiService {
  private genAI: any;

  constructor() {
    const apiKey = environment.geminiApiKey
    // Initialize the GoogleGenerativeAI instance
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateCode(prompt: string): Promise<string> {
    try {
      // For text-only input, use the gemini-pro model
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent(prompt+"USING HTML AND internal CSS ONLY");
      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }
}
