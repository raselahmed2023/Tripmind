import { Router } from 'express';
import {
  createItinerary,
  getMyItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary,
  finalizeItinerary,
  archiveItinerary,
} from './itinerary.controller';
import { validateCreateItinerary, validateUpdateItinerary } from './itinerary.validation';
import { validateObjectId } from '../trip/trip.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', verifyToken, asyncHandler(getMyItineraries));
router.get('/:id', verifyToken, validateObjectId('id'), asyncHandler(getItineraryById));
router.post('/', verifyToken, validateCreateItinerary, asyncHandler(createItinerary));
router.patch('/:id', verifyToken, validateObjectId('id'), validateUpdateItinerary, asyncHandler(updateItinerary));
router.delete('/:id', verifyToken, validateObjectId('id'), asyncHandler(deleteItinerary));
router.patch('/:id/finalize', verifyToken, validateObjectId('id'), asyncHandler(finalizeItinerary));
router.patch('/:id/archive', verifyToken, validateObjectId('id'), asyncHandler(archiveItinerary));

export default router;
