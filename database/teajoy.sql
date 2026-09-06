-- ============================================================================
-- TEAJOY STORE - COMPLETE MYSQL 8.0 DATABASE SCHEMA & SEED DATA
-- HỆ THỐNG CƠ SỞ DỮ LIỆU BÁN TRÀ SỮA & QUẢN TRỊ CHUỖI CỬA HÀNG TRÀ SỮA ĐÔ ĐÔ
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `teajoy_store` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `teajoy_store`;

-- Disable Foreign Key checks during recreation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `REVIEWS`;
DROP TABLE IF EXISTS `THANH_TOAN`;
DROP TABLE IF EXISTS `CHI_TIET_DON_HANG`;
DROP TABLE IF EXISTS `DON_HANG`;
DROP TABLE IF EXISTS `VOUCHERS`;
DROP TABLE IF EXISTS `BAI_VIET`;
DROP TABLE IF EXISTS `TOPPING`;
DROP TABLE IF EXISTS `SAN_PHAM`;
DROP TABLE IF EXISTS `NHA_CUNG_CAP`;
DROP TABLE IF EXISTS `KHACH_HANG`;
DROP TABLE IF EXISTS `NHAN_VIEN`;
DROP TABLE IF EXISTS `TAI_KHOAN`;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. BẢNG TAI_KHOAN (Accounts & Authentication)
-- ----------------------------------------------------------------------------
CREATE TABLE `TAI_KHOAN` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ten_dang_nhap` VARCHAR(50) NOT NULL UNIQUE,
    `mat_khau_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt/Argon2id Hash',
    `email` VARCHAR(100) UNIQUE NULL,
    `so_dien_thoai` VARCHAR(15) NOT NULL UNIQUE,
    `vai_tro` ENUM('admin', 'nhan_vien', 'khach_hang') NOT NULL DEFAULT 'khach_hang',
    `trang_thai` ENUM('hoat_dong', 'tam_khoa', 'cho_kich_hoat') NOT NULL DEFAULT 'hoat_dong',
    `refresh_token` TEXT NULL,
    `lan_dang_nhap_cuoi` DATETIME NULL,
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_taikhoan_sdt` (`so_dien_thoai`),
    INDEX `idx_taikhoan_vaitro` (`vai_tro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. BẢNG NHAN_VIEN (Employees)
-- ----------------------------------------------------------------------------
CREATE TABLE `NHAN_VIEN` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tai_khoan_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `ma_nhan_vien` VARCHAR(20) NOT NULL UNIQUE,
    `ho_ten` VARCHAR(100) NOT NULL,
    `chuc_vu` VARCHAR(50) NOT NULL COMMENT 'Quan ly, Thu ngan, Pha che, Giao hang',
    `cccd` VARCHAR(20) UNIQUE NULL,
    `ngay_sinh` DATE NULL,
    `gioi_tinh` ENUM('nam', 'nu', 'khac') DEFAULT 'nam',
    `dia_chi` VARCHAR(255) NULL,
    `luong_co_ban` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `ngay_vao_lam` DATE NOT NULL,
    `trang_thai_lam_viec` ENUM('dang_lam', 'nghi_phep', 'da_thoi_viec') NOT NULL DEFAULT 'dang_lam',
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_nhanvien_taikhoan` FOREIGN KEY (`tai_khoan_id`) REFERENCES `TAI_KHOAN` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. BẢNG KHACH_HANG (Customers & Loyalty CRM)
-- ----------------------------------------------------------------------------
CREATE TABLE `KHACH_HANG` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tai_khoan_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `ho_ten` VARCHAR(100) NOT NULL,
    `dia_chi_mac_dinh` VARCHAR(255) NULL,
    `diem_tich_luy` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '10k = 1 diem',
    `hang_thanh_vien` ENUM('dong', 'bac', 'vang', 'kim_cuong') NOT NULL DEFAULT 'dong',
    `tong_chi_tieu` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `so_don_da_mua` INT UNSIGNED NOT NULL DEFAULT 0,
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_khachhang_hang` (`hang_thanh_vien`),
    CONSTRAINT `fk_khachhang_taikhoan` FOREIGN KEY (`tai_khoan_id`) REFERENCES `TAI_KHOAN` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. BẢNG NHA_CUNG_CAP (Suppliers)
