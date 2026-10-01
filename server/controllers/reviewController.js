const { pool } = require('../config/db');

// @desc    Lấy toàn bộ danh sách đánh giá cho Admin
// @route   GET /api/reviews
exports.getAllReviews = async (req, res) => {
  try {
    const { status, rating, search } = req.query;
    let query = `
      SELECT r.id, r.khach_hang_id, r.san_pham_id, r.hoa_don_id, r.hoa_don_id AS don_hang_id, r.so_sao, r.noi_dung,
             r.phan_hoi_admin, r.trang_thai_hien_thi, r.ngay_tao,
             kh.ho_ten AS ten_khach_hang, kh.hang_thanh_vien, tk.so_dien_thoai,
             sp.ten_san_pham, sp.ma_sku, sp.hinh_anh_url,
             hd.ma_hoa_don, hd.ma_don_hang
      FROM REVIEWS r
      JOIN KHACH_HANG kh ON r.khach_hang_id = kh.id
      JOIN TAI_KHOAN tk ON kh.tai_khoan_id = tk.id
      JOIN SAN_PHAM sp ON r.san_pham_id = sp.id
      LEFT JOIN HOA_DON hd ON r.hoa_don_id = hd.id
      WHERE 1=1
    `;
    const params = [];

    if (status === 'pending') {
      query += ` AND (r.phan_hoi_admin IS NULL OR r.phan_hoi_admin = '')`;
    } else if (status === 'replied') {
      query += ` AND r.phan_hoi_admin IS NOT NULL AND r.phan_hoi_admin != ''`;
    }

    if (rating && !isNaN(parseInt(rating))) {
      query += ` AND r.so_sao = ?`;
      params.push(parseInt(rating));
    }

    if (search) {
      query += ` AND (kh.ho_ten LIKE ? OR tk.so_dien_thoai LIKE ? OR sp.ten_san_pham LIKE ? OR r.noi_dung LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY r.ngay_tao DESC`;

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đánh giá' });
  }
};

// @desc    Lấy đánh giá của một sản phẩm (Frontend xem chi tiết món)
// @route   GET /api/reviews/product/:productId
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const [rows] = await pool.query(
      `SELECT r.id, r.khach_hang_id, r.san_pham_id, r.so_sao, r.noi_dung, r.phan_hoi_admin, r.ngay_tao,
              kh.ho_ten AS ten_khach_hang, kh.hang_thanh_vien, tk.id AS tai_khoan_id, tk.ten_dang_nhap, tk.so_dien_thoai
       FROM REVIEWS r
       JOIN KHACH_HANG kh ON r.khach_hang_id = kh.id
       LEFT JOIN TAI_KHOAN tk ON kh.tai_khoan_id = tk.id
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

// @desc    Lấy danh sách đánh giá của khách hàng (Profile)
// @route   GET /api/reviews/customer/:identifier
exports.getCustomerReviews = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNum = /^\d+$/.test(identifier);
    const numId = isNum ? parseInt(identifier) : -1;

    const [rows] = await pool.query(
      `SELECT r.id, r.khach_hang_id, r.san_pham_id, r.so_sao, r.noi_dung, r.phan_hoi_admin, r.ngay_tao,
              kh.ho_ten AS ten_khach_hang, sp.ten_san_pham, sp.ma_sku, sp.hinh_anh_url, tk.ten_dang_nhap
       FROM REVIEWS r
       JOIN KHACH_HANG kh ON r.khach_hang_id = kh.id
       LEFT JOIN TAI_KHOAN tk ON kh.tai_khoan_id = tk.id
       JOIN SAN_PHAM sp ON r.san_pham_id = sp.id
       WHERE kh.id = ? OR kh.tai_khoan_id = ? OR tk.id = ? OR tk.ten_dang_nhap = ? OR tk.so_dien_thoai = ? OR kh.ho_ten = ?
       ORDER BY r.ngay_tao DESC`,
      [numId, numId, numId, identifier, identifier, identifier]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đánh giá của khách hàng' });
  }
};

// @desc    Gửi đánh giá mới cho sản phẩm (Khách hàng)
// @route   POST /api/reviews
exports.createReview = async (req, res) => {
  try {
    const { 
      khach_hang_id, 
      tai_khoan_id, 
      user_id, 
      username, 
      ten_dang_nhap, 
      author_name, 
      ho_ten, 
      phone, 
      san_pham_id, 
      hoa_don_id, 
      don_hang_id, 
      so_sao, 
      noi_dung 
    } = req.body;
    const targetInvoiceId = hoa_don_id || don_hang_id || null;

    if (!so_sao) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số sao đánh giá!' });
    }

    let targetCustId = null;

    // 1. Kiểm tra theo khach_hang_id
    if (khach_hang_id && !isNaN(khach_hang_id)) {
      const [custRows] = await pool.query('SELECT id, ho_ten FROM KHACH_HANG WHERE id = ?', [khach_hang_id]);
      if (custRows.length > 0) {
        targetCustId = custRows[0].id;
        const newName = (author_name || ho_ten || '').trim();
        if (newName && custRows[0].ho_ten !== newName) {
          await pool.query('UPDATE KHACH_HANG SET ho_ten = ? WHERE id = ?', [newName, targetCustId]);
        }
      }
    }

    // 2. Tìm theo tai_khoan_id hoặc user_id
    const targetAccId = tai_khoan_id || user_id;
    if (!targetCustId && targetAccId && !isNaN(targetAccId)) {
      const [custRows] = await pool.query('SELECT id, ho_ten FROM KHACH_HANG WHERE tai_khoan_id = ?', [targetAccId]);
      if (custRows.length > 0) {
        targetCustId = custRows[0].id;
        const newName = (author_name || ho_ten || '').trim();
        if (newName && custRows[0].ho_ten !== newName) {
          await pool.query('UPDATE KHACH_HANG SET ho_ten = ? WHERE id = ?', [newName, targetCustId]);
        }
      } else {
        const [accRows] = await pool.query('SELECT id, ten_dang_nhap FROM TAI_KHOAN WHERE id = ?', [targetAccId]);
        if (accRows.length > 0) {
          const newName = (author_name || ho_ten || accRows[0].ten_dang_nhap).trim();
          const [ins] = await pool.query(
            `INSERT INTO KHACH_HANG (tai_khoan_id, ho_ten, diem_tich_luy, hang_thanh_vien)
             VALUES (?, ?, 0, 'dong')`,
            [accRows[0].id, newName]
          );
          targetCustId = ins.insertId;
        }
      }
    }

    // 3. Tìm theo username hoặc ten_dang_nhap
    const userLookup = (username || ten_dang_nhap || '').trim();
    if (!targetCustId && userLookup) {
      const [accRows] = await pool.query(
        `SELECT tk.id, kh.id AS kh_id, kh.ho_ten
         FROM TAI_KHOAN tk
         LEFT JOIN KHACH_HANG kh ON tk.id = kh.tai_khoan_id
         WHERE tk.ten_dang_nhap = ? OR tk.so_dien_thoai = ?`,
        [userLookup, userLookup]
      );
      if (accRows.length > 0) {
        if (accRows[0].kh_id) {
          targetCustId = accRows[0].kh_id;
          const newName = (author_name || ho_ten || '').trim();
          if (newName && accRows[0].ho_ten !== newName) {
            await pool.query('UPDATE KHACH_HANG SET ho_ten = ? WHERE id = ?', [newName, targetCustId]);
          }
        } else {
          const newName = (author_name || ho_ten || userLookup).trim();
          const [ins] = await pool.query(
            `INSERT INTO KHACH_HANG (tai_khoan_id, ho_ten, diem_tich_luy, hang_thanh_vien)
             VALUES (?, ?, 0, 'dong')`,
            [accRows[0].id, newName]
          );
          targetCustId = ins.insertId;
        }
      }
    }

    // 4. Nếu vẫn chưa có (khách vãng lai), thử tìm hoặc tạo theo author_name
    if (!targetCustId) {
      const inputName = (author_name || ho_ten || '').trim();
      if (inputName) {
        const [matchRows] = await pool.query('SELECT id FROM KHACH_HANG WHERE ho_ten = ? LIMIT 1', [inputName]);
        if (matchRows.length > 0) {
          targetCustId = matchRows[0].id;
        } else {
          try {
            const guestPhone = (phone || `09${Date.now().toString().slice(-8)}`).trim();
            const guestUsername = `guest_${Date.now()}`;
            const [accRes] = await pool.query(
              `INSERT INTO TAI_KHOAN (ten_dang_nhap, mat_khau_hash, so_dien_thoai, vai_tro, trang_thai)
               VALUES (?, 'guest_pass_no_login', ?, 'khach_hang', 'hoat_dong')`,
              [guestUsername, guestPhone]
            );
            const [khRes] = await pool.query(
              `INSERT INTO KHACH_HANG (tai_khoan_id, ho_ten, diem_tich_luy, hang_thanh_vien)
               VALUES (?, ?, 0, 'dong')`,
              [accRes.insertId, inputName]
            );
            targetCustId = khRes.insertId;
          } catch (e) {
            targetCustId = 1;
          }
        }
      } else {
        targetCustId = 1;
      }
    }

    // Tìm id thật của sản phẩm nếu truyền sku (e.g. TS-01)
    let finalProdId = san_pham_id;
    if (isNaN(san_pham_id)) {
      const [prodRows] = await pool.query('SELECT id FROM SAN_PHAM WHERE ma_sku = ?', [san_pham_id]);
      if (prodRows.length > 0) finalProdId = prodRows[0].id;
      else finalProdId = 1;
    }

    const [result] = await pool.query(
      `INSERT INTO REVIEWS (khach_hang_id, san_pham_id, hoa_don_id, so_sao, noi_dung)
       VALUES (?, ?, ?, ?, ?)`,
      [targetCustId, finalProdId, targetInvoiceId, so_sao, noi_dung || '']
    );

    // Cập nhật lại số sao trung bình của sản phẩm
    const [avgRows] = await pool.query(
      `SELECT AVG(so_sao) as avgRating FROM REVIEWS WHERE san_pham_id = ? AND trang_thai_hien_thi = TRUE`,
      [finalProdId]
    );
    const newAvg = avgRows[0].avgRating ? parseFloat(avgRows[0].avgRating).toFixed(1) : 5.0;

    await pool.query(
      `UPDATE SAN_PHAM SET danh_gia_tb = ? WHERE id = ?`,
      [newAvg, finalProdId]
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

// @desc    Quản lý phản hồi đánh giá của khách hàng
// @route   PUT /api/reviews/:id/reply
exports.replyReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyContent } = req.body;

    if (!replyContent || !replyContent.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung phản hồi!' });
    }

    const [result] = await pool.query(
      `UPDATE REVIEWS SET phan_hoi_admin = ? WHERE id = ?`,
      [replyContent.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá cần phản hồi!' });
    }

    res.json({
      success: true,
      message: 'Đã gửi phản hồi đánh giá cho khách hàng thành công!',
      replyContent: replyContent.trim()
    });
  } catch (error) {
    console.error('Error replying review:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi phản hồi' });
  }
};

// @desc    Ẩn / Hiện đánh giá trên website
// @route   PUT /api/reviews/:id/toggle-visibility
exports.toggleReviewVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`SELECT trang_thai_hien_thi FROM REVIEWS WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá!' });
    }

    const newStatus = !rows[0].trang_thai_hien_thi;
    await pool.query(`UPDATE REVIEWS SET trang_thai_hien_thi = ? WHERE id = ?`, [newStatus, id]);

    res.json({
      success: true,
      message: newStatus ? 'Đã hiển thị đánh giá này trên website' : 'Đã ẩn đánh giá này khỏi website',
      visible: newStatus
    });
  } catch (error) {
    console.error('Error toggling review visibility:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thay đổi trạng thái đánh giá' });
  }
};

