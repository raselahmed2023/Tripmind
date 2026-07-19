import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as tripService from './trip.service';
import { tripQuerySchema } from './trip.validation';

export const createTrip = async (req: Request, res: Response) => {
  const trip = await tripService.createTrip(req.body, req.user!.userId);
  ApiResponse.success(res, 'Trip created successfully', trip, 201);
};

export const getMyTrips = async (req: Request, res: Response) => {
  const query = tripQuerySchema.parse(req.query);
  const result = await tripService.getMyTrips(req.user!.userId, query);

  ApiResponse.paginated(
    res,
    'Trips fetched successfully',
    result.trips,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getAllTrips = async (req: Request, res: Response) => {
  const query = tripQuerySchema.parse(req.query);
  const result = await tripService.getAllTrips(query);

  ApiResponse.paginated(
    res,
    'Trips fetched successfully',
    result.trips,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getTripById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const trip = await tripService.getTripById(id, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Trip fetched successfully', trip);
};

export const updateTrip = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const trip = await tripService.updateTrip(id, req.body, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Trip updated successfully', trip);
};

export const deleteTrip = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await tripService.deleteTrip(id, req.user!.userId, req.user!.role === 'admin');
  ApiResponse.success(res, 'Trip deleted successfully');
};
