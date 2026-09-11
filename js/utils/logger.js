/* ==========================================================================
   SERVER ACTIVITY AUDIT LOGGER
   Gửi thông báo thao tác thời gian thực từ trình duyệt về terminal máy chủ
   ========================================================================== */

const AuditLogger = {
  notifyServer(action, detail, customActor = null, customRole = null) {
    try {
      const user = (typeof Auth !== "undefined" && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
      let actor = customActor || (user ? user.fullName : "Khách Hàng Trực Tuyến");
      let role = customRole || (user ? (user.positionTitle || user.role).toUpperCase() : "KHÁCH HÀNG");

      const payload = { actor, role, action, detail };

      // Gửi ngầm tới endpoint máy chủ
      fetch("http://localhost:5000/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  }
};

window.AuditLogger = AuditLogger;
