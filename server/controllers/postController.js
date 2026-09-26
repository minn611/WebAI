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

// @desc    Lấy chi tiết 1 Bài viết theo ID hoặc Slug
// @route   GET /api/posts/:id
exports.getPostById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const numId = isNum ? parseInt(rawId) : -1;

    const [rows] = await pool.query(
      `SELECT * FROM BAI_VIET WHERE id = ? OR slug = ? LIMIT 1`,
      [numId, rawId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // Tăng lượt xem
    await pool.query(`UPDATE BAI_VIET SET luot_xem = luot_xem + 1 WHERE id = ?`, [rows[0].id]);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting post by id:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy chi tiết bài viết' });
  }
};

// @desc    Cập nhật Bài viết (Admin / Staff)
// @route   PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const numId = isNum ? parseInt(rawId) : -1;
    const { tieu_de, loai_bai_viet, anh_dai_dien, tom_tat, noi_dung, trang_thai } = req.body;

    const [result] = await pool.query(
      `UPDATE BAI_VIET 
       SET tieu_de = COALESCE(?, tieu_de),
           loai_bai_viet = COALESCE(?, loai_bai_viet),
           anh_dai_dien = COALESCE(?, anh_dai_dien),
           tom_tat = COALESCE(?, tom_tat),
           noi_dung = COALESCE(?, noi_dung),
           trang_thai = COALESCE(?, trang_thai)
       WHERE id = ?`,
      [
        tieu_de ? tieu_de.trim() : null,
        loai_bai_viet || null,
        anh_dai_dien || null,
        tom_tat !== undefined ? tom_tat : null,
        noi_dung !== undefined ? noi_dung : null,
        trang_thai || null,
        numId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để cập nhật!' });
    }

    res.json({ success: true, message: 'Cập nhật bài viết truyền thông thành công!' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật bài viết' });
  }
};

// @desc    Xóa Bài viết (Admin)
// @route   DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const numId = isNum ? parseInt(rawId) : -1;

    const [result] = await pool.query(`DELETE FROM BAI_VIET WHERE id = ?`, [numId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để xóa!' });
    }

    res.json({ success: true, message: 'Đã xóa bài viết khỏi hệ thống!' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa bài viết' });
  }
};

