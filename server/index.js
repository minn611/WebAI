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

// ============================================================================
// 📋 MODULE PHÂN CÔNG NHIỆM VỤ NHÂN VIÊN (UC 3.2.2.2.2 b & FR-06)
// ============================================================================
let staffTasks = [
  {
    id: 'TASK-101',
    title: 'Ủ cốt trà đen và trà nhài tươi',
    description: 'Nấu 10L trà đen và 5L trà lài chuẩn nhiệt độ 85°C phục vụ ca sáng',
    assignedTo: 'NV-02',
    staffName: 'Trần Văn Pha Chế',
    priority: 'cao',
    shift: 'Ca Sáng (07:00 - 12:00)',
    deadline: '08:00',
    status: 'hoan_thanh',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TASK-102',
    title: 'Nấu trân châu đen & làm Mochi kéo dài',
    description: 'Nấu 3 mẻ trân châu hoàng kim và 2 mẻ mochi dẻo mềm đóng hộp giữ ấm',
    assignedTo: 'NV-02',
    staffName: 'Trần Văn Pha Chế',
    priority: 'cao',
    shift: 'Ca Sáng (07:00 - 12:00)',
    deadline: '08:30',
    status: 'dang_lam',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TASK-103',
    title: 'Kiểm tra tem nhãn và giấy in nhiệt POS 80mm',
    description: 'Lắp cuộn giấy in mới cho quầy thu ngân và máy pha chế',
    assignedTo: 'NV-01',
    staffName: 'Lê Thị Thu Ngân',
    priority: 'trung_binh',
    shift: 'Ca Sáng (07:00 - 12:00)',
    deadline: '09:00',
    status: 'hoan_thanh',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TASK-104',
    title: 'Kiểm kê kho lạnh và lập phiếu nhập sữa',
    description: 'Đối chiếu số lượng sữa thanh trùng DalatMilk và báo quản lý đặt thêm',
    assignedTo: 'NV-01',
    staffName: 'Lê Thị Thu Ngân',
    priority: 'trung_binh',
    shift: 'Ca Chiều (12:00 - 17:00)',
    deadline: '16:00',
    status: 'chua_lam',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TASK-105',
    title: 'Vệ sinh máy dập nắp và bồn rửa quầy bar',
    description: 'Lau chùi máy dập nắp tự động, tháo phễu vệ sinh và lau sàn quầy',
    assignedTo: 'NV-02',
    staffName: 'Trần Văn Pha Chế',
    priority: 'cao',
    shift: 'Ca Tối (17:00 - 22:30)',
    deadline: '22:15',
    status: 'chua_lam',
    createdAt: new Date().toISOString()
  }
];

// GET /api/tasks - Lấy danh sách nhiệm vụ & Thống kê
app.get('/api/tasks', (req, res) => {
  const total = staffTasks.length;
  const completed = staffTasks.filter(t => t.status === 'hoan_thanh').length;
  const inProgress = staffTasks.filter(t => t.status === 'dang_lam').length;
  const pending = staffTasks.filter(t => t.status === 'chua_lam').length;

  res.json({
    success: true,
    stats: { total, completed, inProgress, pending },
    data: staffTasks
  });
});

// POST /api/tasks - Tạo nhiệm vụ mới (Quản lý)
app.post('/api/tasks', (req, res) => {
  const { title, description, assignedTo, staffName, priority, shift, deadline } = req.body || {};
  if (!title) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên nhiệm vụ!' });
  }

  const newTask = {
    id: 'TASK-' + (Date.now() % 100000),
    title: title.trim(),
    description: description || '',
    assignedTo: assignedTo || 'NV-02',
    staffName: staffName || 'Nhân Viên',
    priority: priority || 'trung_binh',
    shift: shift || 'Ca Sáng (07:00 - 12:00)',
    deadline: deadline || '12:00',
    status: 'chua_lam',
    createdAt: new Date().toISOString()
  };

  staffTasks.unshift(newTask);
  res.status(201).json({ success: true, message: 'Thêm nhiệm vụ mới thành công!', data: newTask });
});

