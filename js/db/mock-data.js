/* ==========================================================================
   TEAJOY STORE - TRÀ SỮA ĐÔ ĐÔ MOCK DATABASE & SEED DATA
   ========================================================================== */

const INITIAL_CATEGORIES = [
  { id: 'mochi', name: 'Series Mochi Kéo Dài', icon: '🍡', count: 4 },
  { id: 'mochi-lanh', name: 'Series Mochi Nếp Lạnh', icon: '❄️', count: 2 },
  { id: 'tiramisu', name: 'Series Tiramisu Ovaltine', icon: '🍫', count: 4 },
  { id: 'cookies', name: 'Series Cookies Giòn Tan', icon: '🍪', count: 3 },
  { id: 'tra-sua', name: 'Series Trà Sữa Đô Đô', icon: '🧋', count: 5 },
  { id: 'matcha-special', name: 'Series Matcha Đặc Biệt', icon: '🍵', count: 2 },
  { id: 'tra-trai-cay', name: 'Series Trà Hoa Quả', icon: '🍊', count: 4 }
];

const INITIAL_TOPPINGS = [
  { id: 'top-1', name: 'Mochi Kéo Dài (Signature Đô Đô)', price: 6000, inStock: true, image: 'images/toppings/mochi-keo-dai.jpg' },
  { id: 'top-2', name: 'Mochi Nếp Lạnh Dẻo', price: 6000, inStock: true, image: 'images/toppings/mochi-nep-lanh.png' },
  { id: 'top-3', name: 'Kem Tiramisu Phô Mai', price: 8000, inStock: true, image: 'images/toppings/kem-tiramisu.png' },
  { id: 'top-4', name: 'Vụn Kẹo Ovaltine Giòn Rụm', price: 5000, inStock: true, image: 'images/toppings/vun-cookies.jpg' },
  { id: 'top-5', name: 'Vụn Bánh Cookies Thơm Bùi', price: 5000, inStock: true, image: 'images/toppings/vun-cookies.jpg' },
  { id: 'top-6', name: 'Trân Châu Đen Dẻo', price: 5000, inStock: true, image: 'images/toppings/tran-chau-den.jpg' },
  { id: 'top-7', name: 'Trân Châu Hoàng Kim / Bạch Ngọc', price: 5000, inStock: true, image: 'images/toppings/tran-chau-trang.jpg' },
  { id: 'top-8', name: 'Pudding Trứng Mịn Dẻo', price: 5000, inStock: true, image: 'images/toppings/pudding-trung.jpg' },
  { id: 'top-9', name: 'Thạch Đào Giòn / Thạch Thủy Tinh', price: 5000, inStock: true, image: 'images/toppings/tran-chau-trang.jpg' },
  { id: 'top-10', name: 'Kem Sữa Macchiato', price: 8000, inStock: true, image: 'images/toppings/kem-sua.jpg' }
];

const INITIAL_SIZES = [
  { id: 'M', name: 'Size M - Tiêu Chuẩn Đô Đô', extraPrice: 0 },
  { id: 'L', name: 'Size L (700ml) - Lớn Hơn', extraPrice: 10000 }
];

