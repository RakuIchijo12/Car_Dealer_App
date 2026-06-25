import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { User } from '../../interface/user';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [NgFor],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  users: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadAllUsers();
  }

  loadAllUsers() {
    this.userService.loadUsers().subscribe(users => {
      this.users = users;
    });
  }
}