// PUT /api/tasks/:id & /api/tasks/:id/status - Cập nhật thông tin / trạng thái nhiệm vụ
const updateTaskHandler = (req, res) => {
  const { id } = req.params;
  const task = staffTasks.find(t => String(t.id) === String(id) || String(t.id) === `TSK-${id}` || (t.id && t.id.endsWith(id)));
  if (!task) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ!' });
  }

  const { title, description, assignedTo, staffName, priority, shift, deadline, status } = req.body;
  if (title) task.title = title.trim();
  if (description !== undefined) task.description = description;
  if (assignedTo) task.assignedTo = assignedTo;
  if (staffName) task.staffName = staffName;
  if (priority) task.priority = priority;
  if (shift) task.shift = shift;
  if (deadline) task.deadline = deadline;
  if (status) task.status = status;

  res.json({ success: true, message: 'Cập nhật nhiệm vụ thành công!', data: task });
};
app.put('/api/tasks/:id', updateTaskHandler);
app.put('/api/tasks/:id/status', updateTaskHandler);

// DELETE /api/tasks/:id - Xóa nhiệm vụ
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const idx = staffTasks.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ để xóa!' });
  }
  staffTasks.splice(idx, 1);
  res.json({ success: true, message: 'Đã xóa nhiệm vụ thành công!' });
});

// ============================================================================
// 📩 MODULE TIẾP NHẬN & XỬ LÝ KHIẾU NẠI KHÁCH HÀNG (FR-12 & FR-24)
// ============================================================================
let customerComplaints = [
  {
    id: 'KN-1001',
    orderId: 'TS-8492',
    customerName: 'Nguyễn Thùy Linh',
    phone: '0912345678',
    category: 'chat_luong',
    content: 'Ly Trà Sữa Mochi hôm qua quán quên cho topping dừa nướng dù em đã chọn thêm.',
    status: 'pending',
    response: '',
    createdAt: new Date(Date.now() - 24*3600*1000).toISOString()
  },
  {
    id: 'KN-1002',
    orderId: 'TS-7721',
    customerName: 'Hoàng Anh Tuấn',
    phone: '0988776655',
    category: 'giao_hang',
    content: 'Shipper giao hơi trễ 15 phút do trời mưa, nhưng trà sữa vẫn giữ lạnh tốt.',
    status: 'resolved',
    response: 'Quán đã gọi điện xin lỗi và gửi tặng voucher 20k cho anh Tuấn.',
    createdAt: new Date(Date.now() - 48*3600*1000).toISOString()
  }
];

// GET /api/complaints
app.get('/api/complaints', (req, res) => {
  res.json({ success: true, data: customerComplaints });
});

// POST /api/complaints - Khách hàng gửi khiếu nại
app.post('/api/complaints', (req, res) => {
  const { orderId, customerName, phone, category, content } = req.body || {};
  if (!content) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung khiếu nại!' });
  }

  const newComplaint = {
    id: 'KN-' + (Date.now() % 100000),
    orderId: orderId || 'Vãng lai',
    customerName: customerName || 'Khách Hàng',
    phone: phone || '',
    category: category || 'chat_luong',
    content: content.trim(),
    status: 'pending',
    response: '',
    createdAt: new Date().toISOString()
  };

  customerComplaints.unshift(newComplaint);
  console.log(`⚠️ [KHIẾU NẠI MỚI TỪ KHÁCH] [${newComplaint.id}] ${newComplaint.customerName}: ${newComplaint.content}`);
  res.status(201).json({ success: true, message: 'Cảm ơn quý khách! Khiếu nại đã được gửi tới Quản lý.', data: newComplaint });
});

// PUT /api/complaints/:id/resolve - Quản lý giải quyết khiếu nại
app.put('/api/complaints/:id/resolve', (req, res) => {
  const { id } = req.params;
  const complaint = customerComplaints.find(c => String(c.id) === String(id) || String(c.id) === `KN-${id}` || (c.id && c.id.endsWith(id)));
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu khiếu nại!' });
  }

  complaint.status = 'resolved';
  complaint.response = req.body.responseText || req.body.response || 'Đã liên hệ khách hàng và giải quyết thỏa đáng.';
  res.json({ success: true, message: 'Đã cập nhật giải quyết khiếu nại!', data: complaint });
});

