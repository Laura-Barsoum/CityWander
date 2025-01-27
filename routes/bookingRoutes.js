// routes/bookingRoutes.js
import express from 'express';
import { db } from '../server.js';
import sendConfirmationEmail from '../services/bookingConfirmation.js';

const router = express.Router();

// Middleware to verify token
export const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Get user's bookings
router.get('/bookings', verifyToken, async (req, res) => {
    try {
        await db.read();
        const userBookings = db.data.bookings.filter(booking => booking.email === req.user.email);
        res.json(userBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Submit booking route
router.post('/submit-booking', async (req, res) => {
    console.log('Received booking request:', req.body);
    
    try {
        const { name, email, phone, date, numPeople, message, serviceName } = req.body;
        
        // Validation
        const errors = [];
        if (!name) errors.push('Name is required');
        if (!email) errors.push('Email is required');
        if (!phone) errors.push('Phone number is required');
        if (!date) errors.push('Date is required');
        if (!numPeople) errors.push('Number of people is required');
        
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors
            });
        }

        await db.read();

        // Create booking
        const bookingData = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            date,
            numPeople: parseInt(numPeople),
            message: message || '',
            serviceName: serviceName || 'Standard Tour',
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        // Save booking
        if (!db.data.bookings) {
            db.data.bookings = [];
        }
        db.data.bookings.push(bookingData);
        await db.write();

        // Send confirmation email
        try {
            await sendConfirmationEmail(bookingData);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue with booking process even if email fails
        }

        res.status(201).json({
            message: 'Booking confirmed successfully!',
            booking: bookingData
        });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({
            message: 'Error processing booking',
            error: error.message
        });
    }
});

export default router;