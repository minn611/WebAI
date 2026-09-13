const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const toppingRoutes = require('./routes/toppings');
const orderRoutes = require('./routes/orders');
const voucherRoutes = require('./routes/vouchers');
const reviewRoutes = require('./routes/reviews');
const customerRoutes = require('./routes/customers');
const supplierRoutes = require('./routes/suppliers');
const postRoutes = require('./routes/posts');
const staffRoutes = require('./routes/staff');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Bộ nhớ lưu thông báo chuyển khoản & thao tác gửi tới Quản lý & Pha chế
let transferNotifications = [];

// 🔔 Endpoint Nhận Thông Báo Chuyển Khoản VietQR từ Khách Hàng
app.post('/api/notifications/transfer', (req, res) => {
  const { orderId, customerName, customerPhone, amount, bankName, accountNumber, accountName, note } = req.body || {};
  const notif = {
    id: 'NOTIF-' + Date.now(),
    orderId: orderId || 'TS-' + Math.floor(1000 + Math.random() * 9000),
    customerName: customerName || 'Khách Hàng',
    customerPhone: customerPhone || '',
    amount: parseFloat(amount) || 0,
    bankName: bankName || 'VietinBank (CN Tiên Sơn)',
    accountNumber: accountNumber || '0868870869',
    accountName: accountName || 'NGO MANH HIEU',
    note: note || 'Chuyển khoản thanh toán đơn hàng',
    status: 'unread',
    createdAt: new Date().toISOString()
  };

  transferNotifications.unshift(notif);
  if (transferNotifications.length > 100) transferNotifications.pop();

  const time = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n\x07========================================================================`);
  console.log(`🔔 [THÔNG BÁO CHUYỂN KHOẢN VIETQR MỚI - GỬI QUẢN LÝ & NHÂN VIÊN] [${time}]`);
  console.log(`   💰 Số tiền nhận:   ${notif.amount.toLocaleString('vi-VN')} ₫`);
  console.log(`   👤 Khách chuyển:   ${notif.customerName} (SĐT: ${notif.customerPhone})`);
  console.log(`   📋 Mã đơn hàng:    #${notif.orderId}`);
  console.log(`   🏦 Ngân hàng nhận: ${notif.bankName} - STK: ${notif.accountNumber} (${notif.accountName})`);
  console.log(`   📝 Nội dung:       ${notif.note}`);
  console.log(`   ⚡ Quản lý/Nhân viên vui lòng kiểm tra App VietinBank và bấm xác nhận đơn!`);
  console.log(`========================================================================\n`);

  return res.status(201).json({
    success: true,
    message: 'Đã gửi thông báo chuyển khoản tới Quản lý và Nhân viên',
    data: notif
  });
});

// 🔔 Endpoint Lấy Danh Sách Thông Báo Cho Màn Hình Quản Lý & Pha Chế
app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    count: transferNotifications.length,
    unreadCount: transferNotifications.filter(n => n.status === 'unread').length,
    data: transferNotifications
  });
});

// 🔔 Endpoint Đánh Dấu Thông Báo Đã Đọc / Đã Kiểm Tra
app.put('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = transferNotifications.find(n => n.id === id);
  if (notif) {
    notif.status = 'read';
  }
  res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
});

// 🔔 Endpoint Nhận Thông Báo Thao Tác Thời Gian Thực từ Mọi Tác Nhân
app.post('/api/audit', (req, res) => {
  const { actor, role, action, detail } = req.body || {};
  const time = new Date().toLocaleTimeString('vi-VN');
  
  console.log(`\n========================================================================`);
  console.log(`🔔 [THÔNG BÁO MÁY CHỦ] [${time}]`);
  console.log(`   👤 Tác nhân:  ${actor || 'Khách Hàng'} ${role ? `[${role}]` : ''}`);
  console.log(`   ⚡ Thao tác:  ${action || 'Thực hiện thao tác'}`);
  if (detail) {
    console.log(`   📝 Chi tiết:  ${detail}`);
  }
  console.log(`========================================================================\n`);

  return res.json({ success: true, message: 'Đã hiển thị thông báo thao tác trên máy chủ' });
});

// Middleware ghi log các truy vấn thay đổi dữ liệu (POST, PUT, DELETE)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/audit' && req.path !== '/api/health') {
    const time = new Date().toLocaleTimeString('vi-VN');
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      console.log(`📡 [MÁY CHỦ NHẬN LỆNH] [${time}] ${req.method} ${req.originalUrl}`);
    }
  }
  next();
});

// Root API Welcome Endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '🧋 Trà Sữa Đô Đô RESTful Backend API Server đang chạy thành công!',
    endpoints: {
      health: 'GET /api/health',
      auth: '/api/auth/*',
      products: 'GET /api/products',
      toppings: 'GET /api/toppings',
      orders: '/api/orders/*',
      vouchers: '/api/vouchers/*',
      reviews: '/api/reviews/*',
      customers: '/api/customers/*',
      suppliers: '/api/suppliers/*',
      posts: '/api/posts/*',
      staff: '/api/staff/*',
      reports: '/api/reports/*'
    }
  });
});

// Root API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Trà Sữa Đô Đô RESTful Backend API',
    timestamp: new Date().toISOString()
  });
});

// Mount Feature API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/toppings', toppingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportRoutes);

// Phục vụ toàn bộ giao diện Web Khách hàng & Admin từ thư mục gốc
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// Start Server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`==================================================`);
  console.log(`  🧋 TRÀ SỮA ĐÔ ĐÔ - SERVER CHẠY TẠI LOCALHOST`);
  console.log(`  🏠 Website Khách Hàng: http://localhost:${PORT}/`);
  console.log(`  💼 Hệ Thống Quản Trị:  http://localhost:${PORT}/admin/`);
  console.log(`  ⚡ RESTful Backend API: http://localhost:${PORT}/api`);
  console.log(`==================================================`);
  
  await testConnection();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Cổng ${PORT} đang bận. Đang thử đóng tiến trình cũ hoặc dùng cổng phụ...`);
  } else {
    console.error('Server error:', err);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
