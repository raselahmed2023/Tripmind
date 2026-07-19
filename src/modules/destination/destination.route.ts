import { Router } from 'express';
import {
  createDestination,
  getAllDestinations,
  getDestinationBySlug,
  updateDestination,
  deleteDestination,
} from './destination.controller';
import { validateCreateDestination, validateUpdateDestination } from './destination.validation';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getAllDestinations));
router.get('/:slug', asyncHandler(getDestinationBySlug));

router.post('/', verifyToken, verifyAdmin, validateCreateDestination, asyncHandler(createDestination));
router.patch('/:id', verifyToken, verifyAdmin, validateUpdateDestination, asyncHandler(updateDestination));
router.delete('/:id', verifyToken, verifyAdmin, asyncHandler(deleteDestination));

export default router;
