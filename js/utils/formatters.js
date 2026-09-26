/* ==========================================================================
   TEAJOY STORE - UTILITY FORMATTERS
   ========================================================================== */

const Formatters = {
  // Format Vietnamese Currency: 35000 -> "35.000 ₫"
  currency(amount) {
    if (isNaN(amount)) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount).replace("VND", "₫").trim();
  },

  // Format Date: "2026-09-01 10:15:30" -> "10:15 - 01/09/2026"
  dateTime(dateStr) {
    if (!dateStr) return "";
    const cleanStr = String(dateStr).replace(" ", "T");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${mins} - ${day}/${month}/${year}`;
  },

  // Generate Unique Order ID: TS-XXXX
  generateOrderId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `TS-${randomNum}`;
  },

  // Order Status Label & HTML Badge
  orderStatusBadge(status) {
    const map = {
      pending: { label: "Chờ xác nhận", class: "badge-warning" },
      confirmed: { label: "Đã xác nhận", class: "badge-info" },
      preparing: { label: "Đang chuẩn bị", class: "badge-purple" },
      shipping: { label: "Đang giao", class: "badge-primary" },
      completed: { label: "Đã giao thành công", class: "badge-success" },
      cancelled: { label: "Đã hủy", class: "badge-danger" }
    };

    const target = map[status] || { label: status, class: "badge-secondary" };
    return `<span class="badge ${target.class}">${target.label}</span>`;
  },

  // Payment Method Name
  paymentMethodName(method) {
    const map = {
      vietqr: "Chuyển khoản VietQR",
      momo: "Ví điện tử MoMo",
      cod: "Tiền mặt khi nhận hàng (COD)"
    };
    return map[method] || method;
  },

  // ==========================================================================
  // 📱 XÁC THỰC VÀ GIỚI HẠN NHẬP SỐ ĐIỆN THOẠI VIỆT NAM
  // ==========================================================================

  // Chuẩn số điện thoại di động Việt Nam: 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09
  // (hoặc định dạng quốc tế +84...)
  isValidPhone(phone) {
    if (!phone) return false;
    const cleanPhone = String(phone).trim().replace(/\s+/g, '');
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    return phoneRegex.test(cleanPhone);
  },

  // Làm sạch chuỗi: chỉ giữ lại chữ số 0-9, tối đa 10 chữ số
  cleanPhone(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D/g, "").slice(0, 10);
  },

  // Gắn bộ lọc trực tiếp vào ô input: Chặn hoàn toàn ký tự lạ, giới hạn đúng 10 số
  attachPhoneInputFilter(inputEl, feedbackEl = null) {
    if (!inputEl) return;
    inputEl.setAttribute("maxlength", "10");
    inputEl.setAttribute("inputmode", "numeric");
    inputEl.setAttribute("pattern", "[0-9]*");

    // Chặn phím không phải là số khi gõ
    inputEl.addEventListener("keypress", function(e) {
      if (e.key && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey && e.key !== "Enter" && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Tab") {
        e.preventDefault();
      }
    });

    // Lọc dữ liệu khi paste hoặc gõ nhanh trên điện thoại
    inputEl.addEventListener("input", function(e) {
      const original = e.target.value;
      let cleaned = original.replace(/\D/g, "").slice(0, 10);
      if (original !== cleaned) {
        e.target.value = cleaned;
      }

      // Đổi viền cảnh báo realtime
      if (cleaned.length === 0) {
        e.target.style.borderColor = "";
        e.target.style.boxShadow = "";
        if (feedbackEl) feedbackEl.textContent = "";
      } else if (cleaned.length < 10 || !Formatters.isValidPhone(cleaned)) {
        e.target.style.borderColor = "#EF4444";
        e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.15)";
        if (feedbackEl) {
          feedbackEl.style.color = "#EF4444";
          feedbackEl.style.fontSize = "0.75rem";
          feedbackEl.style.marginTop = "0.25rem";
          feedbackEl.textContent = !cleaned.startsWith("0") 
            ? "Số điện thoại phải bắt đầu bằng số 0" 
            : "Số điện thoại phải gồm 10 số (03, 05, 07, 08, 09...)";
        }
      } else {
        e.target.style.borderColor = "#10B981";
        e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.15)";
        if (feedbackEl) {
          feedbackEl.style.color = "#10B981";
          feedbackEl.style.fontSize = "0.75rem";
          feedbackEl.style.marginTop = "0.25rem";
          feedbackEl.textContent = "✓ Số điện thoại hợp lệ";
        }
      }
    });
  }
};

// Tự động gắn bộ lọc kiểm soát số điện thoại cho tất cả các input type="tel" khi trang tải
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    const phoneInputs = document.querySelectorAll('input[type="tel"], input[id*="phone"], input[name*="phone"]');
    phoneInputs.forEach(input => {
      Formatters.attachPhoneInputFilter(input);
    });
  });
}
