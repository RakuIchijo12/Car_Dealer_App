import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  form: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitted: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router,
  ) {
    this.form = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      isActive: [1, Validators.required]
    });
  }

  submitCredentials() {
    this.isSubmitted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    } else {
      this.registerUser();
    }
  }

  registerUser() {
    this.userService.registerUser(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.successMessage = 'You have successfully registered!';
        this.errorMessage = null;
      },
      error: (error) => {
        this.errorMessage = 'This user is already registered';
        this.successMessage = null;
      }
    });
  }

  navigateLogin() {
    this.router.navigateByUrl('/login');
  }
}
