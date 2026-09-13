/* ==========================================================================
   TEAJOY STORE - MODAL CONTROLLER
   ========================================================================== */

const Modal = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  confirm(message, onConfirm, title = "Xác Nhận Thao Tác") {
    let confirmBox = document.getElementById("global-confirm-modal");
    if (!confirmBox) {
      confirmBox = document.createElement("div");
      confirmBox.id = "global-confirm-modal";
      confirmBox.className = "modal-backdrop";
      confirmBox.innerHTML = `
        <div class="modal-container" style="max-width: 440px; text-align: center; padding: 1.75rem; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);">
          <div style="font-size: 2.75rem; margin-bottom: 0.5rem;">⚠️</div>
          <h4 id="global-confirm-title" style="margin-bottom: 0.5rem; font-size: 1.2rem; font-weight: 700; color: #1E293B;">${title}</h4>
          <p id="global-confirm-msg" class="text-sm text-muted" style="margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-outline" id="global-confirm-cancel" style="min-width: 110px; font-weight: 600;">Hủy Bỏ</button>
            <button type="button" class="btn btn-danger" id="global-confirm-ok" style="min-width: 130px; font-weight: 600; background: #DC2626; color: #fff;">Xác Nhận Xóa</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmBox);
    } else {
      document.getElementById("global-confirm-title").textContent = title;
      document.getElementById("global-confirm-msg").innerHTML = message;
    }

    const cancelBtn = document.getElementById("global-confirm-cancel");
    const okBtn = document.getElementById("global-confirm-ok");

    const closeConfirm = () => {
      confirmBox.classList.remove("active");
      document.body.style.overflow = "";
    };

    cancelBtn.onclick = closeConfirm;
    okBtn.onclick = () => {
      closeConfirm();
      if (typeof onConfirm === "function") onConfirm();
    };

    confirmBox.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  initGlobalListeners() {
    document.addEventListener("click", (e) => {
      // Close when clicking modal backdrop
      if (e.target.classList.contains("modal-backdrop")) {
        e.target.classList.remove("active");
        document.body.style.overflow = "";
      }
      // Close button with data-close-modal
      const closeBtn = e.target.closest("[data-close-modal]");
      if (closeBtn) {
        const modalId = closeBtn.getAttribute("data-close-modal");
        if (modalId) {
          Modal.close(modalId);
        } else {
          const parentModal = closeBtn.closest(".modal-backdrop");
          if (parentModal) {
            parentModal.classList.remove("active");
            document.body.style.overflow = "";
          }
        }
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const activeModals = document.querySelectorAll(".modal-backdrop.active");
        activeModals.forEach(m => m.classList.remove("active"));
        document.body.style.overflow = "";
      }
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Modal.initGlobalListeners();
});

window.Modal = Modal;
