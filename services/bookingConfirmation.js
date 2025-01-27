// services/bookingConfirmation.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendConfirmationEmail = async (bookingData) => {
    const { name, email, date, numPeople, serviceName, message } = bookingData;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Booking Confirmation - CityWander Adventure',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Booking Confirmation</h2>
                <p>Dear ${name},</p>
                <p>Thank you for booking with CityWander! We're excited to have you join us for your upcoming adventure.</p>
                
                <h3>Booking Details:</h3>
                <ul>
                    <li>Service: ${serviceName}</li>
                    <li>Date: ${new Date(date).toLocaleDateString()}</li>
                    <li>Number of People: ${numPeople}</li>
                    ${message ? `<li>Additional Requests: ${message}</li>` : ''}
                </ul>
                
                <p>We look forward to showing you the best of Cairo!</p>
                <p>If you have any questions or need to make changes, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>The CityWander Team</p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

export default sendConfirmationEmail;