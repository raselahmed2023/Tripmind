import { Types } from 'mongoose';
import { Itinerary } from './itinerary.model';
import { Trip } from '../trip/trip.model';
import { IItinerary, IItineraryQuery } from './itinerary.interface';
import { ApiError } from '../../utils/ApiError';
import { safeNotify } from '../notification/notification.service';

const buildSortObject = (sort: string): Record<string, 1 | -1> => {
  switch (sort) {
    case 'oldest': return { createdAt: 1 };
    case 'newest':
    default: return { createdAt: -1 };
  }
};

export const createItinerary = async (data: Record<string, unknown>, userId: string): Promise<IItinerary> => {
  if (!Types.ObjectId.isValid(data.tripId as string)) {
    throw ApiError.badRequest('Invalid trip ID');
  }
  if (!Types.ObjectId.isValid(data.destinationId as string)) {
    throw ApiError.badRequest('Invalid destination ID');
  }
  const trip = await Trip.findById(data.tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only create itineraries for your own trips');
  }
  return Itinerary.create({ ...data, userId: new Types.ObjectId(userId) });
};

export const getMyItineraries = async (userId: string, query: IItineraryQuery) => {
  const { status, sort = 'newest', page = 1, limit = 10 } = query;
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const sortObj = buildSortObject(sort);
  const [itineraries, total] = await Promise.all([
    Itinerary.find(filter).sort(sortObj).skip(skip).limit(limit).populate('tripId', 'title startDate endDate').populate('destinationId', 'title city country'),
    Itinerary.countDocuments(filter),
  ]);
  return { itineraries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getItineraryById = async (id: string, userId: string, isAdmin: boolean): Promise<IItinerary> => {
  const itinerary = await Itinerary.findById(id).populate('tripId').populate('destinationId');
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  if (!isAdmin && itinerary.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only access your own itineraries');
  }
  return itinerary;
};

export const updateItinerary = async (id: string, data: Record<string, unknown>, userId: string, isAdmin: boolean): Promise<IItinerary> => {
  const itinerary = await Itinerary.findById(id);
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  if (!isAdmin && itinerary.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only update your own itineraries');
  }
  if (itinerary.status === 'archived') {
    throw ApiError.badRequest('Cannot update an archived itinerary');
  }
  const updated = await Itinerary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!updated) throw ApiError.notFound('Itinerary not found');
  return updated;
};

export const deleteItinerary = async (id: string, userId: string, isAdmin: boolean): Promise<void> => {
  const itinerary = await Itinerary.findById(id);
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  if (!isAdmin && itinerary.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only delete your own itineraries');
  }
  await Itinerary.findByIdAndDelete(id);
};

export const finalizeItinerary = async (id: string, userId: string, isAdmin: boolean): Promise<IItinerary> => {
  const itinerary = await Itinerary.findById(id);
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  if (!isAdmin && itinerary.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only finalize your own itineraries');
  }
  if (itinerary.status === 'archived') {
    throw ApiError.badRequest('Cannot finalize an archived itinerary');
  }
  itinerary.status = 'finalized';
  await itinerary.save();
  safeNotify({
    userId: userId,
    type: 'itinerary_finalized',
    title: 'Itinerary Finalized',
    message: 'Your itinerary has been finalized and is ready for your trip',
    relatedEntityType: 'itinerary',
    relatedEntityId: id,
    metadata: {},
  });
  return itinerary;
};

export const archiveItinerary = async (id: string, userId: string, isAdmin: boolean): Promise<IItinerary> => {
  const itinerary = await Itinerary.findById(id);
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  if (!isAdmin && itinerary.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only archive your own itineraries');
  }
  if (itinerary.status !== 'finalized') {
    throw ApiError.badRequest('Only finalized itineraries can be archived');
  }
  itinerary.status = 'archived';
  await itinerary.save();
  return itinerary;
};