// @desc    Chỉnh sửa đánh giá (Khách hàng / Quản lý / Nhân viên - UC 3.2.2.2.3 g)
// @route   PUT /api/reviews/:id
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { so_sao, noi_dung, phan_hoi_admin, trang_thai_hien_thi, author_name, ho_ten } = req.body;

    const [existing] = await pool.query(`SELECT * FROM REVIEWS WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá cần sửa!' });
    }

    const newStars = so_sao !== undefined ? parseInt(so_sao) : existing[0].so_sao;
    const newContent = noi_dung !== undefined ? noi_dung : existing[0].noi_dung;
    const newReply = phan_hoi_admin !== undefined ? phan_hoi_admin : existing[0].phan_hoi_admin;
    let newVisibility = existing[0].trang_thai_hien_thi;
    if (trang_thai_hien_thi !== undefined) {
      newVisibility = (trang_thai_hien_thi === 1 || trang_thai_hien_thi === true || String(trang_thai_hien_thi) === '1' || String(trang_thai_hien_thi) === 'true') ? 1 : 0;
    }

    if (author_name || ho_ten) {
      const newName = (author_name || ho_ten).trim();
      if (newName) {
        await pool.query('UPDATE KHACH_HANG SET ho_ten = ? WHERE id = ?', [newName, existing[0].khach_hang_id]);
      }
    }

    await pool.query(
      `UPDATE REVIEWS SET so_sao = ?, noi_dung = ?, phan_hoi_admin = ?, trang_thai_hien_thi = ? WHERE id = ?`,
      [newStars, newContent, newReply, newVisibility, id]
    );

    // Cập nhật lại sao trung bình của sản phẩm
    const [avgRows] = await pool.query(
      `SELECT AVG(so_sao) as avgRating FROM REVIEWS WHERE san_pham_id = ? AND trang_thai_hien_thi = TRUE`,
      [existing[0].san_pham_id]
    );
    const newAvg = avgRows[0].avgRating ? parseFloat(avgRows[0].avgRating).toFixed(1) : 5.0;
    await pool.query(`UPDATE SAN_PHAM SET danh_gia_tb = ? WHERE id = ?`, [newAvg, existing[0].san_pham_id]);

    res.json({
      success: true,
      message: 'Chỉnh sửa đánh giá thành công!',
      data: { id, so_sao: newStars, noi_dung: newContent, phan_hoi_admin: newReply, trang_thai_hien_thi: newVisibility, newAvg }
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật đánh giá' });
  }
};

// @desc    Xóa đánh giá
// @route   DELETE /api/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`DELETE FROM REVIEWS WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá!' });
    }
    res.json({ success: true, message: 'Đã xóa đánh giá thành công!' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa đánh giá' });
  }
};

