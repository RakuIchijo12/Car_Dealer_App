import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from '../services/user.service';
import { User } from '../interface/user';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NavbarComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent implements OnInit {

  private user: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loadUser();
  }

  loadUser() {
    this.userService.getUser().subscribe((response: any) => {
      this.user = response.data;
    });
  }
}
