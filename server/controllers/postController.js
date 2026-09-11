const { pool } = require('../config/db');

// @desc    Lấy danh sách Bài viết / Banner truyền thông
// @route   GET /api/posts
exports.getAllPosts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tieu_de, slug, loai_bai_viet, anh_dai_dien, tom_tat, luot_xem, trang_thai, ngay_dang
       FROM BAI_VIET
       ORDER BY ngay_dang DESC`
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách bài viết truyền thông' });
  }
};

// @desc    Tạo bài viết mới (Admin / Staff)
// @route   POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const { tieu_de, loai_bai_viet, anh_dai_dien, tom_tat, noi_dung, tac_gia_id } = req.body;

    if (!tieu_de) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề bài viết!' });
    }

    const slug = tieu_de.toLowerCase().trim()
      .replace(/[áàảãạâấầẩẫậăắằẳẵặ]/g, 'a')
      .replace(/[éèẻẽẹêếềểễệ]/g, 'e')
      .replace(/[íìỉĩị]/g, 'i')
      .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o')
      .replace(/[úùủũụưứừửữự]/g, 'u')
      .replace(/[ýỳỷỹỵ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') + '-' + Date.now();

    const [result] = await pool.query(
      `INSERT INTO BAI_VIET (tac_gia_id, tieu_de, slug, loai_bai_viet, anh_dai_dien, tom_tat, noi_dung)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tac_gia_id || 1,
        tieu_de.trim(),
        slug,
        loai_bai_viet || 'tin_tuc',
        anh_dai_dien || 'https://images.unsplash.com/photo-1558857563-b37fcdd72460?auto=format&fit=crop&w=1200&q=80',
        tom_tat || '',
        noi_dung || ''
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Đăng bài viết truyền thông mới thành công!',
      postId: result.insertId
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng bài viết' });
  }
};
