import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  userInfo: any = null;
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserInfo();
  }

  loadUserInfo() {
    this.userInfo = this.authService.getUserInfo();
    if (!this.userInfo) {
      // Subscribe to auth state changes if user info not in localStorage
      this.authService.user$.subscribe(user => {
        if (user) {
          this.userInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
        }
      });
    }
  }

  async logout() {
    this.isLoading = true;
    try {
      await this.authService.signOutUser();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback logout
      localStorage.setItem('isAuthenticated', 'false');
      localStorage.removeItem('userInfo');
      this.router.navigate(['/login']);
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  clearData() {
    if (confirm('Are you sure you want to clear all app data? This will remove chat history, API keys, and other settings.')) {
      localStorage.clear();
      alert('All data cleared successfully!');
      this.router.navigate(['/dashboard']);
    }
  }
}
