const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAllCustomers);
router.get('/profile/:accountId', customerController.getCustomerProfile);
router.put('/:id/points', customerController.updateCustomerPoints);

module.exports = router;
