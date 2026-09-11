const { pool } = require('../config/db');

// @desc    Lấy đánh giá của một sản phẩm
// @route   GET /api/reviews/product/:productId
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const [rows] = await pool.query(
      `SELECT r.id, r.so_sao, r.noi_dung, r.phan_hoi_admin, r.ngay_tao,
              kh.ho_ten AS ten_khach_hang, kh.hang_thanh_vien
       FROM REVIEWS r
       JOIN KHACH_HANG kh ON r.khach_hang_id = kh.id
       JOIN SAN_PHAM sp ON r.san_pham_id = sp.id
       WHERE (sp.ma_sku = ? OR sp.id = ?) AND r.trang_thai_hien_thi = TRUE
       ORDER BY r.ngay_tao DESC`,
      [productId, productId]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy đánh giá sản phẩm' });
  }
};

// @desc    Gửi đánh giá mới cho sản phẩm (Khách hàng)
// @route   POST /api/reviews
exports.createReview = async (req, res) => {
  try {
    const { khach_hang_id, san_pham_id, don_hang_id, so_sao, noi_dung } = req.body;

    if (!khach_hang_id || !san_pham_id || !so_sao) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số sao đánh giá và sản phẩm!' });
    }

    const [result] = await pool.query(
      `INSERT INTO REVIEWS (khach_hang_id, san_pham_id, don_hang_id, so_sao, noi_dung)
       VALUES (?, ?, ?, ?, ?)`,
      [khach_hang_id, san_pham_id, don_hang_id || null, so_sao, noi_dung || '']
    );

    // Cập nhật lại số sao trung bình của sản phẩm
    const [avgRows] = await pool.query(
      `SELECT AVG(so_sao) as avgRating FROM REVIEWS WHERE san_pham_id = ? AND trang_thai_hien_thi = TRUE`,
      [san_pham_id]
    );
    const newAvg = avgRows[0].avgRating ? parseFloat(avgRows[0].avgRating).toFixed(1) : 5.0;

    await pool.query(
      `UPDATE SAN_PHAM SET danh_gia_tb = ? WHERE id = ?`,
      [newAvg, san_pham_id]
    );

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá sản phẩm!',
      reviewId: result.insertId,
      newRating: newAvg
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi đánh giá' });
  }
};
