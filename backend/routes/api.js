const express = require('express');
const router = express.Router();
const multer = require('multer');

const billController = require('../controllers/billController');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');
const whatsappController = require('../controllers/whatsappController');

// Set up multer for file uploads
const upload = multer({ dest: '/tmp/' });

// API Routes
router.post('/upload', upload.single('invoice'), billController.uploadInvoice);
router.post('/bills', billController.saveBill);
router.delete('/bills/:id', billController.deleteBill);
router.get('/dashboard', dashboardController.getDashboardData);
router.get('/customers/:id/bills', dashboardController.getCustomerBills);
router.put('/customers/:id/confirm', dashboardController.confirmCustomer);
router.post('/login', authController.login);
router.post('/whatsapp-webhook', whatsappController.handleWebhook);

module.exports = router;
