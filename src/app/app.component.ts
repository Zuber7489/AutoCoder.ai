import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GeminiApiService } from './gemini-api.service';
import hljs from 'highlight.js'; // Import highlight.js
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';  // Import Clipboard from Angular CDK

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'code_gen';
  generatedContent: string = '';
  prompt: string = '';
  iframeSrc: SafeResourceUrl | null = null;
  isLoading: boolean = false;
  copied: boolean = false;
  askmeanything:boolean=true;
  constructor(private geminiApi: GeminiApiService,private sanitizer: DomSanitizer,private clipboard: Clipboard) {}

  async generateCode() {
    this.askmeanything=false;
    this.isLoading = true;
    try {

      // Call the generateContent method with the user prompt
      let response = await this.geminiApi.generateCode(this.prompt);

         // Remove backticks using regex
         response = response.replace(/```/g, '');
         response = response.replace(/^html\s+/i, '');
         // Update the codeSnippet with the cleaned response
         this.generatedContent = response;
         this.updateIframe(response);
    } catch (error) {
      this.askmeanything=false;
      console.error('Error generating code:', error);
    } finally {
      this.askmeanything=false;
      this.isLoading = false;
    }
  }

  updateIframe(code: string) {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    // Clean up old blob URLs to prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  copyToClipboard() {
    const codeBlock = document.getElementById('codeBlock')?.textContent || '';
    this.clipboard.copy(codeBlock);
    this.copied = true;

    // Hide the "Copied" message after 2 seconds
    setTimeout(() => {
      this.copied = false;
    }, 2000);
  }

}
