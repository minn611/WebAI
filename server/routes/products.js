const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products
router.get('/', productController.getAll);

// GET /api/products/:id
router.get('/:id', productController.getById);

// POST /api/products
router.post('/', productController.create);

// PUT /api/products/:id
router.put('/:id', productController.update);

// DELETE /api/products/:id
router.delete('/:id', productController.delete);

module.exports = router;
