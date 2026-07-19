import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as itineraryService from './itinerary.service';
import { itineraryQuerySchema } from './itinerary.validation';

export const createItinerary = async (req: Request, res: Response) => {
  const itinerary = await itineraryService.createItinerary(req.body, req.user!.userId);
  ApiResponse.success(res, 'Itinerary created successfully', itinerary, 201);
};

export const getMyItineraries = async (req: Request, res: Response) => {
  const query = itineraryQuerySchema.parse(req.query);
  const result = await itineraryService.getMyItineraries(req.user!.userId, query);
  ApiResponse.paginated(
    res,
    'Itineraries fetched successfully',
    result.itineraries,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getItineraryById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const itinerary = await itineraryService.getItineraryById(id, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Itinerary fetched successfully', itinerary);
};

export const updateItinerary = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const itinerary = await itineraryService.updateItinerary(id, req.body, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Itinerary updated successfully', itinerary);
};

export const deleteItinerary = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await itineraryService.deleteItinerary(id, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Itinerary deleted successfully');
};

export const finalizeItinerary = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const itinerary = await itineraryService.finalizeItinerary(id, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Itinerary finalized successfully', itinerary);
};

export const archiveItinerary = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const itinerary = await itineraryService.archiveItinerary(id, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Itinerary archived successfully', itinerary);
};
