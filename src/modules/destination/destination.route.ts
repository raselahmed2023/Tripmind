import { Router } from 'express';
import {
  createDestination,
  getAllDestinations,
  getAllDestinationsAdmin,
  getDestinationById,
  getDestinationBySlug,
  updateDestination,
  deleteDestination,
} from './destination.controller';
import { validateCreateDestination, validateUpdateDestination, validateObjectId } from './destination.validation';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Public routes
router.get('/', asyncHandler(getAllDestinations));

// Admin routes (must come before /:slug and /:id)
router.get('/admin/all', verifyToken, verifyAdmin, asyncHandler(getAllDestinationsAdmin));
router.get('/admin/:id', verifyToken, verifyAdmin, validateObjectId('id'), asyncHandler(getDestinationById));

// Public by slug
router.get('/:slug', asyncHandler(getDestinationBySlug));

// Admin mutation routes
router.post('/', verifyToken, verifyAdmin, validateCreateDestination, asyncHandler(createDestination));
router.patch('/:id', verifyToken, verifyAdmin, validateObjectId('id'), validateUpdateDestination, asyncHandler(updateDestination));
router.delete('/:id', verifyToken, verifyAdmin, validateObjectId('id'), asyncHandler(deleteDestination));

export default router;
