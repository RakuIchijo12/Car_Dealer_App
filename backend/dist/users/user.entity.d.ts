export declare enum UserRole {
    ADMIN = "admin",
    STAFF = "staff"
}
export declare class User {
    id: number;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    createdAt: Date;
}
