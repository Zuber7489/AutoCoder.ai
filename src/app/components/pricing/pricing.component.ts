import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {
  
  pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '50 code generations per month',
        'Basic language support',
        'Community support',
        'Standard preview',
        'Personal projects only'
      ],
      buttonText: 'Get Started Free',
      popular: false,
      color: 'gray'
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      description: 'For professional developers',
      features: [
        'Unlimited code generations',
        'All programming languages',
        'Priority support',
        'Advanced preview modes',
        'Commercial use allowed',
        'Code optimization',
        'Export to GitHub'
      ],
      buttonText: 'Start Pro Trial',
      popular: true,
      color: 'blue'
    },
    {
      name: 'Team',
      price: '$49',
      period: 'per month',
      description: 'For development teams',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Shared workspaces',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated support',
        'SSO authentication'
      ],
      buttonText: 'Contact Sales',
      popular: false,
      color: 'purple'
    }
  ];

  faqs = [
    {
      question: 'Can I change my plan anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.'
    },
    {
      question: 'Is there a free trial available?',
      answer: 'Yes, we offer a 14-day free trial for our Pro plan. No credit card required to start.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans.'
    },
    {
      question: 'Can I use the generated code commercially?',
      answer: 'Yes, with Pro and Team plans, you have full commercial rights to the generated code.'
    }
  ];

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  selectPlan(plan: any) {
    if (plan.name === 'Free') {
      this.navigateToLogin();
    } else {
      // Handle paid plan selection
      console.log('Selected plan:', plan.name);
      this.navigateToLogin();
    }
  }
}