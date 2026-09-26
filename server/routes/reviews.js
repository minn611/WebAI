const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// Quản lý đánh giá (Admin)
router.get('/', reviewController.getAllReviews);
router.put('/:id/reply', reviewController.replyReview);
router.put('/:id/toggle-visibility', reviewController.toggleReviewVisibility);
router.delete('/:id', reviewController.deleteReview);

// Đánh giá sản phẩm (Client)
router.get('/product/:productId', reviewController.getProductReviews);
router.post('/', reviewController.createReview);
router.put('/:id', reviewController.updateReview);

module.exports = router;
