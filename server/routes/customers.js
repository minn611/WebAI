const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAllCustomers);
router.post('/', customerController.createCustomer);
router.get('/profile/:accountId', customerController.getCustomerProfile);
router.put('/:id/points', customerController.updateCustomerPoints);
router.put('/:id/toggle-lock', customerController.toggleLock);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
