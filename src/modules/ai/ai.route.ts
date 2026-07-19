import { Router } from 'express';
import { tripPlanner } from './ai.controller';
import { verifyToken } from '../../middleware/auth';
import { validateObjectId } from '../trip/trip.validation';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post('/:tripId/generate', verifyToken, validateObjectId('tripId'), asyncHandler(tripPlanner));

export default router;