const INITIAL_PRODUCTS = [
  { id: 'TS-01', name: 'Hồng Trà Mochi Kéo Dài', category: 'mochi', price: 25000, oldPrice: 35000, rating: 5.0, sold: 3420, image: 'images/products/hong-tra-mochi-keo-dai.jpg', description: 'Món Signature trứ danh của Đô Đô với lớp topping Mochi dẻo quánh kéo dài độc quyền kết hợp nền hồng trà sữa thơm bùi chuẩn vị.', isBestseller: true, isNew: false, inStock: true, stockQty: 100 },
  { id: 'TS-02', name: 'Matcha Mochi Kéo Dài', category: 'mochi', price: 25000, oldPrice: 35000, rating: 4.9, sold: 2280, image: 'images/products/matcha-mochi-keo-dai.jpg', description: 'Matcha thanh mát nguyên chất nhập khẩu quyện cùng sữa béo và lớp mochi dẻo mềm kéo sợi dai ngọt thơm lừng.', isBestseller: false, isNew: false, inStock: true, stockQty: 85 },
  { id: 'TS-03', name: 'Sữa Tươi Đường Đen Mochi Kéo Dài', category: 'mochi', price: 25000, oldPrice: 35000, rating: 4.9, sold: 2750, image: 'images/products/sua-tuoi-duong-den-mochi.jpg', description: 'Sữa tươi thanh trùng béo ngậy sốt đường đen đậm vị cùng lớp mochi dẻo dai béo ngậy gây nghiện ngay ngụm đầu tiên.', isBestseller: true, isNew: false, inStock: true, stockQty: 90 },
  { id: 'TS-04', name: 'Ô Long Mochi Kéo Dài', category: 'mochi', price: 25000, oldPrice: 35000, rating: 4.8, sold: 1320, image: 'images/products/olong-nhai-sua-dodo.jpg', description: 'Trà Ô long nhài thanh thoát phối cùng mochi dẻo quánh kéo dài đặc trưng Đô Đô thơm lừng hấp dẫn.', isBestseller: false, isNew: false, inStock: true, stockQty: 75 },
  { id: 'TS-05', name: 'Matcha Mochi Nếp Lạnh', category: 'mochi-lanh', price: 25000, oldPrice: 35000, rating: 4.8, sold: 1650, image: 'images/products/matcha-mochi-nep-lanh.jpg', description: 'Vị matcha thanh mát kết hợp cùng mochi nếp lạnh dẻo quánh nhai mát lạnh cực cuốn.', isBestseller: false, isNew: true, inStock: true, stockQty: 70 },
  { id: 'TS-06', name: 'Socola Mochi Nếp Lạnh', category: 'mochi-lanh', price: 25000, oldPrice: 35000, rating: 4.8, sold: 1420, image: 'images/products/socola-mochi-nep-lanh.jpg', description: 'Vị cacao socola đậm đà hòa quyện cùng mochi nếp lạnh dẻo quánh mềm tan trong miệng.', isBestseller: false, isNew: false, inStock: true, stockQty: 65 },
  { id: 'TS-07', name: 'Hồng Trà Tiramisu Ovaltine', category: 'tiramisu', price: 25000, oldPrice: 35000, rating: 4.9, sold: 1980, image: 'images/products/hong-tra-tiramisu-ovaltine.jpg', description: 'Hồng trà sữa thơm phức phủ lớp kem Tiramisu phô mai béo mặn chuẩn Ý và rắc bột Ovaltine giòn rụm trên bề mặt.', isBestseller: true, isNew: false, inStock: true, stockQty: 95 },
  { id: 'TS-08', name: 'Matcha Tiramisu Ovaltine', category: 'tiramisu', price: 25000, oldPrice: 35000, rating: 4.8, sold: 1420, image: 'images/products/matcha-tiramisu-ovaltine.jpg', description: 'Vị chát dịu của matcha phối cùng kem Tiramisu béo mặn và vụn Ovaltine thơm lừng đánh thức vị giác.', isBestseller: false, isNew: false, inStock: true, stockQty: 60 },
  { id: 'TS-09', name: 'Socola Tiramisu Ovaltine', category: 'tiramisu', price: 25000, oldPrice: 35000, rating: 4.9, sold: 2150, image: 'images/products/socola-tiramisu-ovaltine.jpg', description: 'Socola béo đậm kết hợp kem Tiramisu mặn ngọt và lớp bột Ovaltine giòn thơm nức mũi.', isBestseller: false, isNew: false, inStock: true, stockQty: 85 },
  { id: 'TS-10', name: 'Ô Long Nhài Sữa Tiramisu', category: 'tiramisu', price: 25000, oldPrice: 35000, rating: 4.8, sold: 1100, image: 'images/products/olong-nhai-sua-dodo.jpg', description: 'Olong nhài thanh tao hòa cùng sữa tươi và kem Tiramisu phô mai béo ngậy Ovaltine.', isBestseller: false, isNew: false, inStock: true, stockQty: 70 },
  { id: 'TS-11', name: 'Trà Sữa Đô Đô Truyền Thống', category: 'tra-sua', price: 21000, rating: 4.9, sold: 4120, image: 'images/products/tra-sua-dodo-truyen-thong.jpg', description: 'Vị trà sữa nguyên bản Đô Đô thơm nồng đượm vị lá trà, béo ngậy vừa vặn với mức giá sinh viên chỉ 21K.', isBestseller: true, isNew: false, inStock: true, stockQty: 150 },
  { id: 'TS-12', name: 'Ô Long Nhài Sữa Đô Đô', category: 'tra-sua', price: 25000, rating: 4.9, sold: 2310, image: 'images/products/olong-nhai-sua-dodo.jpg', description: 'Trà Olong thanh khiết quyện cùng hương hoa nhài thơm thoang thoảng và sữa béo thanh tao.', isBestseller: true, isNew: false, inStock: true, stockQty: 80 },
  { id: 'TS-13', name: 'Trà Sữa Socola Đậm Đà', category: 'tra-sua', price: 23000, rating: 4.7, sold: 1350, image: 'images/products/tra-sua-socola-dam-da.jpg', description: 'Cacao nguyên chất hòa cùng sữa thơm nồng đậm đà, vị ngọt đắng quyến rũ.', isBestseller: false, isNew: false, inStock: true, stockQty: 70 },
  { id: 'TS-14', name: 'Trà Sữa Matcha Nguyên Chất', category: 'tra-sua', price: 25000, rating: 4.8, sold: 1580, image: 'images/products/matcha-mochi-keo-dai.jpg', description: 'Matcha nguyên chất Nhật Bản hòa cùng sữa tươi thanh trùng béo nhẹ thơm ngon thanh mát.', isBestseller: false, isNew: false, inStock: true, stockQty: 80 },
  { id: 'TS-15', name: 'Sữa Tươi Trân Châu Đường Đen', category: 'tra-sua', price: 25000, rating: 4.9, sold: 2100, image: 'images/products/sua-tuoi-duong-den-mochi.jpg', description: 'Sữa tươi thanh trùng béo ngậy quyện vị caramel đường đen ngọt đậm cùng trân châu đen dẻo bùi.', isBestseller: false, isNew: false, inStock: true, stockQty: 100 },
  { id: 'TS-16', name: 'Hồng Trà Sữa Cookies', category: 'cookies', price: 25000, oldPrice: 35000, rating: 4.8, sold: 1780, image: 'images/products/hong-tra-sua-cookies.jpg', description: 'Hồng trà sữa đậm đà rắc vụn bánh cookies giòn rụm tạo cảm giác nhai vui miệng thích thú.', isBestseller: false, isNew: false, inStock: true, stockQty: 75 },
  { id: 'TS-17', name: 'Socola Cookies Đậm Vị', category: 'cookies', price: 25000, oldPrice: 35000, rating: 4.7, sold: 980, image: 'images/products/hong-tra-sua-cookies.jpg', description: 'Trà sữa socola đậm đà rắc vụn bánh cookies giòn thơm tạo lớp phủ ngọt ngào hấp dẫn.', isBestseller: false, isNew: false, inStock: true, stockQty: 60 },
  { id: 'TS-18', name: 'Matcha Cookies Thơm Bùi', category: 'cookies', price: 25000, oldPrice: 35000, rating: 4.7, sold: 850, image: 'images/products/hong-tra-sua-cookies.jpg', description: 'Matcha thanh mát hòa cùng vụn cookies thơm bùi giòn tan tạo sự kết hợp tuyệt vời.', isBestseller: false, isNew: false, inStock: true, stockQty: 65 },
  { id: 'TS-19', name: 'Matcha Kem Pink Caramel', category: 'matcha-special', price: 35000, rating: 4.9, sold: 620, image: 'images/products/matcha-tiramisu-ovaltine.jpg', description: 'Matcha nguyên chất xay mịn kết hợp lớp kem caramel hồng đặc biệt béo ngậy thơm lừng.', isBestseller: false, isNew: true, inStock: true, stockQty: 50 },
  { id: 'TS-20', name: 'Matcha Trân Châu Bạch Ngọc', category: 'matcha-special', price: 30000, rating: 4.8, sold: 780, image: 'images/products/matcha-mochi-nep-lanh.jpg', description: 'Matcha thanh mát kết hợp trân châu bạch ngọc trong suốt dẻo mướt đẹp mắt tinh tế.', isBestseller: false, isNew: true, inStock: true, stockQty: 60 },
  { id: 'TC-01', name: 'Trà Xoài Đào Thanh Mát', category: 'tra-trai-cay', price: 23000, rating: 4.9, sold: 1560, image: 'images/products/tra-xoai-dao-thanh-mat.jpg', description: 'Hương vị trà xoài nhiệt đới kết hợp cốt đào thơm lừng mang đến cảm giác sảng khoái mát lạnh.', isBestseller: true, isNew: false, inStock: true, stockQty: 90 },
  { id: 'TC-02', name: 'Trà Mơ Xanh Muối', category: 'tra-trai-cay', price: 23000, rating: 4.7, sold: 1180, image: 'images/products/tra-mo-xanh-muoi.jpg', description: 'Trà mơ xanh chua ngọt đậm vị chấm phá chút vị mặn thanh độc đáo giải nhiệt tức thì.', isBestseller: false, isNew: false, inStock: true, stockQty: 70 },
  { id: 'TC-03', name: 'Trà Khế Thạch Đào', category: 'tra-trai-cay', price: 23000, rating: 4.8, sold: 1340, image: 'images/products/tra-khe-thach-dao.png', description: 'Vị chua thanh dịu ngọt từ trái khế mọng nước hòa quyện cùng thạch đào giòn sần sật đã khát ngày hè.', isBestseller: false, isNew: false, inStock: true, stockQty: 90 },
  { id: 'TC-04', name: 'Trà Chanh Thơm Thạch Đào', category: 'tra-trai-cay', price: 23000, rating: 4.8, sold: 1220, image: 'images/products/tra-chanh-thom-thach-dao.png', description: 'Vị chanh vàng thơm mát kết hợp vị dứa nhiệt đới và thạch đào giòn thơm sảng khoái.', isBestseller: false, isNew: false, inStock: true, stockQty: 80 }
];

