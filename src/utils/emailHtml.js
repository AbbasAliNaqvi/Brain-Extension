const axios = require('axios');

module.exports = async function sendHtmlEmail(to, subject, htmlContent) {
  try {
    const data = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        'to_email': to,
        'subject': subject, 
        'message': htmlContent
    }
  };

  const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data,)

  console.log("Email sent Successfully");
  return response.data;
  } catch (error) {
    console.error("FATAL EMAIL ERROR:", error.response ? error.response.data : error.message);
    throw error;
  }
};