import { User } from './user.model';
import { IUser, IRegisterInput } from '../auth/auth.interface';
import { ApiError } from '../../utils/ApiError';

export const findByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).select('+password');
};

export const createUser = async (data: IRegisterInput): Promise<IUser> => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }
  return User.create(data);
};

export const getUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id);
};
