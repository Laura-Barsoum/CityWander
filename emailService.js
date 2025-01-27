import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'citywandercairo@gmail.com',  // Gmail address
        pass: 'cbsq urrp gsnc uuuk'         // app password
    }
});

const sendConfirmationEmail = async (bookingData) => {
    try {
        // Verify transporter configuration
        await transporter.verify();
        
        const mailOptions = {
            from: '"CityWander Cairo" <citywandercairo@gmail.com>',
            to: bookingData.email,
            subject: 'Booking Confirmation - CityWander',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2c3e50;">Thank you for booking with CityWander!</h1>
                    <p>Dear ${bookingData.name},</p>
                    <p>Your booking has been confirmed. Here are your details:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin: 10px 0;">📅 <strong>Date:</strong> ${new Date(bookingData.date).toLocaleDateString()}</li>
                            <li style="margin: 10px 0;">👥 <strong>Number of People:</strong> ${bookingData.numPeople}</li>
                            <li style="margin: 10px 0;">🎯 <strong>Service:</strong> ${bookingData.serviceName || 'Standard Tour'}</li>
                            <li style="margin: 10px 0;">📞 <strong>Phone:</strong> ${bookingData.phone}</li>
                            ${bookingData.message ? `<li style="margin: 10px 0;">📝 <strong>Additional Notes:</strong> ${bookingData.message}</li>` : ''}
                        </ul>
                    </div>
                    <p>We look forward to showing you the best of Cairo!</p>
                    <p style="color: #666;">If you need to make any changes to your booking, please contact us at citywandercairo@gmail.com</p>
                    <p>Best regards,<br>The CityWander Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export default sendConfirmationEmail;