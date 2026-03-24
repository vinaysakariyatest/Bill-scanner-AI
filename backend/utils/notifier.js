const axios = require('axios');

const sendNewCustomerAlert = async (customerName) => {
  try {
    const payload = {
        sendto: "919904362053", // Authorized receiving number
        authToken: "U2FsdGVkX19as8Viy5vXkdbUVwfVQxfyrrbl/i2EfkU41/YpiUyF9faNxbf/x4Pj83bs36Pz6E1/gQxsx5hBm9c5u7nmC+kVj2fBLmGlOxSh5D11K0DfZeye5hr2JV1bwJje+dmnmTF+M8XjywXrU4Ax33ptsNjC6buha3pTvudK6VA8BH1OI4RqPXeejaUp",
        originWebsite: "https://11za.com/",
        contentType: "text",
        text: `🔔 *New Pending Customer Alert!*\n\nA new customer *${customerName}* has just been registered in the system.\n\nPlease log in to the admin dashboard to review and confirm this customer.`
    };

    const response = await axios.post('https://api.11za.in/apis/sendMessage/sendMessages', payload);
    console.log(`WhatsApp Alert sent for customer ${customerName}`, response.data);
  } catch (error) {
    console.error(`Failed to send WhatsApp alert for customer ${customerName}:`, error.message);
  }
};

module.exports = {
  sendNewCustomerAlert
};
