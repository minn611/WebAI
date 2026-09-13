const { pool } = require('../config/db');

// @desc    Lấy danh sách tất cả Nhà cung cấp (Admin)
// @route   GET /api/suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, ma_ncc, ten_nha_cung_cap, nguoi_dai_dien, so_dien_thoai, email, dia_chi, danh_muc_nguyen_lieu, trang_thai
       FROM NHA_CUNG_CAP
       ORDER BY ngay_tao DESC`
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách nhà cung cấp' });
  }
};

// @desc    Tạo Nhà cung cấp mới (Admin)
// @route   POST /api/suppliers
exports.createSupplier = async (req, res) => {
  try {
    const { ma_ncc, ten_nha_cung_cap, nguoi_dai_dien, so_dien_thoai, email, dia_chi, danh_muc_nguyen_lieu } = req.body;

    if (!ma_ncc || !ten_nha_cung_cap || !so_dien_thoai) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền mã NCC, tên nhà cung cấp và SĐT!' });
    }

    const [result] = await pool.query(
      `INSERT INTO NHA_CUNG_CAP (ma_ncc, ten_nha_cung_cap, nguoi_dai_dien, so_dien_thoai, email, dia_chi, danh_muc_nguyen_lieu)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ma_ncc.trim(), ten_nha_cung_cap.trim(), nguoi_dai_dien || '', so_dien_thoai.trim(), email || '', dia_chi || '', danh_muc_nguyen_lieu || '']
    );

    res.status(201).json({
      success: true,
      message: 'Thêm nhà cung cấp mới thành công!',
      supplierId: result.insertId
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Mã nhà cung cấp này đã tồn tại!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm nhà cung cấp' });
  }
};

// @desc    Cập nhật Nhà cung cấp (Admin)
// @route   PUT /api/suppliers/:id
exports.updateSupplier = async (req, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const numId = isNum ? parseInt(rawId) : -1;
    const { ten_nha_cung_cap, name, nguoi_dai_dien, contact, so_dien_thoai, phone, danh_muc_nguyen_lieu, materials, status } = req.body;

    const supName = (ten_nha_cung_cap || name || '').trim();
    const supContact = (nguoi_dai_dien || contact || '').trim();
    const supPhone = (so_dien_thoai || phone || '').trim();
    const supMat = (danh_muc_nguyen_lieu || materials || '').trim();
    const supStatus = status === 'paused' || status === 'tam_dung' ? 'tam_dung' : 'hop_tac';

    const [result] = await pool.query(
      `UPDATE NHA_CUNG_CAP 
       SET ten_nha_cung_cap = ?, nguoi_dai_dien = ?, so_dien_thoai = ?, danh_muc_nguyen_lieu = ?, trang_thai = ?
       WHERE id = ? OR ma_ncc = ?`,
      [supName, supContact, supPhone, supMat, supStatus, numId, rawId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp!' });
    }

    res.json({
      success: true,
      message: `Đã cập nhật nhà cung cấp ${supName} thành công!`
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi cập nhật nhà cung cấp' });
  }
};

// @desc    Xóa Nhà cung cấp (Admin)
// @route   DELETE /api/suppliers/:id
exports.deleteSupplier = async (req, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const numId = isNum ? parseInt(rawId) : -1;

    const [result] = await pool.query(`DELETE FROM NHA_CUNG_CAP WHERE id = ? OR ma_ncc = ?`, [numId, rawId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp để xóa!' });
    }

    res.json({
      success: true,
      message: 'Đã xóa thông tin nhà cung cấp thành công!'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa nhà cung cấp' });
  }
};
