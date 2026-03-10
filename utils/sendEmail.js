const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Check if email configuration is set
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com' ||
    !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your_app_password') {
    console.log('Email configuration not set. Skipping email send.');
    console.log('To enable email, configure EMAIL_USER and EMAIL_PASS in .env');
    // In development, just log and return success
    return { success: true, message: 'Email simulated (not configured)' };
  }

  try {
    // Use Gmail service with SSL (port 465)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Create text version from HTML for better deliverability/spam score
    const textVersion = options.text || options.html.replace(/<[^>]*>?/gm, '');

    const message = {
      from: `Barath Men's Wear <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: textVersion, // Add plain text version
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      }
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments;
    }

    const info = await transporter.sendMail(message);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
