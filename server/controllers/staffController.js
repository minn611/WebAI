const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// @desc    Lấy toàn bộ danh sách Nhân Viên & Phân Quyền
// @route   GET /api/staff
exports.getAllStaff = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        nv.id,
        nv.ma_nhan_vien,
        nv.ho_ten,
        nv.chuc_vu,
        nv.cccd,
        nv.ngay_sinh,
        nv.gioi_tinh,
        nv.dia_chi,
        nv.luong_co_ban,
        nv.ngay_vao_lam,
        nv.trang_thai_lam_viec,
        tk.id AS tai_khoan_id,
        tk.ten_dang_nhap,
        tk.email,
        tk.so_dien_thoai,
        tk.vai_tro,
        tk.trang_thai AS trang_thai_tai_khoan
       FROM NHAN_VIEN nv
       JOIN TAI_KHOAN tk ON nv.tai_khoan_id = tk.id
       ORDER BY nv.id DESC`
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách nhân viên' });
  }
};

// @desc    Lấy chi tiết 1 nhân viên theo ID
// @route   GET /api/staff/:id
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT 
        nv.*,
        tk.ten_dang_nhap,
        tk.email,
        tk.so_dien_thoai,
        tk.vai_tro,
        tk.trang_thai AS trang_thai_tai_khoan
       FROM NHAN_VIEN nv
       JOIN TAI_KHOAN tk ON nv.tai_khoan_id = tk.id
       WHERE nv.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Lỗi lấy chi tiết nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Tạo mới tài khoản & hồ sơ nhân viên
// @route   POST /api/staff
exports.createStaff = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      ho_ten,
      ten_dang_nhap,
      mat_khau,
      so_dien_thoai,
      email,
      chuc_vu,
      vai_tro = 'nhan_vien',
      cccd,
      ngay_sinh,
      gioi_tinh = 'nam',
      dia_chi,
      luong_co_ban = 6000000,
      ngay_vao_lam = new Date().toISOString().split('T')[0]
    } = req.body;

    if (!ho_ten || !ten_dang_nhap || !so_dien_thoai || !chuc_vu) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đủ Họ tên, Tên đăng nhập, Số điện thoại và Chức vụ!'
      });
    }

    // Kiểm tra trùng tên đăng nhập hoặc số điện thoại
    const [existing] = await connection.query(
      `SELECT id FROM TAI_KHOAN WHERE ten_dang_nhap = ? OR so_dien_thoai = ?`,
      [ten_dang_nhap, so_dien_thoai]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc số điện thoại này đã được sử dụng!'
      });
    }

    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const matKhauRaw = mat_khau || 'Dodo@123456';
    const mat_khau_hash = await bcrypt.hash(matKhauRaw, salt);

    // 1. Insert TAI_KHOAN
    const [tkResult] = await connection.query(
      `INSERT INTO TAI_KHOAN (ten_dang_nhap, mat_khau_hash, email, so_dien_thoai, vai_tro, trang_thai)
       VALUES (?, ?, ?, ?, ?, 'hoat_dong')`,
      [ten_dang_nhap, mat_khau_hash, email || null, so_dien_thoai, vai_tro]
    );
    const tai_khoan_id = tkResult.insertId;

    // 2. Sinh mã nhân viên
    const ma_nhan_vien = `NV-${Date.now().toString().slice(-4)}`;

    // 3. Insert NHAN_VIEN
    const [nvResult] = await connection.query(
      `INSERT INTO NHAN_VIEN 
        (tai_khoan_id, ma_nhan_vien, ho_ten, chuc_vu, cccd, ngay_sinh, gioi_tinh, dia_chi, luong_co_ban, ngay_vao_lam, trang_thai_lam_viec)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dang_lam')`,
      [
        tai_khoan_id,
        ma_nhan_vien,
        ho_ten,
        chuc_vu,
        cccd || null,
        ngay_sinh || null,
        gioi_tinh,
        dia_chi || null,
        luong_co_ban,
        ngay_vao_lam
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Tạo nhân viên mới thành công!',
      data: {
        id: nvResult.insertId,
        ma_nhan_vien,
        ho_ten,
        chuc_vu,
        ten_dang_nhap,
        vai_tro
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi thêm nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo nhân viên' });
  } finally {
    connection.release();
  }
};