const INITIAL_VOUCHERS = [
  { code: 'BANMOI10', discountPercent: 10, maxDiscount: 20000, minOrder: 50000, desc: 'Giảm 10% cho bạn mới đến Đô Đô', expiry: '2026-12-31' },
  { code: 'FREESHIP', discountAmount: 15000, minOrder: 80000, desc: 'Miễn phí vận chuyển cho đơn từ 80K', expiry: '2026-12-31' },
  { code: 'DODO20', discountAmount: 20000, minOrder: 100000, desc: 'Giảm ngay 20.000đ cho đơn từ 100K', expiry: '2026-12-31' },
  { code: 'UPSIZET4', discountAmount: 10000, minOrder: 25000, desc: 'Thứ 4 Free Upsize Size M lên L tại cửa hàng', expiry: '2026-12-31' },
  { code: 'LUCKYSPIN', discountPercent: 15, maxDiscount: 30000, minOrder: 60000, desc: 'Quà tặng vòng quay may mắn Đô Đô', expiry: '2026-12-31' }
];

const INITIAL_USERS = [
  {
    id: "USR-001",
    username: "admin",
    password: "123456",
    fullName: "Đỗ Trung Hiếu (Quản Lý)",
    role: "admin", // admin, staff, customer
    position: "quan_ly",
    positionTitle: "Quản Lý Cửa Hàng",
    email: "admin@dodo.vn",
    phone: "0901234567",
    status: "active",
    createdAt: "2026-01-01"
  },
  {
    id: "USR-002",
    username: "thungan",
    password: "123456",
    fullName: "Nguyễn Văn Thu Ngân",
    role: "staff",
    position: "thu_ngan",
    positionTitle: "Thu Ngân & Bán Hàng",
    email: "thungan@dodo.vn",
    phone: "0912345678",
    status: "active",
    createdAt: "2026-02-15"
  },
  {
    id: "USR-003",
    username: "phache",
    password: "123456",
    fullName: "Trần Thị Pha Chế",
    role: "staff",
    position: "pha_che",
    positionTitle: "Nhân Viên Pha Chế",
    email: "phache@dodo.vn",
    phone: "0933445566",
    status: "active",
    createdAt: "2026-03-01"
  }
];

