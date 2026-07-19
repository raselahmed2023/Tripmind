import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { Trip } from '../trip/trip.model';
import { Destination } from '../destination/destination.model';
import { Itinerary } from '../itinerary/itinerary.model';
import { IUser } from '../auth/auth.interface';
import { ITrip } from '../trip/trip.interface';
import { IDestination } from '../destination/destination.interface';
import { ApiError } from '../../utils/ApiError';

export const getUser = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const getTrip = async (tripId: string): Promise<ITrip> => {
  if (!Types.ObjectId.isValid(tripId)) {
    throw ApiError.badRequest('Invalid trip ID');
  }
  const trip = await Trip.findById(tripId).populate('destinationId');
  if (!trip) throw ApiError.notFound('Trip not found');
  return trip;
};

export const getDestination = async (destinationId: string): Promise<IDestination> => {
  if (!Types.ObjectId.isValid(destinationId)) {
    throw ApiError.badRequest('Invalid destination ID');
  }
  const dest = await Destination.findById(destinationId);
  if (!dest) throw ApiError.notFound('Destination not found');
  return dest;
};

export const calculateTripDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const calculateBudget = (budget: number, days: number, travelers: number): number => {
  return Math.round((budget / days / travelers) * 100) / 100;
};

export const validateBudget = (costBreakdown: Record<string, number>, totalBudget: number): boolean => {
  const total = Object.values(costBreakdown).reduce((sum, val) => sum + val, 0);
  return total <= totalBudget * 1.15;
};

export const saveItinerary = async (data: Record<string, unknown>) => {
  return Itinerary.create(data);
};

export const updateTripItinerary = async (tripId: string, data: Record<string, unknown>) => {
  return Trip.findByIdAndUpdate(tripId, data, { new: true });
};
