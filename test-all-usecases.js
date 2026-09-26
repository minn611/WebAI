const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const testResults = [];

function recordTest(category, actor, useCase, status, details = '') {
  testResults.push({ category, actor, useCase, status, details });
  const icon = status === 'PASS' ? '✅' : (status === 'WARN' ? '⚠️' : '❌');
  console.log(`${icon} [${actor}] [${useCase}] -> ${status} ${details ? '(' + details + ')' : ''}`);
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CÁC TÁC NHÂN VÀ USE CASE THEO BÁO CÁO');
  console.log('================================================================\n');

  let adminToken = null;
  let staffToken = null;
  let customerToken = null;

  // =========================================================================
  // 1. KIỂM THỬ TÁC NHÂN: QUẢN LÝ (ADMIN / MANAGER)
  // =========================================================================
  console.log('--- 👑 1. TÁC NHÂN: QUẢN LÝ (MANAGER) ---');

  // UC 2.1: Đăng nhập Quản lý
  try {
    const res = await request('POST', '/api/auth/login', { username: 'admin', password: '123' });
    if (res.status === 200 && res.body.success) {
      adminToken = res.body.token || 'mock-admin-token';
      recordTest('Tài khoản', 'Quản lý', 'UC-2.1: Đăng nhập Quản lý', 'PASS', `User: ${res.body.user.fullName}, Vai trò: ${res.body.user.role}`);
    } else {
      recordTest('Tài khoản', 'Quản lý', 'UC-2.1: Đăng nhập Quản lý', 'FAIL', JSON.stringify(res.body));
    }
  } catch (e) {
    recordTest('Tài khoản', 'Quản lý', 'UC-2.1: Đăng nhập Quản lý', 'FAIL', e.message);
  }

  // UC 2.2: Quản lý nhân viên (Thêm, Sửa, Xóa)
  let createdStaffId = null;
  try {
    // Thêm nhân viên
    const addStaffRes = await request('POST', '/api/staff', {
      ho_ten: 'Test Nhân Viên Mới',
      so_dien_thoai: '0981999888',
      chuc_vu: 'pha_che',
      ca_lam: 'Ca Sáng (07:00 - 12:00)',
      luong: 6500000,
      ten_dang_nhap: 'teststaff_' + Date.now(),
      mat_khau: '123456'
    });
    if (addStaffRes.status === 201 || (addStaffRes.status === 200 && addStaffRes.body.success)) {
      createdStaffId = addStaffRes.body.data ? addStaffRes.body.data.id : null;
      recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2.a: Thêm nhân viên', 'PASS', `ID: ${createdStaffId}`);
    } else {
      recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2.a: Thêm nhân viên', 'FAIL', JSON.stringify(addStaffRes.body));
    }

    // Sửa nhân viên
    if (createdStaffId) {
      const editStaffRes = await request('PUT', `/api/staff/${createdStaffId}`, {
        ho_ten: 'Test Nhân Viên Đã Cập Nhật',
        chuc_vu: 'thu_ngan',
        ca_lam: 'Ca Chiều',
        luong: 7000000
      });
      if (editStaffRes.status === 200 && editStaffRes.body.success) {
        recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2.b: Sửa thông tin nhân viên', 'PASS');
      } else {
        recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2.b: Sửa thông tin nhân viên', 'FAIL', JSON.stringify(editStaffRes.body));
      }

      // Xóa nhân viên
      const delStaffRes = await request('DELETE', `/api/staff/${createdStaffId}`);
      if (delStaffRes.status === 200 && delStaffRes.body.success) {
        recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2.c: Xóa nhân viên', 'PASS');
      } else {
        recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2.c: Xóa nhân viên', 'FAIL', JSON.stringify(delStaffRes.body));
      }
    }
  } catch (e) {
    recordTest('Quản lý nhân viên', 'Quản lý', 'UC-2.2: Quản lý nhân viên CRUD', 'FAIL', e.message);
  }

  // UC 2.3: Phân nhiệm vụ nhân viên (Thêm, Sửa, Xóa)
  let createdTaskId = null;
  try {
    // Thêm nhiệm vụ
    const addTaskRes = await request('POST', '/api/tasks', {
      title: 'Kiểm kê sữa đặc & bột béo',
      description: 'Đếm số hộp còn trong kho trước 10h',
      assignedTo: 'NV-02',
      staffName: 'Trần Văn Pha Chế',
      priority: 'cao',
      shift: 'Ca Sáng',
      deadline: '10:00'
    });
    if (addTaskRes.status === 201 && addTaskRes.body.success) {
      createdTaskId = addTaskRes.body.data.id;
      recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3.a: Thêm nhiệm vụ', 'PASS', `Task: ${createdTaskId}`);
    } else {
      recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3.a: Thêm nhiệm vụ', 'FAIL', JSON.stringify(addTaskRes.body));
    }

    // Sửa nhiệm vụ
    if (createdTaskId) {
      const editTaskRes = await request('PUT', `/api/tasks/${createdTaskId}`, {
        status: 'hoan_thanh',
        priority: 'trung_binh'
      });
      if (editTaskRes.status === 200 && editTaskRes.body.success) {
        recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3.b: Sửa nhiệm vụ', 'PASS');
      } else {
        recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3.b: Sửa nhiệm vụ', 'FAIL', JSON.stringify(editTaskRes.body));
      }

      // Xóa nhiệm vụ
      const delTaskRes = await request('DELETE', `/api/tasks/${createdTaskId}`);
      if (delTaskRes.status === 200 && delTaskRes.body.success) {
        recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3.c: Xóa nhiệm vụ', 'PASS');
      } else {
        recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3.c: Xóa nhiệm vụ', 'FAIL', JSON.stringify(delTaskRes.body));
      }
    }
  } catch (e) {
    recordTest('Phân nhiệm vụ', 'Quản lý', 'UC-2.3: Phân nhiệm vụ CRUD', 'FAIL', e.message);
  }

  // UC 2.4: Quản lý nhà cung cấp (Thêm, Sửa, Xóa)
  let createdSupplierId = null;
  try {
    const supCode = 'NCC-TEST-' + Math.floor(Math.random() * 1000);
    const addSupRes = await request('POST', '/api/suppliers', {
      ma_ncc: supCode,
      ten_nha_cung_cap: 'Công ty TNHH Trà Shan Tuyết Test',
      so_dien_thoai: '0933221100',
      dia_chi: 'Hà Giang, Việt Nam',
      danh_muc_nguyen_lieu: 'Trà búp cao cấp',
      nguoi_dai_dien: 'Nguyễn Văn Cung'
    });
    if (addSupRes.status === 201 || (addSupRes.status === 200 && addSupRes.body.success)) {
      createdSupplierId = addSupRes.body.supplierId || (addSupRes.body.data ? addSupRes.body.data.id : null);
      recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4.a: Thêm nhà cung cấp', 'PASS', `ID: ${createdSupplierId || supCode}`);
    } else {
      recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4.a: Thêm nhà cung cấp', 'FAIL', JSON.stringify(addSupRes.body));
    }

    if (createdSupplierId) {
      const editSupRes = await request('PUT', `/api/suppliers/${createdSupplierId}`, {
        ten_nha_cung_cap: 'Công ty TNHH Trà Shan Tuyết Đã Đổi Tên',
        so_dien_thoai: '0933221199'
      });
      if (editSupRes.status === 200 && editSupRes.body.success) {
        recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4.b: Sửa nhà cung cấp', 'PASS');
      } else {
        recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4.b: Sửa nhà cung cấp', 'FAIL', JSON.stringify(editSupRes.body));
      }

      const delSupRes = await request('DELETE', `/api/suppliers/${createdSupplierId}`);
      if (delSupRes.status === 200 && delSupRes.body.success) {
        recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4.c: Xóa nhà cung cấp', 'PASS');
      } else {
        recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4.c: Xóa nhà cung cấp', 'FAIL', JSON.stringify(delSupRes.body));
      }
    }
  } catch (e) {
    recordTest('Nhà cung cấp', 'Quản lý', 'UC-2.4: Quản lý NCC CRUD', 'FAIL', e.message);
  }

  // UC 2.5: Thống kê & Báo cáo
  try {
    const reportRes = await request('GET', '/api/reports/dashboard');
    const revenueRes = await request('GET', '/api/reports/revenue');
    if ((reportRes.status === 200 && reportRes.body.success) || (revenueRes.status === 200 && revenueRes.body.success)) {
      recordTest('Thống kê', 'Quản lý', 'UC-2.5: Thống kê & Báo cáo doanh thu', 'PASS', 'Dashboard API OK');
    } else {
      recordTest('Thống kê', 'Quản lý', 'UC-2.5: Thống kê & Báo cáo doanh thu', 'FAIL', JSON.stringify(reportRes.body));
    }
  } catch (e) {
    recordTest('Thống kê', 'Quản lý', 'UC-2.5: Thống kê & Báo cáo doanh thu', 'FAIL', e.message);
  }

  // =========================================================================
  // 2. KIỂM THỬ TÁC NHÂN: NHÂN VIÊN (STAFF / THU NGÂN / PHA CHẾ)
  // =========================================================================
  console.log('\n--- 🧋 2. TÁC NHÂN: NHÂN VIÊN (STAFF) ---');

  // UC 1.1: Đăng nhập nhân viên
  try {
    const res = await request('POST', '/api/auth/login', { username: 'thungan', password: '123' });
    if (res.status === 200 && res.body.success) {
      staffToken = res.body.token || 'mock-staff-token';
      recordTest('Tài khoản', 'Nhân viên', 'UC-1.1: Đăng nhập nhân viên (Thu ngân)', 'PASS', `User: ${res.body.user.fullName}`);
    } else {
      recordTest('Tài khoản', 'Nhân viên', 'UC-1.1: Đăng nhập nhân viên (Thu ngân)', 'FAIL', JSON.stringify(res.body));
    }
  } catch (e) {
    recordTest('Tài khoản', 'Nhân viên', 'UC-1.1: Đăng nhập nhân viên (Thu ngân)', 'FAIL', e.message);
  }

  // UC 1.2: Quản lý sản phẩm & Hàng hóa (Thêm, Sửa, Xóa, Kho)
  let createdProductId = null;
  try {
    const prodSku = 'TS-TEST-' + Math.floor(100 + Math.random() * 900);
    const addProdRes = await request('POST', '/api/products', {
      sku: prodSku,
      name: 'Trà Sữa Khoai Môn Dẻo Test',
      category: 'tra_sua',
      price: 28000,
      originalPrice: 35000,
      stockQty: 99,
      description: 'Trà sữa thơm bùi vị khoai môn tím'
    });
    if (addProdRes.status === 201 || (addProdRes.status === 200 && addProdRes.body.success)) {
      createdProductId = addProdRes.body.dbId || addProdRes.body.id;
      recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2.a: Thêm sản phẩm', 'PASS', `ID: ${createdProductId}`);
    } else {
      recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2.a: Thêm sản phẩm', 'FAIL', JSON.stringify(addProdRes.body));
    }

    if (createdProductId) {
      const editProdRes = await request('PUT', `/api/products/${createdProductId}`, {
        name: 'Trà Sữa Khoai Môn Đã Đổi Giá',
        price: 29000,
        stockQty: 150
      });
      if (editProdRes.status === 200 && editProdRes.body.success) {
        recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2.b: Sửa sản phẩm & tồn kho', 'PASS');
      } else {
        recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2.b: Sửa sản phẩm & tồn kho', 'FAIL', JSON.stringify(editProdRes.body));
      }

      const delProdRes = await request('DELETE', `/api/products/${createdProductId}`);
      if (delProdRes.status === 200 && delProdRes.body.success) {
        recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2.c: Xóa sản phẩm', 'PASS');
      } else {
        recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2.c: Xóa sản phẩm', 'FAIL', JSON.stringify(delProdRes.body));
      }
    }
  } catch (e) {
    recordTest('Quản lý sản phẩm', 'Nhân viên', 'UC-1.2: Quản lý sản phẩm CRUD', 'FAIL', e.message);
  }

  // UC 1.3: Quản lý hóa đơn / đơn hàng (Tạo POS, Cập nhật trạng thái, Hủy đơn)
  let createdOrderId = null;
  try {
    const posCode = 'POS-' + Math.floor(1000 + Math.random() * 9000);
    const createOrderRes = await request('POST', '/api/orders', {
      orderId: posCode,
      customerName: 'Khách Tại Quầy POS',
      phone: '0901234567',
      address: 'Tại quầy cửa hàng',
      paymentMethod: 'tien_mat',
      shippingFee: 0,
      items: [
        { name: 'Trà Sữa Tiramisu Mochi', price: 30000, quantity: 1, size: 'L' },
        { name: 'Hồng Trà Sữa Nướng', price: 25000, quantity: 1, size: 'M' }
      ]
    });
    if (createOrderRes.status === 201 || (createOrderRes.status === 200 && createOrderRes.body.success)) {
      createdOrderId = createOrderRes.body.orderId || posCode;
      recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3.a: Tạo hóa đơn bán hàng POS', 'PASS', `Mã: ${createdOrderId}`);
    } else {
      recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3.a: Tạo hóa đơn bán hàng POS', 'FAIL', JSON.stringify(createOrderRes.body));
    }

    if (createdOrderId) {
      // Cập nhật trạng thái hóa đơn
      const updateOrderRes = await request('PUT', `/api/orders/${createdOrderId}/status`, {
        status: 'dang_pha_che'
      });
      if (updateOrderRes.status === 200 && updateOrderRes.body.success) {
        recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3.b: Cập nhật trạng thái hóa đơn', 'PASS', 'Chuyển sang: dang_pha_che');
      } else {
        recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3.b: Cập nhật trạng thái hóa đơn', 'FAIL', JSON.stringify(updateOrderRes.body));
      }

      // Hủy đơn hàng
      const cancelOrderRes = await request('PUT', `/api/orders/${createdOrderId}/status`, {
        status: 'cancelled'
      });
      if (cancelOrderRes.status === 200 && cancelOrderRes.body.success) {
        recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3.c: Hủy đơn hàng / hóa đơn', 'PASS', 'Đã chuyển thành: da_huy');
      } else {
        recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3.c: Hủy đơn hàng / hóa đơn', 'FAIL', JSON.stringify(cancelOrderRes.body));
      }
    }
  } catch (e) {
    recordTest('Quản lý hóa đơn', 'Nhân viên', 'UC-1.3: Quản lý hóa đơn POS', 'FAIL', e.message);
  }

  // UC 1.4: Quản lý truyền thông (Đăng bài, Sửa bài, Xóa bài)
  let createdPostId = null;
  try {
    const addPostRes = await request('POST', '/api/posts', {
      tieu_de: 'Ưu đãi Giáng sinh rinh Trà sữa Đô Đô Test',
      tom_tat: 'Tặng voucher 20k cho đơn từ 2 ly',
      noi_dung: 'Nội dung chi tiết chương trình khuyến mại',
      danh_muc: 'Khuyen-Mai'
    });
    if (addPostRes.status === 201 || (addPostRes.status === 200 && addPostRes.body.success)) {
      createdPostId = addPostRes.body.postId || (addPostRes.body.data ? addPostRes.body.data.id : null);
      recordTest('Truyền thông', 'Nhân viên', 'UC-1.4.a: Đăng bài viết truyền thông', 'PASS', `ID: ${createdPostId}`);
    } else {
      recordTest('Truyền thông', 'Nhân viên', 'UC-1.4.a: Đăng bài viết truyền thông', 'FAIL', JSON.stringify(addPostRes.body));
    }

    if (createdPostId) {
      const editPostRes = await request('PUT', `/api/posts/${createdPostId}`, {
        tieu_de: 'Ưu đãi Đã Được Sửa',
        tom_tat: 'Tặng voucher 30k'
      });
      if (editPostRes.status === 200 && editPostRes.body.success) {
        recordTest('Truyền thông', 'Nhân viên', 'UC-1.4.b: Sửa bài viết', 'PASS');
      } else {
        recordTest('Truyền thông', 'Nhân viên', 'UC-1.4.b: Sửa bài viết', 'FAIL', JSON.stringify(editPostRes.body));
      }

      const delPostRes = await request('DELETE', `/api/posts/${createdPostId}`);
      if (delPostRes.status === 200 && delPostRes.body.success) {
        recordTest('Truyền thông', 'Nhân viên', 'UC-1.4.c: Xóa bài viết', 'PASS');
      } else {
        recordTest('Truyền thông', 'Nhân viên', 'UC-1.4.c: Xóa bài viết', 'FAIL', JSON.stringify(delPostRes.body));
      }
    }
  } catch (e) {
    recordTest('Truyền thông', 'Nhân viên', 'UC-1.4: Quản lý truyền thông CRUD', 'FAIL', e.message);
  }

  // UC 1.5: Quản lý khách hàng (Thêm, Tìm kiếm, Sửa, Xóa)
  let createdCustId = null;
  const custPhoneTest = '09' + Math.floor(10000000 + Math.random() * 90000000);
  try {
    const addCustRes = await request('POST', '/api/customers', {
      fullName: 'Lê Minh Test',
      phone: custPhoneTest,
      email: `test_${custPhoneTest}@gmail.com`,
      address: 'Số 10 Cầu Giấy, Hà Nội',
      points: 50
    });
    if (addCustRes.status === 201 || (addCustRes.status === 200 && addCustRes.body.success)) {
      createdCustId = addCustRes.body.customerId || (addCustRes.body.data ? addCustRes.body.data.id : null);
      recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.a: Thêm khách hàng', 'PASS', `ID: ${createdCustId}`);
    } else {
      recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.a: Thêm khách hàng', 'FAIL', JSON.stringify(addCustRes.body));
    }

    // Tìm kiếm khách hàng
    const searchCustRes = await request('GET', `/api/customers?search=${custPhoneTest}`);
    if (searchCustRes.status === 200 && searchCustRes.body.success) {
      recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.b: Tìm kiếm khách hàng', 'PASS', 'Tìm thấy bằng SĐT');
    } else {
      recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.b: Tìm kiếm khách hàng', 'FAIL', JSON.stringify(searchCustRes.body));
    }

    if (createdCustId) {
      const editCustRes = await request('PUT', `/api/customers/${createdCustId}`, {
        fullName: 'Lê Minh Đã Đổi Tên',
        points: 120
      });
      if (editCustRes.status === 200 && editCustRes.body.success) {
        recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.c: Cập nhật thông tin khách hàng', 'PASS');
      } else {
        recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.c: Cập nhật thông tin khách hàng', 'FAIL', JSON.stringify(editCustRes.body));
      }

      const delCustRes = await request('DELETE', `/api/customers/${createdCustId}`);
      if (delCustRes.status === 200 && delCustRes.body.success) {
        recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.d: Xóa thông tin khách hàng', 'PASS');
      } else {
        recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5.d: Xóa thông tin khách hàng', 'FAIL', JSON.stringify(delCustRes.body));
      }
    }
  } catch (e) {
    recordTest('Quản lý khách hàng', 'Nhân viên', 'UC-1.5: Quản lý khách hàng CRUD', 'FAIL', e.message);
  }

  // =========================================================================
  // 3. KIỂM THỬ TÁC NHÂN: KHÁCH HÀNG (CUSTOMER)
  // =========================================================================
  console.log('\n--- 🛍️ 3. TÁC NHÂN: KHÁCH HÀNG (CUSTOMER) ---');

  // UC 3.1: Tài khoản Khách hàng (Đăng ký, Đăng nhập, Đổi mật khẩu)
  const testPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
  const testCustUsername = 'cust_' + Date.now();
  let customerId = null;

  try {
    // Đăng ký
    const regRes = await request('POST', '/api/auth/register', {
      username: testCustUsername,
      fullName: 'Khách Hàng Thử Nghiệm',
      phone: testPhone,
      email: `${testCustUsername}@example.com`,
      password: '123'
    });
    if (regRes.status === 201 || (regRes.status === 200 && regRes.body.success)) {
      customerId = regRes.body.user ? regRes.body.user.dbId : null;
      recordTest('Tài khoản', 'Khách hàng', 'UC-3.1.a: Đăng ký tài khoản', 'PASS', `SĐT: ${testPhone}`);
    } else {
      recordTest('Tài khoản', 'Khách hàng', 'UC-3.1.a: Đăng ký tài khoản', 'FAIL', JSON.stringify(regRes.body));
    }

    // Đăng nhập
    const loginRes = await request('POST', '/api/auth/login', {
      username: testPhone,
      password: '123'
    });
    if (loginRes.status === 200 && loginRes.body.success) {
      customerToken = loginRes.body.token || 'mock-cust-token';
      recordTest('Tài khoản', 'Khách hàng', 'UC-3.1.b: Đăng nhập khách hàng', 'PASS');
    } else {
      recordTest('Tài khoản', 'Khách hàng', 'UC-3.1.b: Đăng nhập khách hàng', 'FAIL', JSON.stringify(loginRes.body));
    }
  } catch (e) {
    recordTest('Tài khoản', 'Khách hàng', 'UC-3.1: Tài khoản Khách hàng', 'FAIL', e.message);
  }

  // UC 3.2: Xem sản phẩm, Tìm kiếm & Chi tiết
  try {
    const listRes = await request('GET', '/api/products');
    if (listRes.status === 200 && listRes.body.success && listRes.body.data.length > 0) {
      const firstProd = listRes.body.data[0];
      recordTest('Xem sản phẩm', 'Khách hàng', 'UC-3.2.a: Xem danh sách sản phẩm & menu', 'PASS', `Số món: ${listRes.body.data.length}`);

      // Chi tiết sản phẩm
      const detailRes = await request('GET', `/api/products/${firstProd.id}`);
      if (detailRes.status === 200 && detailRes.body.success) {
        recordTest('Xem sản phẩm', 'Khách hàng', 'UC-3.2.b: Xem chi tiết sản phẩm', 'PASS', firstProd.name);
      } else {
        recordTest('Xem sản phẩm', 'Khách hàng', 'UC-3.2.b: Xem chi tiết sản phẩm', 'FAIL');
      }
    } else {
      recordTest('Xem sản phẩm', 'Khách hàng', 'UC-3.2.a: Xem danh sách sản phẩm', 'FAIL', JSON.stringify(listRes.body));
    }
  } catch (e) {
    recordTest('Xem sản phẩm', 'Khách hàng', 'UC-3.2: Xem sản phẩm', 'FAIL', e.message);
  }

  // UC 3.3: Quản lý giỏ hàng (Topping, Customizer)
  try {
    const toppingRes = await request('GET', '/api/toppings');
    if (toppingRes.status === 200 && toppingRes.body.success) {
      recordTest('Giỏ hàng', 'Khách hàng', 'UC-3.3: Lấy danh sách Topping & Định lượng', 'PASS', `Toppings: ${toppingRes.body.data.length}`);
    } else {
      recordTest('Giỏ hàng', 'Khách hàng', 'UC-3.3: Lấy danh sách Topping & Định lượng', 'FAIL');
    }
  } catch (e) {
    recordTest('Giỏ hàng', 'Khách hàng', 'UC-3.3: Lấy danh sách Topping', 'FAIL', e.message);
  }

  // UC 3.4 & 3.5: Đặt hàng & Thanh toán (Voucher, VietQR)
  let custOrderId = null;
  let custOrderCode = null;
  try {
    // Áp dụng voucher
    const voucherRes = await request('POST', '/api/vouchers/apply', { code: 'BANMOI10', totalAmount: 100000 });
    if (voucherRes.status === 200 && voucherRes.body.success) {
      recordTest('Thanh toán', 'Khách hàng', 'UC-3.5.a: Kiểm tra và Áp dụng Voucher', 'PASS', `Giảm: ${voucherRes.body.discountAmount || voucherRes.body.discount || '10,000'}đ`);
    } else {
      recordTest('Thanh toán', 'Khách hàng', 'UC-3.5.a: Kiểm tra và Áp dụng Voucher', 'FAIL', JSON.stringify(voucherRes.body));
    }

    // Đặt hàng online VietQR
    custOrderCode = 'TS-' + Math.floor(1000 + Math.random() * 9000);
    const orderRes = await request('POST', '/api/orders', {
      orderId: custOrderCode,
      customerName: 'Khách Hàng Thử Nghiệm',
      phone: testPhone,
      address: '123 Đường Láng, Đống Đa, Hà Nội',
      paymentMethod: 'chuyen_khoan',
      notes: 'Ít đường 50%, nhiều đá',
      items: [
        { name: 'Trà Sữa Tiramisu Mochi', price: 31000, quantity: 2, size: 'L' }
      ]
    });
    if (orderRes.status === 201 || (orderRes.status === 200 && orderRes.body.success)) {
      custOrderId = custOrderCode;
      recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.a: Tạo đơn hàng trực tuyến', 'PASS', `Mã: ${custOrderCode}`);
    } else {
      recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.a: Tạo đơn hàng trực tuyến', 'FAIL', JSON.stringify(orderRes.body));
    }

    // Gửi thông báo chuyển khoản VietQR tự động tới quầy
    const transferRes = await request('POST', '/api/notifications/transfer', {
      orderId: custOrderCode,
      customerName: 'Khách Hàng Thử Nghiệm',
      customerPhone: testPhone,
      amount: 62000,
      bankName: 'VietinBank',
      accountNumber: '0868870869',
      accountName: 'NGO MANH HIEU',
      note: `Chuyen khoan don hang ${custOrderCode}`
    });
    if (transferRes.status === 201 && transferRes.body.success) {
      recordTest('Thanh toán', 'Khách hàng', 'UC-3.5.b: Gửi xác nhận chuyển khoản VietQR', 'PASS');
    } else {
      recordTest('Thanh toán', 'Khách hàng', 'UC-3.5.b: Gửi xác nhận chuyển khoản VietQR', 'FAIL');
    }
  } catch (e) {
    recordTest('Đặt hàng & Thanh toán', 'Khách hàng', 'UC-3.4 & 3.5: Đặt hàng & VietQR', 'FAIL', e.message);
  }

  // UC 3.4.b: Nhắn tin trực tuyến với cửa hàng (Live Chat)
  try {
    const chatRes = await request('POST', '/api/messages', {
      sessionId: 'test-session-' + Date.now(),
      sender: 'customer',
      senderName: 'Khách Hàng Thử Nghiệm',
      message: 'Shop ơi tư vấn giúp em món nào best-seller hôm nay với!'
    });
    if (chatRes.status === 201 && chatRes.body.success && chatRes.body.autoReply) {
      recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.b: Nhắn tin trực tuyến (Live Chat)', 'PASS', `Bot trả lời: "${chatRes.body.autoReply.message.slice(0, 35)}..."`);
    } else {
      recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.b: Nhắn tin trực tuyến (Live Chat)', 'FAIL', JSON.stringify(chatRes.body));
    }
  } catch (e) {
    recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.b: Nhắn tin trực tuyến', 'FAIL', e.message);
  }

  // UC 3.4.c & 3.4.d: Theo dõi đơn hàng & Hủy đơn hàng
  try {
    if (custOrderCode) {
      // Theo dõi
      const trackRes = await request('GET', `/api/orders/${custOrderCode}`);
      if (trackRes.status === 200 && trackRes.body.success) {
        recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.c: Theo dõi tình trạng đơn hàng', 'PASS', `Trạng thái: ${trackRes.body.data.status}`);
      } else {
        recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.c: Theo dõi tình trạng đơn hàng', 'FAIL', JSON.stringify(trackRes.body));
      }

      // Khách hàng hủy đơn
      const cancelRes = await request('PUT', `/api/orders/${custOrderCode}/status`, {
        status: 'cancelled'
      });
      if (cancelRes.status === 200 && cancelRes.body.success) {
        recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.d: Hủy đơn hàng khi đang chuẩn bị', 'PASS');
      } else {
        recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.d: Hủy đơn hàng', 'FAIL', JSON.stringify(cancelRes.body));
      }
    }
  } catch (e) {
    recordTest('Đặt hàng', 'Khách hàng', 'UC-3.4.c-d: Theo dõi & Hủy đơn', 'FAIL', e.message);
  }

  // UC 3.6: Lịch sử mua hàng (Xem & Mua lại)
  try {
    const historyRes = await request('GET', `/api/orders/customer/${testPhone}`);
    if (historyRes.status === 200 && historyRes.body.success) {
      recordTest('Lịch sử đơn', 'Khách hàng', 'UC-3.6: Xem lịch sử mua hàng & Đặt lại', 'PASS', `Số đơn tìm thấy: ${historyRes.body.data.length}`);
    } else {
      recordTest('Lịch sử đơn', 'Khách hàng', 'UC-3.6: Xem lịch sử mua hàng', 'FAIL', JSON.stringify(historyRes.body));
    }
  } catch (e) {
    recordTest('Lịch sử đơn', 'Khách hàng', 'UC-3.6: Xem lịch sử mua hàng', 'FAIL', e.message);
  }

  // UC 3.7: Tương tác (Đánh giá & Khiếu nại)
  let createdReviewId = null;
  try {
    // Đánh giá
    const addRevRes = await request('POST', '/api/reviews', {
      san_pham_id: 1,
      ho_ten: 'Khách Hàng Thử Nghiệm',
      so_sao: 5,
      noi_dung: 'Trà sữa Tiramisu rất ngon, mochi dai dẻo chuẩn vị Đô Đô!'
    });
    if (addRevRes.status === 201 || (addRevRes.status === 200 && addRevRes.body.success)) {
      createdReviewId = addRevRes.body.reviewId || (addRevRes.body.data ? addRevRes.body.data.id : null);
      recordTest('Tương tác', 'Khách hàng', 'UC-3.7.a: Thêm đánh giá 5 sao', 'PASS', `ID: ${createdReviewId}`);
    } else {
      recordTest('Tương tác', 'Khách hàng', 'UC-3.7.a: Thêm đánh giá 5 sao', 'FAIL', JSON.stringify(addRevRes.body));
    }

    if (createdReviewId) {
      // Sửa đánh giá
      const editRevRes = await request('PUT', `/api/reviews/${createdReviewId}`, {
        so_sao: 5,
        noi_dung: 'Đã sửa: Trà sữa uống rất hợp gu, 10/10!'
      });
      if (editRevRes.status === 200 && editRevRes.body.success) {
        recordTest('Tương tác', 'Khách hàng', 'UC-3.7.b: Chỉnh sửa đánh giá', 'PASS');
      } else {
        recordTest('Tương tác', 'Khách hàng', 'UC-3.7.b: Chỉnh sửa đánh giá', 'FAIL');
      }

      // Xóa đánh giá
      const delRevRes = await request('DELETE', `/api/reviews/${createdReviewId}`);
      if (delRevRes.status === 200 && delRevRes.body.success) {
        recordTest('Tương tác', 'Khách hàng', 'UC-3.7.c: Xóa đánh giá', 'PASS');
      } else {
        recordTest('Tương tác', 'Khách hàng', 'UC-3.7.c: Xóa đánh giá', 'FAIL');
      }
    }

    // Khiếu nại
    const compRes = await request('POST', '/api/complaints', {
      orderId: custOrderCode || 'TS-1234',
      customerName: 'Khách Hàng Thử Nghiệm',
      phone: testPhone,
      category: 'chat_luong',
      content: 'Shipper đến hơi trễ 10 phút'
    });
    if (compRes.status === 201 && compRes.body.success) {
      recordTest('Tương tác', 'Khách hàng', 'UC-3.7.d: Gửi phản ánh / Khiếu nại dịch vụ', 'PASS', `ID: ${compRes.body.data.id}`);
    } else {
      recordTest('Tương tác', 'Khách hàng', 'UC-3.7.d: Gửi phản ánh / Khiếu nại dịch vụ', 'FAIL');
    }
  } catch (e) {
    recordTest('Tương tác', 'Khách hàng', 'UC-3.7: Tương tác đánh giá & khiếu nại', 'FAIL', e.message);
  }


  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ:');
  const passCount = testResults.filter(t => t.status === 'PASS').length;
  const failCount = testResults.filter(t => t.status === 'FAIL').length;
  const warnCount = testResults.filter(t => t.status === 'WARN').length;
  console.log(`✅ Thành công (PASS):  ${passCount} / ${testResults.length}`);
  console.log(`❌ Thất bại   (FAIL):  ${failCount} / ${testResults.length}`);
  console.log(`⚠️ Cảnh báo   (WARN):  ${warnCount} / ${testResults.length}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    console.log('Chi tiết các lỗi cần khắc phục:');
    testResults.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`- [${t.actor}] [${t.useCase}]: ${t.details}`);
    });
  }
}

runAllTests().catch(err => console.error('Lỗi kiểm thử:', err));
