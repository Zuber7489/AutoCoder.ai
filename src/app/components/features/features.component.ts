import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss']
})
export class FeaturesComponent {
  
  features = [
    {
      icon: 'fas fa-rocket',
      title: 'Lightning Fast Generation',
      description: 'Generate production-ready code in seconds with our advanced Gemini 2.0 Flash model',
      benefits: ['Sub-second response times', 'Optimized for speed', 'Real-time suggestions']
    },
    {
      icon: 'fas fa-palette',
      title: 'Multi-Language Support',
      description: 'Support for all major programming languages and frameworks',
      benefits: ['JavaScript/TypeScript', 'Python', 'HTML/CSS', 'React/Vue/Angular']
    },
    {
      icon: 'fas fa-eye',
      title: 'Live Preview',
      description: 'See your code come to life instantly with integrated preview',
      benefits: ['Real-time rendering', 'Responsive design testing', 'Fullscreen mode']
    },
    {
      icon: 'fas fa-cogs',
      title: 'Code Optimization',
      description: 'AI-powered code optimization and best practices',
      benefits: ['Performance optimization', 'Security best practices', 'Clean code standards']
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'Responsive Design',
      description: 'Generate responsive layouts that work on all devices',
      benefits: ['Mobile-first approach', 'Cross-browser compatibility', 'Modern CSS Grid/Flexbox']
    },
    {
      icon: 'fas fa-bolt',
      title: 'Instant Deployment',
      description: 'Deploy your generated code instantly to the cloud',
      benefits: ['One-click deployment', 'CDN integration', 'Custom domains']
    }
  ];

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToPricing() {
    this.router.navigate(['/pricing']);
  }
}