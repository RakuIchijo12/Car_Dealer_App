import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/interface/user';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = []

  constructor(private userService: UserService){}

  ngOnInit(): void {
    this.loadAllUsers();
  }

  loadAllUsers(){
    this.userService.loadUsers().subscribe(users => {
      this.users = users;
    })
  }
}
