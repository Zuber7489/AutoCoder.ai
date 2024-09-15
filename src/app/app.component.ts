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
  private texts: string[] = [
    'Ask Me Anything...',
    'Generate Code',
    'Generate HTML & CSS Code'
  ];
  private index: number = 0;
  private interval: any;
  title = 'code_gen';
  generatedContent: string = '';
  prompt: string = '';
  iframeSrc: SafeResourceUrl | null = null;
  isLoading: boolean = false;
  copied: boolean = false;
  askmeanything:boolean=true;
  constructor(private geminiApi: GeminiApiService,private sanitizer: DomSanitizer,private clipboard: Clipboard) {}
  ngOnInit(): void {
    this.startTextTransition();
  }

  startTextTransition(): void {
    const transitionText = document.getElementById('transitionText');
    if (!transitionText) return;

    this.typeText(transitionText, this.texts[this.index]);
  }

  typeText(element: HTMLElement, text: string) {
    let i = 0;
    element.textContent = '';
    
    const typingInterval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      if (i > text.length) {
        clearInterval(typingInterval);
        setTimeout(() => {
          this.index = (this.index + 1) % this.texts.length;
          this.typeText(element, this.texts[this.index]);
        }, 2000); // Pause before next text starts typing
      }
    }, 100); // Adjust typing speed
  }
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
