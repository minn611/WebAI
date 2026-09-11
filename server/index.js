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
      posts: '/api/posts/*'
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
