import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../models/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, from, map, switchMap, of, catchError, throwError, tap, throwIfEmpty } from 'rxjs';
import { User } from '../models/user.interface';
import * as bcrypt from 'bcrypt';
import { error } from 'console';
import { AuthService } from 'src/auth/services/auth.service';

@Injectable()
export class UserService {

    constructor( 
        @InjectRepository(UserEntity)
        private readonly  userRepository: Repository<UserEntity>,
        private authService: AuthService
    ){}


    create(user:User): Observable<User>{
        if( !user.password || !user.email || !user.firstname || !user.lastname){
            return throwError(() => new BadRequestException('Email and Password must not be null'));
        }
        return this.authService.hashPassword(user.password).pipe( //returns an Observable that emits the hashed password.
            switchMap((passwordHash: string) => { //The passwordHash is used to capture the result of the hasing process.
                const newUser = new UserEntity();
                newUser.password = passwordHash;
                newUser.firstname = user.firstname;
                newUser.lastname = user.lastname;
                newUser.email = user.email;
                newUser.isActive = user.isActive ?? 1;

                return from(this.userRepository.save(newUser)).pipe( //Save the new user entity to the repository and return a new observable
                    map((savedUser:User) =>{
                        const {password, ...result} = savedUser; //Exclude the password from the response
                        return result;
                    }),
                )
            }),
            catchError(() => {
                return throwError(() => new InternalServerErrorException('Error creating user'));
            })
        )
    }

    findAll(): Observable<User[]>{
        return from(this.userRepository.find()).pipe(
            catchError(error => {
                return throwError(() => new InternalServerErrorException('Error retrieving Users'));
            })
        );
    }

    findOne(id: number): Observable<User>{
        return from(this.userRepository.findOne({ where: {id} })).pipe(
            map((user: User) =>{
                if(!user){
                    throw new NotFoundException('Id not found');
                }
                const{password, ...result} = user; //Object Destructuring
                return result;
            })
        )
    }

    deleteOne(id: number): Observable<any>{
        return from(this.userRepository.delete(id)).pipe(
            map(result => {
                if(result.affected === 0 ){
                    throw new NotFoundException('Id not found');
                }
                return { message: 'User deleted successfully' };
            }),
            catchError(error => {
                if(error instanceof NotFoundException){
                    return throwError(() => error);
                }
                return throwError(() => new InternalServerErrorException('Error deleting user'));
            })
        );
    }

    updateOne(id: number, user: User): Observable<any>{
        return from(this.userRepository.update(id, user)).pipe(
            map(result => {
                if(result.affected === 0){
                    throw new NotFoundException('Id not found');
                }
                return { message: 'User updated successfully' };
            }),
            catchError(error => {
                if(error instanceof NotFoundException){
                    return throwError(() => Error('Not null violation'))
                }
                return throwError(() => new InternalServerErrorException('Error updating user'))
            })
        );
    }

    loginUser(user: User): Observable<string> {
        return this.validateUser(user.email, user.password).pipe(
            switchMap((user: User) => {
                if (user) {
                    return this.authService.generateJWT(user).pipe(
                        map((jwt: string) => jwt)
                    );
                } 
            }),
            catchError(error => {
                return throwError(() => new Error('Wrong Credentials'));
            })
        );
    }

    validateUser(email: string, password: string): Observable<User> {
        return this.findByEmail(email).pipe(
            switchMap((user: User) => {
                return this.authService.comparePassword(password, user.password).pipe(
                    map((match: boolean) => {
                        if (match) {
                            const { password, ...result } = user;
                            return result;
                        } else {
                            throw new Error('Invalid password');
                        }
                    })
                );
            }),
            catchError(error => {
                return throwError(() => new Error('Wrong credentials'));
            })
        );
    }

    findByEmail(email: string): Observable<User> {
        return from(this.userRepository.findOne({ where: { email } }));
    }


    /*validateUser(username: string, pass: string): Observable<User>{
        return this.findOne(username).pipe(
            switchMap(user => {
                if (!user) return of (null);
                return from (bcrypt.compare(pass, user.password)).pipe(
                    map(isMatch => {
                        if (isMatch){
                            const { password, ...result } = user;
                            return result
                        }
                        return null;
                    })
                )
            })
        )
    }

    login(user: User): Observable <{access_token: string}>{
        const payload = { username: user.username, id: user.id, role: user.role.name}
        return of ({
            access_token: this.jwtService.sign(payload)
        })
    }*/
}
