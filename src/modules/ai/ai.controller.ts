import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as aiService from './ai.service';

export const tripPlanner = async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const result = await aiService.generateTripPlan(req.body, req.user!.userId, tripId);

  ApiResponse.success(res, 'Trip plan generated successfully', {
    itinerary: result.itinerary,
    generationTimeMs: result.generationTime,
  }, 201);
};
