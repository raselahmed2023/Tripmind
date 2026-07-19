import { Types } from 'mongoose';
import { Trip } from './trip.model';
import { Destination } from '../destination/destination.model';
import { ITrip, ITripQuery } from './trip.interface';
import { ApiError } from '../../utils/ApiError';
import { safeNotify } from '../notification/notification.service';

const PROTECTED_UPDATE_FIELDS = ['userId', 'estimatedCost', 'itineraryId', 'createdAt', 'updatedAt'];

const buildSortObject = (sort: string): Record<string, 1 | -1> => {
  switch (sort) {
    case 'oldest': return { createdAt: 1 };
    case 'start_date': return { startDate: 1 };
    case 'newest':
    default: return { createdAt: -1 };
  }
};

export const createTrip = async (data: Record<string, unknown>, userId: string): Promise<ITrip> => {
  if (!Types.ObjectId.isValid(data.destinationId as string)) {
    throw ApiError.badRequest('Invalid destination ID');
  }
  const destination = await Destination.findById(data.destinationId);
  if (!destination) {
    throw ApiError.notFound('Destination not found');
  }
  return Trip.create({ ...data, userId: new Types.ObjectId(userId) });
};

export const getMyTrips = async (userId: string, query: ITripQuery) => {
  const { status, travelStyle, sort = 'newest', page = 1, limit = 10 } = query;
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (status) filter.status = status;
  if (travelStyle) filter.travelStyle = travelStyle;
  const skip = (page - 1) * limit;
  const sortObj = buildSortObject(sort);
  const [trips, total] = await Promise.all([
    Trip.find(filter).sort(sortObj).skip(skip).limit(limit).populate('destinationId', 'title city country slug images'),
    Trip.countDocuments(filter),
  ]);
  return {
    trips,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getAllTrips = async (query: ITripQuery) => {
  const { status, travelStyle, sort = 'newest', page = 1, limit = 10 } = query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (travelStyle) filter.travelStyle = travelStyle;
  const skip = (page - 1) * limit;
  const sortObj = buildSortObject(sort);
  const [trips, total] = await Promise.all([
    Trip.find(filter).sort(sortObj).skip(skip).limit(limit).populate('destinationId', 'title city country slug images').populate('userId', 'name email'),
    Trip.countDocuments(filter),
  ]);
  return {
    trips,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getTripById = async (id: string, userId: string, isAdmin: boolean): Promise<ITrip> => {
  const trip = await Trip.findById(id).populate('destinationId');
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }
  if (!isAdmin && trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only access your own trips');
  }
  return trip;
};

export const updateTrip = async (
  id: string,
  data: Record<string, unknown>,
  userId: string,
  isAdmin: boolean,
): Promise<ITrip> => {
  const trip = await Trip.findById(id);
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }
  if (!isAdmin && trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only update your own trips');
  }

  const bodyKeys = Object.keys(data);
  const blocked = bodyKeys.filter((key) => PROTECTED_UPDATE_FIELDS.includes(key));
  if (blocked.length > 0) {
    throw ApiError.badRequest('Cannot update protected fields: ' + blocked.join(', '));
  }

  if (data.destinationId) {
    if (!Types.ObjectId.isValid(data.destinationId as string)) {
      throw ApiError.badRequest('Invalid destination ID');
    }
    const dest = await Destination.findById(data.destinationId);
    if (!dest) {
      throw ApiError.notFound('Destination not found');
    }
  }

  if (data.startDate || data.endDate) {
    const newStart = data.startDate ? new Date(data.startDate as string) : trip.startDate;
    const newEnd = data.endDate ? new Date(data.endDate as string) : trip.endDate;
    if (newEnd <= newStart) {
      throw ApiError.badRequest('End date must be after start date');
    }
  }

  const updated = await Trip.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!updated) {
    throw ApiError.notFound('Trip not found');
  }
  safeNotify({
    userId: userId,
    type: 'trip_updated',
    title: 'Trip Updated',
    message: 'Your trip ' + updated.title + ' has been updated',
    relatedEntityType: 'trip',
    relatedEntityId: id,
    metadata: {},
  });
  return updated;
};

export const deleteTrip = async (id: string, userId: string, isAdmin: boolean): Promise<void> => {
  const trip = await Trip.findById(id);
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }
  if (!isAdmin && trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only delete your own trips');
  }
  await Trip.findByIdAndDelete(id);
};