// @desc    Cập nhật thông tin nhân viên
// @route   PUT /api/staff/:id
exports.updateStaff = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [existing] = await connection.query(
      `SELECT tai_khoan_id FROM NHAN_VIEN WHERE id = ?`,
      [id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }
    const tai_khoan_id = existing[0].tai_khoan_id;

    const {
      ho_ten,
      chuc_vu,
      so_dien_thoai,
      email,
      vai_tro,
      mat_khau,
      dia_chi,
      luong_co_ban,
      trang_thai_lam_viec
    } = req.body;

    // Cập nhật NHAN_VIEN
    await connection.query(
      `UPDATE NHAN_VIEN 
       SET ho_ten = COALESCE(?, ho_ten),
           chuc_vu = COALESCE(?, chuc_vu),
           dia_chi = COALESCE(?, dia_chi),
           luong_co_ban = COALESCE(?, luong_co_ban),
           trang_thai_lam_viec = COALESCE(?, trang_thai_lam_viec)
       WHERE id = ?`,
      [ho_ten, chuc_vu, dia_chi, luong_co_ban, trang_thai_lam_viec, id]
    );

    // Cập nhật TAI_KHOAN
    if (mat_khau) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(mat_khau, salt);
      await connection.query(
        `UPDATE TAI_KHOAN 
         SET so_dien_thoai = COALESCE(?, so_dien_thoai),
             email = COALESCE(?, email),
             vai_tro = COALESCE(?, vai_tro),
             mat_khau_hash = ?
         WHERE id = ?`,
        [so_dien_thoai, email, vai_tro, hash, tai_khoan_id]
      );
    } else {
      await connection.query(
        `UPDATE TAI_KHOAN 
         SET so_dien_thoai = COALESCE(?, so_dien_thoai),
             email = COALESCE(?, email),
             vai_tro = COALESCE(?, vai_tro)
         WHERE id = ?`,
        [so_dien_thoai, email, vai_tro, tai_khoan_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Cập nhật nhân viên thành công!' });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi cập nhật nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật nhân viên' });
  } finally {
    connection.release();
  }
};

// @desc    Khóa / Mở khóa tài khoản nhân viên
// @route   PUT /api/staff/:id/toggle-status
exports.toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT nv.id, nv.trang_thai_lam_viec, tk.id AS tai_khoan_id, tk.trang_thai AS trang_thai_tai_khoan
       FROM NHAN_VIEN nv
       JOIN TAI_KHOAN tk ON nv.tai_khoan_id = tk.id
       WHERE nv.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    const currentStatus = rows[0].trang_thai_tai_khoan;
    const nextStatus = currentStatus === 'hoat_dong' ? 'tam_khoa' : 'hoat_dong';
    const nextWorkStatus = nextStatus === 'hoat_dong' ? 'dang_lam' : 'nghi_phep';

    await pool.query(
      `UPDATE TAI_KHOAN SET trang_thai = ? WHERE id = ?`,
      [nextStatus, rows[0].tai_khoan_id]
    );
    await pool.query(
      `UPDATE NHAN_VIEN SET trang_thai_lam_viec = ? WHERE id = ?`,
      [nextWorkStatus, id]
    );

    res.json({
      success: true,
      message: `Đã ${nextStatus === 'hoat_dong' ? 'mở khóa' : 'khóa'} tài khoản nhân viên!`,
      status: nextStatus
    });
  } catch (error) {
    console.error('Lỗi khóa/mở khóa nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Xóa nhân viên
// @route   DELETE /api/staff/:id
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT tai_khoan_id FROM NHAN_VIEN WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    const tai_khoan_id = rows[0].tai_khoan_id;

    // Xóa TAI_KHOAN sẽ tự cascade xóa NHAN_VIEN
    await pool.query(`DELETE FROM TAI_KHOAN WHERE id = ?`, [tai_khoan_id]);

    res.json({ success: true, message: 'Đã xóa nhân viên khỏi hệ thống thành công!' });
  } catch (error) {
    console.error('Lỗi xóa nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa nhân viên' });
  }
};
