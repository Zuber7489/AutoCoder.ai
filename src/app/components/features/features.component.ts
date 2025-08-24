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
      icon: '🚀',
      title: 'Lightning Fast Generation',
      description: 'Generate production-ready code in seconds with our advanced Gemini 2.0 Flash model',
      benefits: ['Sub-second response times', 'Optimized for speed', 'Real-time suggestions']
    },
    {
      icon: '🎨',
      title: 'Multi-Language Support',
      description: 'Support for all major programming languages and frameworks',
      benefits: ['JavaScript/TypeScript', 'Python', 'HTML/CSS', 'React/Vue/Angular']
    },
    {
      icon: '👁️',
      title: 'Live Preview',
      description: 'See your code come to life instantly with integrated preview',
      benefits: ['Real-time rendering', 'Responsive design testing', 'Fullscreen mode']
    },
    {
      icon: '🔧',
      title: 'Code Optimization',
      description: 'AI-powered code optimization and best practices',
      benefits: ['Performance optimization', 'Security best practices', 'Clean code standards']
    },
    {
      icon: '📱',
      title: 'Responsive Design',
      description: 'Generate responsive layouts that work on all devices',
      benefits: ['Mobile-first approach', 'Cross-browser compatibility', 'Modern CSS Grid/Flexbox']
    },
    {
      icon: '⚡',
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