// ============================================================================
// 💬 MODULE NHẮN TIN TRỰC TUYẾN VỚI CỬA HÀNG (LIVE CHAT - UC 3.2.2.2.3 d)
// ============================================================================
let liveChatMessages = [
  {
    id: 'MSG-1',
    sessionId: 'general',
    sender: 'bot',
    senderName: 'Trợ Lý Đô Đô 🧋',
    message: 'Xin chào bạn! Trà Sữa ĐÔ ĐÔ hân hạnh phục vụ. Bạn có thể hỏi về các món trà sữa đặc sắc, ưu đãi hôm nay hoặc nhờ hỗ trợ đơn hàng nhé!',
    createdAt: new Date().toISOString()
  }
];

// GET /api/messages - Lấy tin nhắn
app.get('/api/messages', (req, res) => {
  const sessionId = req.query.sessionId || 'general';
  const msgs = liveChatMessages.filter(m => m.sessionId === sessionId || m.sessionId === 'general');
  res.json({ success: true, data: msgs });
});

// POST /api/messages - Gửi tin nhắn
app.post('/api/messages', (req, res) => {
  const { sessionId, sender, senderName } = req.body || {};
  const rawMsg = req.body?.message || req.body?.text;
  if (!rawMsg || !rawMsg.trim()) {
    return res.status(400).json({ success: false, message: 'Tin nhắn không được để trống' });
  }

  const userMsg = {
    id: 'MSG-' + Date.now(),
    sessionId: sessionId || 'general',
    sender: sender || 'customer',
    senderName: senderName || 'Khách Hàng',
    message: rawMsg.trim(),
    createdAt: new Date().toISOString()
  };

  liveChatMessages.push(userMsg);

  // Tự động trả lời thông minh sau khi khách gửi
  if (userMsg.sender === 'customer') {
    const textLower = userMsg.message.toLowerCase();
    let replyText = 'Dạ Trà Sữa Đô Đô đã nhận được tin nhắn của bạn! Nhân viên sẽ phản hồi bạn trong giây lát nhé ạ 🥰';

    if (textLower.includes('menu') || textLower.includes('món') || textLower.includes('uống gì') || textLower.includes('ngon')) {
      replyText = 'Hôm nay quán gợi ý bạn thử dòng Mochi Kéo Dài best-seller: Trà Sữa Tiramisu Mochi hoặc Hồng Trà Sữa Nướng nha, đang có giá cực ưu đãi đồng giá 25k đấy ạ! 🍡';
    } else if (textLower.includes('đơn') || textLower.includes('giao') || textLower.includes('ts-') || textLower.includes('ở đâu')) {
      replyText = 'Để kiểm tra đơn hàng nhanh nhất, bạn có thể vào mục "Tra Cứu Đơn" trên thanh menu và nhập mã đơn hoặc Số điện thoại đặt hàng nhé! 🛵';
    } else if (textLower.includes('voucher') || textLower.includes('khuyến mãi') || textLower.includes('giảm giá')) {
      replyText = 'Mã hot hôm nay: Nhập "BANMOI10" để được giảm 10% cho đơn từ 50k, hoặc vào mục "🎁 Vòng Quay" ở đầu trang để quay thưởng nhận mã giảm tới 20k nhé! 🎟️';
    }

    const botReply = {
      id: 'MSG-' + (Date.now() + 1),
      sessionId: userMsg.sessionId,
      sender: 'bot',
      senderName: 'Trợ Lý Đô Đô 🧋',
      message: replyText,
      createdAt: new Date(Date.now() + 500).toISOString()
    };
    liveChatMessages.push(botReply);

    return res.status(201).json({ success: true, data: userMsg, autoReply: botReply });
  }

  res.status(201).json({ success: true, data: userMsg });
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
app.use('/api/invoices', orderRoutes);
app.use('/api/hoa-don', orderRoutes);
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
