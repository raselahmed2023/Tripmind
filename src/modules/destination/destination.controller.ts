import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as destinationService from './destination.service';
import { destinationQuerySchema } from './destination.validation';

export const createDestination = async (req: Request, res: Response) => {
  const destination = await destinationService.createDestination(req.body, req.user!.userId);
  ApiResponse.success(res, 'Destination created successfully', destination, 201);
};

export const getAllDestinations = async (req: Request, res: Response) => {
  const query = destinationQuerySchema.parse(req.query);
  const result = await destinationService.getAllDestinations(query);

  ApiResponse.paginated(
    res,
    'Destinations fetched successfully',
    result.destinations,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getDestinationBySlug = async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const destination = await destinationService.getDestinationBySlug(slug);
  ApiResponse.success(res, 'Destination fetched successfully', destination);
};

export const updateDestination = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const destination = await destinationService.updateDestination(id, req.body);
  ApiResponse.success(res, 'Destination updated successfully', destination);
};

export const deleteDestination = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await destinationService.deleteDestination(id);
  ApiResponse.success(res, 'Destination deleted successfully');
};
