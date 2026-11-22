/**
 * Main Application Bootstrapper & Router
 */

const App = {
  init() {
    // 1. Seed Demo Data if LocalStorage is empty
    StorageService.initializeDemoDataIfNeeded();

    // 2. Initialize Feature Modules
    AuthModule.init();
    AttendanceModule.init();
    WorkEntryModule.init();
    EmployeeModule.init();
    AdvancesModule.init();
    AdminModule.init();

    // 3. Setup Shared Modals (Image Preview Modal)
    document.querySelectorAll('[data-close-image-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById('image-modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    // 4. Route based on active session
    this.routeAuthenticatedUser();
  },

  hideAllRootViews() {
    AttendanceModule.stopLiveClock();
    const views = ['view-auth', 'view-employee-portal', 'view-admin-portal'];
    views.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  },

  showLoginView() {
    this.hideAllRootViews();
    const authView = document.getElementById('view-auth');
    if (authView) authView.classList.remove('hidden');
    AuthModule.resetLoginForm();
  },

  routeAuthenticatedUser() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      StorageService.clearSession();
      this.showLoginView();
      return;
    }

    this.hideAllRootViews();

    if (user.access_type === 'admin') {
      const adminView = document.getElementById('view-admin-portal');
      if (adminView) adminView.classList.remove('hidden');
      AdminModule.enterAdminPortal();
    } else {
      const empView = document.getElementById('view-employee-portal');
      if (empView) empView.classList.remove('hidden');
      EmployeeModule.enterEmployeePortal();
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
