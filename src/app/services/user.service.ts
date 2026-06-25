import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../interface/user';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/user';

  constructor(private http: HttpClient) {}

  getUser(): Observable<User[]> {
    const getUrl = `${this.apiUrl}/current-user`;
    return this.http.get<User[]>(getUrl);
  }

  loginUser(user: User): Observable<any> {
    const loginUrl = `${this.apiUrl}/login`;
    return this.http.post<any>(loginUrl, user);
  }

  registerUser(user: User): Observable<User> {
    const registerUrl = `${this.apiUrl}/register`;
    return this.http.post<User>(registerUrl, user).pipe(
      catchError((error) => {
        console.error('Registration error:', error);
        return throwError(() => new Error('Registration failed. Please try again.'));
      })
    );
  }

  loadUsers(): Observable<User[]> {
    const loadUrl = `${this.apiUrl}`;
    return this.http.get<User[]>(loadUrl);
  }
}