-- ----------------------------------------------------------------------------
CREATE TABLE `NHA_CUNG_CAP` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ma_ncc` VARCHAR(20) NOT NULL UNIQUE,
    `ten_nha_cung_cap` VARCHAR(150) NOT NULL,
    `nguoi_dai_dien` VARCHAR(100) NULL,
    `so_dien_thoai` VARCHAR(15) NOT NULL,
    `email` VARCHAR(100) NULL,
    `dia_chi` VARCHAR(255) NULL,
    `danh_muc_nguyen_lieu` TEXT NULL COMMENT 'La tra, sua tuoi, tran chau, ly coc',
    `trang_thai` ENUM('dang_hop_tac', 'tam_dung') NOT NULL DEFAULT 'dang_hop_tac',
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. BẢNG SAN_PHAM (Products & Menu)
-- ----------------------------------------------------------------------------
CREATE TABLE `SAN_PHAM` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ma_sku` VARCHAR(30) NOT NULL UNIQUE,
    `nha_cung_cap_id` BIGINT UNSIGNED NULL,
    `danh_muc` ENUM('mochi', 'tiramisu', 'tra-sua', 'tra-trai-cay', 'da-xay', 'ca-phe', 'combo') NOT NULL,
    `ten_san_pham` VARCHAR(150) NOT NULL,
    `mo_ta` TEXT NULL,
    `gia_goc` DECIMAL(12, 2) NOT NULL COMMENT 'Gia size M chuan',
    `gia_khuyen_mai` DECIMAL(12, 2) NULL,
    `hinh_anh_url` VARCHAR(500) NOT NULL,
    `so_luong_ton` INT NOT NULL DEFAULT 100,
    `da_ban` INT UNSIGNED NOT NULL DEFAULT 0,
    `danh_gia_tb` DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    `trang_thai` BOOLEAN NOT NULL DEFAULT TRUE,
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_sanpham_danhmuc` (`danh_muc`),
    INDEX `idx_sanpham_daban` (`da_ban`),
    CONSTRAINT `fk_sanpham_nhacungcap` FOREIGN KEY (`nha_cung_cap_id`) REFERENCES `NHA_CUNG_CAP` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5.1. BẢNG TOPPING (Milk Tea Toppings)
-- ----------------------------------------------------------------------------
CREATE TABLE `TOPPING` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ma_topping` VARCHAR(30) NOT NULL UNIQUE,
    `ten_topping` VARCHAR(100) NOT NULL,
    `gia_them` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `trang_thai` BOOLEAN NOT NULL DEFAULT TRUE,
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. BẢNG VOUCHERS (Promotions & Coupons)
-- ----------------------------------------------------------------------------
CREATE TABLE `VOUCHERS` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ma_voucher` VARCHAR(30) NOT NULL UNIQUE,
    `loai_giam` ENUM('phan_tram', 'tien_mat') NOT NULL,
    `gia_tri_giam` DECIMAL(12, 2) NOT NULL,
    `giam_toi_da` DECIMAL(12, 2) NULL,
    `don_hang_toi_thieu` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `so_luong_phat_hanh` INT UNSIGNED NOT NULL DEFAULT 1000,
    `so_luong_da_dung` INT UNSIGNED NOT NULL DEFAULT 0,
    `ngay_bat_dau` DATETIME NOT NULL,
    `ngay_ket_thuc` DATETIME NOT NULL,
    `mo_ta` VARCHAR(255) NULL,
    `trang_thai` BOOLEAN NOT NULL DEFAULT TRUE,
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_voucher_code` (`ma_voucher`),
    INDEX `idx_voucher_hsd` (`ngay_bat_dau`, `ngay_ket_thuc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. BẢNG DON_HANG (Orders)
-- ----------------------------------------------------------------------------
CREATE TABLE `DON_HANG` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ma_don_hang` VARCHAR(30) NOT NULL UNIQUE,
    `khach_hang_id` BIGINT UNSIGNED NULL,
    `ten_nguoi_nhan` VARCHAR(100) NOT NULL,
    `sdt_nguoi_nhan` VARCHAR(15) NOT NULL,
    `dia_chi_giao_hang` VARCHAR(255) NOT NULL,
    `ghi_chu` TEXT NULL,
    `voucher_id` BIGINT UNSIGNED NULL,
    `nhan_vien_id` BIGINT UNSIGNED NULL COMMENT 'Nhan vien thu ngan / pha che xu ly don',
    `tong_tien_mon` DECIMAL(12, 2) NOT NULL,
    `phi_van_chuyen` DECIMAL(12, 2) NOT NULL DEFAULT 15000.00,
    `so_tien_giam_gia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tong_thanh_toan` DECIMAL(12, 2) NOT NULL,
    `trang_thai_don_hang` ENUM('pending', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `ngay_dat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_donhang_madon` (`ma_don_hang`),
    INDEX `idx_donhang_sdt` (`sdt_nguoi_nhan`),
    INDEX `idx_donhang_trangthai` (`trang_thai_don_hang`),
    INDEX `idx_donhang_ngaydat` (`ngay_dat`),
    CONSTRAINT `fk_donhang_khachhang` FOREIGN KEY (`khach_hang_id`) REFERENCES `KHACH_HANG` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_donhang_nhanvien` FOREIGN KEY (`nhan_vien_id`) REFERENCES `NHAN_VIEN` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_donhang_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `VOUCHERS` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. BẢNG CHI_TIET_DON_HANG (Order Items & Topping Details)
-- ----------------------------------------------------------------------------
CREATE TABLE `CHI_TIET_DON_HANG` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `don_hang_id` BIGINT UNSIGNED NOT NULL,
    `san_pham_id` BIGINT UNSIGNED NOT NULL,
    `ten_san_pham` VARCHAR(150) NOT NULL,
    `kich_thuoc` ENUM('M', 'L', 'XL') NOT NULL DEFAULT 'M',
    `muc_duong` VARCHAR(10) NOT NULL DEFAULT '100%',
    `muc_da` VARCHAR(10) NOT NULL DEFAULT '100%',
    `danh_sach_topping` JSON NULL COMMENT 'Luu mang JSON cac topping va gia',
    `don_gia` DECIMAL(12, 2) NOT NULL,
    `so_luong` INT UNSIGNED NOT NULL DEFAULT 1,
    `thanh_tien` DECIMAL(12, 2) NOT NULL,
    CONSTRAINT `fk_chitiet_donhang` FOREIGN KEY (`don_hang_id`) REFERENCES `DON_HANG` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_chitiet_sanpham` FOREIGN KEY (`san_pham_id`) REFERENCES `SAN_PHAM` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. BẢNG THANH_TOAN (Payments & Transactions)
-- ----------------------------------------------------------------------------
CREATE TABLE `THANH_TOAN` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `don_hang_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `phuong_thuc` ENUM('vietqr', 'momo', 'zalopay', 'vnpay', 'cod') NOT NULL,
    `ma_giao_dich_cong` VARCHAR(100) NULL,
    `so_tien` DECIMAL(12, 2) NOT NULL,
    `trang_thai` ENUM('cho_thanh_toan', 'da_thanh_toan', 'thanh_cong', 'that_bai', 'da_hoan_tien') NOT NULL DEFAULT 'cho_thanh_toan',
    `thoi_gian_thanh_toan` DATETIME NULL,
    `du_lieu_webhook` JSON NULL COMMENT 'Luu raw webhook tu ngan hang',
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_thanhtoan_trangthai` (`trang_thai`),
    CONSTRAINT `fk_thanhtoan_donhang` FOREIGN KEY (`don_hang_id`) REFERENCES `DON_HANG` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. BẢNG BAI_VIET (Posts, News & Banners)
-- ----------------------------------------------------------------------------
CREATE TABLE `BAI_VIET` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tac_gia_id` BIGINT UNSIGNED NOT NULL,
    `tieu_de` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `loai_bai_viet` ENUM('tin_tuc', 'khuyen_mai', 'banner_hero', 'thong_bao') NOT NULL DEFAULT 'tin_tuc',
    `anh_dai_dien` VARCHAR(500) NULL,
    `tom_tat` TEXT NULL,
    `noi_dung` LONGTEXT NULL,
    `luot_xem` INT UNSIGNED NOT NULL DEFAULT 0,
    `trang_thai` ENUM('nhap', 'xuat_ban', 'an') NOT NULL DEFAULT 'xuat_ban',
    `ngay_dang` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_baiviet_slug` (`slug`),
    INDEX `idx_baiviet_loai` (`loai_bai_viet`),
    CONSTRAINT `fk_baiviet_nhanvien` FOREIGN KEY (`tac_gia_id`) REFERENCES `NHAN_VIEN` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. BẢNG REVIEWS (Product Ratings & Feedback)
-- ----------------------------------------------------------------------------
CREATE TABLE `REVIEWS` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `khach_hang_id` BIGINT UNSIGNED NOT NULL,
    `san_pham_id` BIGINT UNSIGNED NOT NULL,
    `don_hang_id` BIGINT UNSIGNED NULL,
    `so_sao` TINYINT UNSIGNED NOT NULL CHECK (`so_sao` BETWEEN 1 AND 5),
    `noi_dung` TEXT NULL,
    `hinh_anh_kem_theo` JSON NULL,
    `phan_hoi_admin` TEXT NULL,
    `trang_thai_hien_thi` BOOLEAN NOT NULL DEFAULT TRUE,
    `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reviews_sanpham` (`san_pham_id`),
    CONSTRAINT `fk_reviews_khachhang` FOREIGN KEY (`khach_hang_id`) REFERENCES `KHACH_HANG` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reviews_sanpham` FOREIGN KEY (`san_pham_id`) REFERENCES `SAN_PHAM` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reviews_donhang` FOREIGN KEY (`don_hang_id`) REFERENCES `DON_HANG` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ============================================================================

-- 1. SEED TAI_KHOAN (Mật khẩu mặc định demo: '1', '123', hoặc '123456')
INSERT INTO `TAI_KHOAN` (`id`, `ten_dang_nhap`, `mat_khau_hash`, `email`, `so_dien_thoai`, `vai_tro`, `trang_thai`) VALUES
(1, 'admin', '123456', 'admin@dodo.vn', '0901234567', 'admin', 'hoat_dong'),
(2, 'thungan', '123456', 'thungan@dodo.vn', '0912345678', 'nhan_vien', 'hoat_dong'),
(3, 'phache', '123456', 'phache@dodo.vn', '0933445566', 'nhan_vien', 'hoat_dong');

-- 2. SEED NHAN_VIEN
INSERT INTO `NHAN_VIEN` (`id`, `tai_khoan_id`, `ma_nhan_vien`, `ho_ten`, `chuc_vu`, `cccd`, `ngay_sinh`, `gioi_tinh`, `luong_co_ban`, `ngay_vao_lam`, `trang_thai_lam_viec`) VALUES
(1, 1, 'NV-001', 'Đỗ Trung Hiếu (Quản Lý)', 'Quản Lý Cửa Hàng', '079090001122', '1992-05-15', 'nam', 15000000.00, '2026-01-01', 'dang_lam'),
(2, 2, 'NV-002', 'Nguyễn Văn Thu Ngân', 'Thu Ngân & Bán Hàng', '079195003344', '1998-08-20', 'nam', 7500000.00, '2026-02-15', 'dang_lam'),
(3, 3, 'NV-003', 'Trần Thị Pha Chế', 'Nhân Viên Pha Chế', '079195005566', '2000-01-10', 'nu', 8000000.00, '2026-03-01', 'dang_lam');

-- 3. SEED NHA_CUNG_CAP
INSERT INTO `NHA_CUNG_CAP` (`id`, `ma_ncc`, `ten_nha_cung_cap`, `nguoi_dai_dien`, `so_dien_thoai`, `email`, `dia_chi`, `danh_muc_nguyen_lieu`, `trang_thai`) VALUES
(1, 'SUP-01', 'Công ty Trà Cao Cương Lâm Đồng', 'Anh Cương', '0908889900', 'cuongtra@lamdong.vn', 'Bảo Lộc, Lâm Đồng', 'Lá trà Ô long nướng, Trà đen Assam, Lục trà nhài', 'dang_hop_tac'),
(2, 'SUP-02', 'Sữa Tươi Thanh Trùng DalatMilk', 'Chị Hạnh', '0903332211', 'hanh@dalatmilk.vn', 'Đà Lạt, Lâm Đồng', 'Sữa tươi thanh trùng, Kem béo, Bơ phô mai', 'dang_hop_tac'),
(3, 'SUP-03', 'Nhà cung cấp Topping & Bao bì Tân Phú', 'Anh Thắng', '0977112233', 'thang@tanphupack.vn', 'Tân Phú, TP.HCM', 'Trân châu hoàng kim, Cốc giấy, Ống hút sinh học', 'dang_hop_tac');

-- 4. SEED SAN_PHAM (Menu Đô Đô Đầy Đủ 16 Món)
INSERT INTO `SAN_PHAM` (`id`, `ma_sku`, `nha_cung_cap_id`, `danh_muc`, `ten_san_pham`, `mo_ta`, `gia_goc`, `gia_khuyen_mai`, `hinh_anh_url`, `so_luong_ton`, `da_ban`, `danh_gia_tb`, `trang_thai`) VALUES
(1, 'TS-01', 1, 'mochi', 'Hồng Trà Mochi Kéo Dài', 'Món Signature trứ danh của Đô Đô với lớp topping Mochi dẻo quánh kéo dài độc quyền kết hợp nền hồng trà sữa thơm bùi chuẩn vị.', 25000.00, 30000.00, 'images/products/hong-tra-mochi-keo-dai.jpg', 100, 3420, 5.0, TRUE),
(2, 'TS-02', 1, 'mochi', 'Matcha Mochi Kéo Dài', 'Matcha thanh mát nguyên chất nhập khẩu quyện cùng sữa béo và lớp mochi dẻo mềm kéo sợi dai ngọt thơm lừng.', 25000.00, 30000.00, 'images/products/matcha-mochi-keo-dai.jpg', 85, 2280, 4.9, TRUE),
(3, 'TS-03', 1, 'mochi', 'Sữa Tươi Đường Đen Mochi Kéo Dài', 'Sữa tươi thanh trùng béo ngậy sốt đường đen đậm vị cùng lớp mochi dẻo dai béo ngậy gây nghiện ngay ngụm đầu tiên.', 25000.00, 32000.00, 'images/products/sua-tuoi-duong-den-mochi.jpg', 90, 2750, 4.9, TRUE),
(4, 'TS-04', 1, 'mochi', 'Matcha Mochi Nếp Lạnh', 'Vị matcha thanh mát kết hợp cùng mochi nếp lạnh dẻo quánh nhai mát lạnh cực cuốn.', 25000.00, 30000.00, 'images/products/matcha-mochi-nep-lanh.jpg', 70, 1650, 4.8, TRUE),
(5, 'TS-05', 1, 'mochi', 'Socola Mochi Nếp Lạnh', 'Vị cacao socola đậm đà hòa quyện cùng mochi nếp lạnh dẻo quánh mềm tan trong miệng.', 25000.00, 30000.00, 'images/products/socola-mochi-nep-lanh.jpg', 65, 1420, 4.8, TRUE),
(6, 'TS-06', 1, 'tiramisu', 'Hồng Trà Tiramisu Ovaltine', 'Hồng trà sữa thơm phức phủ lớp kem Tiramisu phô mai béo mặn chuẩn Ý và rắc bột Ovaltine giòn rụm trên bề mặt.', 25000.00, 32000.00, 'images/products/hong-tra-tiramisu-ovaltine.jpg', 95, 1980, 4.9, TRUE),
(7, 'TS-07', 1, 'tiramisu', 'Matcha Tiramisu Ovaltine', 'Vị chát dịu của matcha phối cùng kem Tiramisu béo mặn và vụn Ovaltine thơm lừng đánh thức vị giác.', 25000.00, 32000.00, 'images/products/matcha-tiramisu-ovaltine.jpg', 60, 1420, 4.8, TRUE),
(8, 'TS-08', 1, 'tiramisu', 'Socola Tiramisu Ovaltine', 'Socola béo đậm kết hợp kem Tiramisu mặn ngọt và lớp bột Ovaltine giòn thơm nức mũi.', 25000.00, 30000.00, 'images/products/socola-tiramisu-ovaltine.jpg', 85, 2150, 4.9, TRUE),
(9, 'TS-09', 1, 'tiramisu', 'Hồng Trà Sữa Cookies', 'Hồng trà sữa đậm đà rắc vụn bánh cookies giòn rụm tạo cảm giác nhai vui miệng thích thú.', 25000.00, 30000.00, 'images/products/hong-tra-sua-cookies.jpg', 75, 1780, 4.8, TRUE),
(10, 'TS-10', 1, 'tra-sua', 'Trà Sữa Đô Đô Truyền Thống', 'Vị trà sữa nguyên bản Đô Đô thơm nồng đượm vị lá trà, béo ngậy vừa vặn với mức giá sinh viên chỉ 21K.', 21000.00, 25000.00, 'images/products/tra-sua-dodo-truyen-thong.jpg', 150, 4120, 4.9, TRUE),
(11, 'TS-11', 1, 'tra-sua', 'Olong Nhài Sữa Đô Đô', 'Trà Olong thanh khiết quyện cùng hương hoa nhài thơm thoang thoảng và sữa béo thanh tao.', 25000.00, 30000.00, 'images/products/olong-nhai-sua-dodo.jpg', 80, 2310, 4.9, TRUE),
(12, 'TS-12', 1, 'tra-sua', 'Trà Sữa Socola Đậm Đà', 'Cacao nguyên chất hòa cùng sữa thơm nồng đậm đà, vị ngọt đắng quyến rũ.', 23000.00, 28000.00, 'images/products/tra-sua-socola-dam-da.jpg', 70, 1350, 4.7, TRUE),
(13, 'TC-01', 1, 'tra-trai-cay', 'Trà Khế Thạch Đào', 'Vị chua thanh dịu ngọt từ trái khế mọng nước hòa quyện cùng thạch đào giòn sần sật đã khát ngày hè.', 23000.00, 28000.00, 'images/products/tra-khe-thach-dao.png', 90, 1560, 4.9, TRUE),
(14, 'TC-02', 1, 'tra-trai-cay', 'Trà Chanh Thơm Thạch Đào', 'Vị chanh vàng thơm mát kết hợp vị dứa nhiệt đới và thạch đào giòn thơm sảng khoái.', 23000.00, 28000.00, 'images/products/tra-chanh-thom-thach-dao.png', 80, 1220, 4.8, TRUE),
(15, 'TC-03', 1, 'tra-trai-cay', 'Trà Xoài Đào Thanh Mát', 'Hương vị trà xoài nhiệt đới kết hợp cốt đào thơm lừng mang đến cảm giác sảng khoái mát lạnh.', 23000.00, 28000.00, 'images/products/tra-xoai-dao-thanh-mat.jpg', 75, 1340, 4.8, TRUE),
(16, 'TC-04', 1, 'tra-trai-cay', 'Trà Mơ Xanh Muối', 'Trà xanh hương lài kết hợp cốt mơ ngâm muối mằn mặn chua ngọt độc đáo thanh lọc cơ thể.', 23000.00, 28000.00, 'images/products/tra-mo-xanh-muoi.jpg', 70, 1180, 4.7, TRUE);

-- 5. SEED TOPPING (Topping Đô Đô)
INSERT INTO `TOPPING` (`id`, `ma_topping`, `ten_topping`, `gia_them`, `trang_thai`) VALUES
(1, 'top-1', 'Mochi Kéo Dài (Signature Đô Đô)', 6000.00, TRUE),
(2, 'top-2', 'Mochi Nếp Lạnh Dẻo', 6000.00, TRUE),
(3, 'top-3', 'Kem Tiramisu Phô Mai', 8000.00, TRUE),
(4, 'top-4', 'Vụn Bánh Cookies Ovaltine', 5000.00, TRUE),
(5, 'top-5', 'Trân Châu Hoàng Kim', 5000.00, TRUE),
(6, 'top-6', 'Pudding Trứng Mịn Dẻo', 6000.00, TRUE),
(7, 'top-7', 'Thạch Đào Giòn', 5000.00, TRUE),
(8, 'top-8', 'Kem Cheese Macchiato', 8000.00, TRUE);

-- 6. SEED VOUCHERS
INSERT INTO `VOUCHERS` (`id`, `ma_voucher`, `loai_giam`, `gia_tri_giam`, `giam_toi_da`, `don_hang_toi_thieu`, `so_luong_phat_hanh`, `so_luong_da_dung`, `ngay_bat_dau`, `ngay_ket_thuc`, `mo_ta`, `trang_thai`) VALUES
(1, 'BANMOI10', 'phan_tram', 10.00, 20000.00, 50000.00, 1000, 142, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Giảm 10% cho bạn mới', TRUE),
(2, 'FREESHIP', 'tien_mat', 15000.00, NULL, 80000.00, 2000, 560, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Miễn phí vận chuyển 15k', TRUE),
(3, 'TRAXANH20', 'tien_mat', 20000.00, NULL, 100000.00, 500, 89, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Giảm ngay 20.000đ cho đơn từ 100k', TRUE);

-- 7. SEED BAI_VIET
INSERT INTO `BAI_VIET` (`id`, `tac_gia_id`, `tieu_de`, `slug`, `loai_bai_viet`, `anh_dai_dien`, `tom_tat`, `noi_dung`, `trang_thai`) VALUES
(1, 1, 'Bí Quyết Chọn Lá Trà Ô Long Chuẩn Vị Tại Bảo Lộc', 'bi-quyet-chon-la-tra-o-long', 'tin_tuc', 'https://images.unsplash.com/photo-1558857563-b37fcdd72460?auto=format&fit=crop&w=1200&q=80', 'Khám phá quy trình thu hái búp trà 1 tôm 2 lá...', '<p>Chi tiết bài viết giới thiệu về nguồn gốc lá trà tự nhiên...</p>', 'xuat_ban');
