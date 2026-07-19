import { User } from './user.model';
import { IUser, IRegisterInput } from '../auth/auth.interface';
import { ApiError } from '../../utils/ApiError';
import { getOrCreateFreeSubscription } from '../subscription/subscription.service';

export const findByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).select('+password');
};

export const createUser = async (data: IRegisterInput): Promise<IUser> => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }
  const user = await User.create(data);
  await getOrCreateFreeSubscription(user._id.toString());
  return user;
};

export const getUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id);
};

export const updateUser = async (id: string, data: Record<string, unknown>): Promise<IUser | null> => {
  const allowedFields = ['name', 'avatar'];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in data) {
      updateData[key] = data[key];
    }
  }
  return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};
