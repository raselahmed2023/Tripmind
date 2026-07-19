import { Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: 'user' | 'admin';
  authProvider: 'local' | 'google';
  googleSubjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IRegisterInput {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}
