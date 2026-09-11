const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getRevenueChart,
  getTopProducts,
  getCategorySales
} = require('../controllers/reportController');

router.get('/summary', getDashboardSummary);
router.get('/revenue', getRevenueChart);
router.get('/top-products', getTopProducts);
router.get('/categories', getCategorySales);

module.exports = router;
