export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  language: string;
  role: UserRole;
  googleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends Omit<User, 'googleId'> {
  reviewCount: number;
  photoCount: number;
}

export interface RegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  name?: string;
  language?: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
