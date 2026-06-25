import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  form: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router,
  ) {
    this.form = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  submitCredentials() {
    if (this.form.invalid) {
      this.errorMessage = 'Both Email and Password are required.';
      return;
    }
    this.userService.loginUser(this.form.getRawValue()).subscribe({
      next: (response: any) => {
        if (response.success) {
          localStorage.setItem('token', response.accessToken);
          this.router.navigateByUrl('/main');
        }
      },
      error: (error) => {
        this.errorMessage = 'Invalid email or password.';
        console.error(error);
      }
    });
  }

  clearError() {
    this.errorMessage = null;
  }

  navigateRegister() {
    this.router.navigateByUrl('/register');
  }
}
