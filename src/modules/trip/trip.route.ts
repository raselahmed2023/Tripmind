import { Router } from 'express';
import {
  createTrip,
  getMyTrips,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
} from './trip.controller';
import { validateCreateTrip, validateUpdateTrip, validateObjectId } from './trip.validation';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', verifyToken, asyncHandler(getMyTrips));
router.get('/admin/all', verifyToken, verifyAdmin, asyncHandler(getAllTrips));
router.get('/:id', verifyToken, validateObjectId('id'), asyncHandler(getTripById));
router.post('/', verifyToken, validateCreateTrip, asyncHandler(createTrip));
router.patch('/:id', verifyToken, validateObjectId('id'), validateUpdateTrip, asyncHandler(updateTrip));
router.delete('/:id', verifyToken, validateObjectId('id'), asyncHandler(deleteTrip));

export default router;
