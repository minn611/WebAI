const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

router.get('/', voucherController.getAllVouchers);
router.post('/apply', voucherController.applyVoucher);
router.post('/', voucherController.createVoucher);

module.exports = router;
