/**
 * Authentication Module
 * Handles single login screen for both Employee and Admin access_type
 */

const AuthModule = {
  init() {
    const loginForm = document.getElementById('login-form');
    const mobileInput = document.getElementById('login-mobile');
    const passwordGroup = document.getElementById('login-password-group');
    const passwordInput = document.getElementById('login-password');
    const accessBanner = document.getElementById('login-access-indicator');
    const errorBox = document.getElementById('login-error-alert');

    const demoEmpBtn = document.getElementById('demo-fill-employee');
    const demoAdminBtn = document.getElementById('demo-fill-admin');

    if (mobileInput) {
      mobileInput.addEventListener('input', () => {
        this.hideLoginError();
        this.evaluateMobileAccessType(mobileInput.value);
      });
      mobileInput.addEventListener('blur', () => {
        this.evaluateMobileAccessType(mobileInput.value);
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        this.hideLoginError();
      });
    }

    if (demoEmpBtn) {
      demoEmpBtn.addEventListener('click', () => {
        if (!mobileInput) return;
        mobileInput.value = '9876543210';
        if (passwordInput) passwordInput.value = '';
        this.hideLoginError();
        this.evaluateMobileAccessType('9876543210');
        mobileInput.focus();
      });
    }

    if (demoAdminBtn) {
      demoAdminBtn.addEventListener('click', () => {
        if (!mobileInput) return;
        mobileInput.value = '9999999999';
        this.hideLoginError();
        this.evaluateMobileAccessType('9999999999');
        if (passwordInput) {
          passwordInput.value = 'Admin@123';
          passwordInput.focus();
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLoginSubmit();
      });
    }
  },

  /**
   * Checks the mobile number against LocalStorage users collection
   * Shows password field ONLY if access_type === 'admin'
   */
  evaluateMobileAccessType(rawMobile) {
    const mobile = String(rawMobile || '').trim();
    const passwordGroup = document.getElementById('login-password-group');
    const passwordInput = document.getElementById('login-password');
    const accessBanner = document.getElementById('login-access-indicator');
    const accessText = document.getElementById('login-access-text');

    if (!passwordGroup || !accessBanner) return;

    const matchedUser = StorageService.getEmployeeByMobile(mobile);

    if (matchedUser && matchedUser.access_type === 'admin') {
      passwordGroup.classList.remove('hidden');
      accessBanner.classList.remove('hidden');
      if (accessText) {
        accessText.textContent = `Admin Account (${matchedUser.name}) — Enter password to continue`;
      }
    } else if (matchedUser && matchedUser.access_type === 'employee') {
      passwordGroup.classList.add('hidden');
      if (passwordInput) passwordInput.value = '';
      accessBanner.classList.remove('hidden');
      if (accessText) {
        accessText.textContent = `Employee Account (${matchedUser.name}) — Password not required`;
      }
    } else {
      passwordGroup.classList.add('hidden');
      if (passwordInput) passwordInput.value = '';
      accessBanner.classList.add('hidden');
    }
  },

  showLoginError(msg) {
    const errorBox = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');
    if (errorBox && errorText) {
      errorText.textContent = msg;
      errorBox.classList.remove('hidden');
    } else {
      Utils.showToast(msg, 'error');
    }
  },

  hideLoginError() {
    const errorBox = document.getElementById('login-error-alert');
    if (errorBox) errorBox.classList.add('hidden');
  },

  handleLoginSubmit() {
    this.hideLoginError();

    const mobileInput = document.getElementById('login-mobile');
    const passwordGroup = document.getElementById('login-password-group');
    const passwordInput = document.getElementById('login-password');

    const mobile = mobileInput ? mobileInput.value.trim() : '';

    if (!mobile) {
      this.showLoginError('Please enter your registered mobile number.');
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      this.showLoginError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const user = StorageService.getEmployeeByMobile(mobile);

    if (!user) {
      this.showLoginError('No account found with this mobile number. Please check and try again.');
      return;
    }

    if (!user.is_active) {
      this.showLoginError('Your account is currently inactive. Access denied. Please contact the administrator.');
      return;
    }

    if (user.access_type === 'employee') {
      // Employee login: no password required
      if (passwordGroup) passwordGroup.classList.add('hidden');
      Utils.showLoading('Signing in...');
      setTimeout(() => {
        StorageService.createSession(user);
        Utils.hideLoading();
        Utils.showToast(`Welcome, ${user.name}!`, 'success', 'Logged In');
        this.resetLoginForm();
        App.routeAuthenticatedUser();
      }, 250);
      return;
    }

    if (user.access_type === 'admin') {
      // Admin login: ensure password field is visible and validated
      if (passwordGroup && passwordGroup.classList.contains('hidden')) {
        passwordGroup.classList.remove('hidden');
        if (passwordInput) passwordInput.focus();
        this.showLoginError('Administrator account detected. Please enter your password.');
        return;
      }

      const enteredPassword = passwordInput ? passwordInput.value : '';
      if (!enteredPassword) {
        this.showLoginError('Please enter the administrator password.');
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (enteredPassword !== user.password) {
        this.showLoginError('Invalid mobile number or administrator password.');
        return;
      }

      Utils.showLoading('Authenticating administrator...');
      setTimeout(() => {
        StorageService.createSession(user);
        Utils.hideLoading();
        Utils.showToast(`Signed in as ${user.name}`, 'success', 'Admin Access');
        this.resetLoginForm();
        App.routeAuthenticatedUser();
      }, 250);
    }
  },

  resetLoginForm() {
    const mobileInput = document.getElementById('login-mobile');
    const passwordInput = document.getElementById('login-password');
    const passwordGroup = document.getElementById('login-password-group');
    const accessBanner = document.getElementById('login-access-indicator');

    if (mobileInput) mobileInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (passwordGroup) passwordGroup.classList.add('hidden');
    if (accessBanner) accessBanner.classList.add('hidden');
    this.hideLoginError();
  }
};

window.AuthModule = AuthModule;
