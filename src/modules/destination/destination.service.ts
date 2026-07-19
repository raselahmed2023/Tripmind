import { Types, FilterQuery } from 'mongoose';
import slugify from 'slugify';
import { Destination } from './destination.model';
import { IDestination, IDestinationQuery } from './destination.interface';
import { ApiError } from '../../utils/ApiError';

const buildSortObject = (sort: string): Record<string, 1 | -1> => {
  switch (sort) {
    case 'highest_rating': return { rating: -1 };
    case 'lowest_cost': return { averageDailyCost: 1 };
    case 'highest_cost': return { averageDailyCost: -1 };
    case 'newest':
    default: return { createdAt: -1 };
  }
};

export const createDestination = async (
  data: Omit<IDestination, 'slug' | 'createdAt' | 'updatedAt'>,
  userId: string,
): Promise<IDestination> => {
  let slug = slugify(data.title, { lower: true, strict: true });
  const existingSlug = await Destination.findOne({ slug });
  if (existingSlug) {
    slug = slug + '-' + Date.now();
  }
  return Destination.create({ ...data, slug, createdBy: new Types.ObjectId(userId) });
};

export const getAllDestinations = async (query: IDestinationQuery) => {
  const { search, category, country, bestSeason, minCost, maxCost, minRating, sort = 'newest', page = 1, limit = 10 } = query;
  const filter: FilterQuery<IDestination> = { status: 'published' };
  if (search) {
    filter[''] = { '': search };
  }
  if (category) filter.category = category;
  if (country) filter.country = country;
  if (bestSeason) filter.bestSeason = bestSeason;
  if (minCost !== undefined || maxCost !== undefined) {
    filter.averageDailyCost = {};
    if (minCost !== undefined) filter.averageDailyCost[''] = minCost;
    if (maxCost !== undefined) filter.averageDailyCost[''] = maxCost;
  }
  if (minRating !== undefined) {
    filter.rating = { '': minRating };
  }
  const skip = (page - 1) * limit;
  const sortObj = buildSortObject(sort);
  const [destinations, total] = await Promise.all([
    Destination.find(filter).sort(sortObj).skip(skip).limit(limit),
    Destination.countDocuments(filter),
  ]);
  return {
    destinations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getDestinationBySlug = async (slug: string): Promise<IDestination> => {
  const destination = await Destination.findOne({ slug, status: 'published' });
  if (!destination) {
    throw ApiError.notFound('Destination not found');
  }
  return destination;
};

export const getDestinationById = async (id: string): Promise<IDestination> => {
  const destination = await Destination.findById(id);
  if (!destination) {
    throw ApiError.notFound('Destination not found');
  }
  return destination;
};

export const updateDestination = async (id: string, data: Partial<IDestination>): Promise<IDestination> => {
  const destination = await Destination.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!destination) {
    throw ApiError.notFound('Destination not found');
  }
  return destination;
};

export const deleteDestination = async (id: string): Promise<void> => {
  const destination = await Destination.findByIdAndDelete(id);
  if (!destination) {
    throw ApiError.notFound('Destination not found');
  }
};
