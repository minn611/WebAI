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
      const apiBase = (typeof APIConfig !== 'undefined' && typeof APIConfig.getBaseUrl === 'function')
        ? APIConfig.getBaseUrl()
        : (window.API_BASE || (window.location.origin.includes(':5000') ? '/api' : 'http://localhost:5000/api'));

      // Gửi ngầm tới endpoint máy chủ
      fetch(`${apiBase}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  }
};

window.AuditLogger = AuditLogger;
