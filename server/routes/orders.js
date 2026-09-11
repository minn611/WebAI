const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// GET /api/orders
router.get('/', orderController.getAll);

// GET /api/orders/customer/:phone - Lấy toàn bộ đơn hàng theo SĐT
router.get('/customer/:phone', orderController.getByPhone);

// GET /api/orders/:id -> Tra cứu 1 đơn hàng theo mã đơn hoặc SĐT
router.get('/:id', orderController.getById);

// POST /api/orders
router.post('/', orderController.create);

// PUT /api/orders/:id/status
router.put('/:id/status', orderController.updateStatus);

// DELETE /api/orders/:id
router.delete('/:id', orderController.delete);

module.exports = router;
