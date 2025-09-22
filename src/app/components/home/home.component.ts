import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  
  constructor(private router: Router) {}

  ngOnInit() {
    // Initialize animations after view loads
    setTimeout(() => {
      this.initCountUpAnimations();
    }, 500);
  }

  initCountUpAnimations() {
    const countUpElements = document.querySelectorAll('.animate-count-up');
    countUpElements.forEach(element => {
      const target = parseInt(element.getAttribute('data-target') || '0');
      this.animateCountUp(element, target);
    });
  }

  animateCountUp(element: Element, target: number) {
    let count = 0;
    const duration = 2000; // ms
    const increment = target / (duration / 16); // 16ms per frame (~60fps)
    
    const updateCount = () => {
      count += increment;
      if (count < target) {
        element.textContent = Math.ceil(count).toString();
        requestAnimationFrame(updateCount);
      } else {
        element.textContent = target.toString();
        // Add + for percentage metrics
        if (target === 99) {
          element.textContent += '+';
        }
      }
    };
    
    updateCount();
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToFeatures() {
    this.router.navigate(['/features']);
  }

  navigateToPricing() {
    this.router.navigate(['/pricing']);
  }
}