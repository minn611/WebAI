/* ==========================================================================
   TEAJOY STORE - CENTRALIZED API CONFIGURATION
   Tự động xác định Base URL cho API Backend ở mọi môi trường
   ========================================================================== */
const APIConfig = {
  getBaseUrl() {
    if (typeof window !== "undefined" && window.location && (window.location.port === "5000" || window.location.origin.includes(":5000"))) {
      return "/api";
    }
    return "http://localhost:5000/api";
  },
  getUrl(path) {
    const base = this.getBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
};

window.API_BASE = APIConfig.getBaseUrl();
window.APIConfig = APIConfig;

