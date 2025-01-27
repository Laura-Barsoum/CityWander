// routes/index.js
import express from 'express';
import authRoutes from './authRoutes.js';
import bookingRoutes from './bookingRoutes.js';

const router = express.Router();

// Use routes
router.use('/api/auth', authRoutes);
router.use('/api', bookingRoutes);

export default router;