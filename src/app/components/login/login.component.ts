import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  isLoading = false;
  error = '';
  isSignUp = false;
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const result = await this.authService.signInWithEmail(email, password);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error = result.error;
      }
    } catch (error) {
      this.error = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  async signUp(email: string, password: string) {
    if (!email || !password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const result = await this.authService.signUpWithEmail(email, password);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error = result.error;
      }
    } catch (error) {
      this.error = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  async signInWithGoogle() {
    this.isLoading = true;
    this.error = '';

    try {
      const result = await this.authService.signInWithGoogle();
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error = result.error;
      }
    } catch (error) {
      this.error = 'Google sign-in failed';
    } finally {
      this.isLoading = false;
    }
  }

  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.error = '';
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}