// INITIAL_ORDERS initially empty - real customer orders placed online are saved here
const INITIAL_ORDERS = [];

const INITIAL_SUPPLIERS = [
  { id: "SUP-01", name: "Công ty Trà Cao Cương Lâm Đồng", contact: "Anh Cương", phone: "0908889900", materials: "Lá trà Ô long, Trà đen Assam, Lục trà nhài", status: "active" },
  { id: "SUP-02", name: "Sữa Tươi Thanh Trùng DalatMilk", contact: "Chị Hạnh", phone: "0903332211", materials: "Sữa tươi, Kem béo thực vật, Bơ phô mai", status: "active" },
  { id: "SUP-03", name: "Nhà cung cấp Topping & Bao bì Tân Phú", contact: "Anh Thắng", phone: "0977112233", materials: "Trân châu hoàng kim, Cốc giấy, Ống hút sinh học", status: "active" }
];

const INITIAL_BANNERS = [
  { id: "BN-01", title: "Mua 2 Tặng 1 Topping Đỉnh Chóp", image: "https://images.unsplash.com/photo-1558857563-b37fcdd72460?auto=format&fit=crop&w=1200&q=80", link: "menu.html", active: true },
  { id: "BN-02", title: "Ra Mắt Bộ Ba Trà Trái Cây Mùa Hè", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80", link: "menu.html", active: true }
];
