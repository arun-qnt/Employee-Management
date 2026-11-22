/**
 * Employee Portal Controller
 * Manages navigation between:
 *  - Screen 1: Attendance Check-In
 *  - Screen 2: Employee Dashboard (3 primary tiles: Profile, Work Entry, Logout)
 *  - Screen 3: Read-only Employee Profile
 *  - Screen 4: Work Entry & History
 *  - Screen 5: Employee Logout (Check-out + Sign-out via AttendanceModule)
 */

const EmployeeModule = {
  init() {
    const tileProfile = document.getElementById('tile-emp-profile');
    const tileWork = document.getElementById('tile-emp-work');
    const tileLogout = document.getElementById('tile-emp-logout');

    const backFromProfileBtn = document.getElementById('btn-emp-profile-back');
    const backFromWorkBtn = document.getElementById('btn-emp-work-back');

    if (tileProfile) {
      tileProfile.addEventListener('click', () => {
        this.showProfileScreen();
      });
    }

    if (tileWork) {
      tileWork.addEventListener('click', () => {
        const user = StorageService.getCurrentUser();
        if (!user) return;
        const todayAtt = StorageService.getTodayAttendance(user.id);
        if (todayAtt && todayAtt.check_out) {
          Utils.showToast(
            'Attendance for today is already checked out. Viewing work history in read-only mode.',
            'warning',
            'Attendance Completed'
          );
        }
        this.showWorkEntryScreen();
      });
    }

    if (tileLogout) {
      tileLogout.addEventListener('click', () => {
        AttendanceModule.initiateEmployeeLogout();
      });
    }

    if (backFromProfileBtn) {
      backFromProfileBtn.addEventListener('click', () => {
        this.showDashboard();
      });
    }

    if (backFromWorkBtn) {
      backFromWorkBtn.addEventListener('click', () => {
        this.showDashboard();
      });
    }
  },

  hideAllEmployeeScreens() {
    AttendanceModule.stopLiveClock();
    const screens = [
      'emp-screen-checkin',
      'emp-screen-dashboard',
      'emp-screen-profile',
      'emp-screen-work'
    ];
    screens.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  },

  /**
   * Entry point after employee login.
   * Checks whether an attendance record exists for the current date.
   */
  enterEmployeePortal() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      App.showLoginView();
      return;
    }

    const headerUserEl = document.getElementById('emp-topbar-user');
    if (headerUserEl) {
      headerUserEl.textContent = `${user.name} (${user.role})`;
    }

    const todayAttendance = StorageService.getTodayAttendance(user.id);

    if (!todayAttendance) {
      this.showCheckInScreen(user);
    } else {
      this.showDashboard();
    }
  },

  /**
   * Screen 1: Attendance Check-In
   */
  showCheckInScreen(user) {
    this.hideAllEmployeeScreens();
    const screen = document.getElementById('emp-screen-checkin');
    if (screen) screen.classList.remove('hidden');
    AttendanceModule.renderCheckInScreen(user);
  },

  /**
   * Screen 2: Employee Dashboard
   */
  showDashboard() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      App.showLoginView();
      return;
    }

    const todayAttendance = StorageService.getTodayAttendance(user.id);
    if (!todayAttendance) {
      this.showCheckInScreen(user);
      return;
    }

    this.hideAllEmployeeScreens();
    const screen = document.getElementById('emp-screen-dashboard');
    if (screen) screen.classList.remove('hidden');

    const nameEl = document.getElementById('emp-dash-name');
    const dateEl = document.getElementById('emp-dash-date');
    const checkInEl = document.getElementById('emp-dash-checkin-time');
    const statusEl = document.getElementById('emp-dash-status');
    const completedBanner = document.getElementById('emp-completed-attendance-banner');
    const workTileSubtitle = document.getElementById('tile-emp-work-subtitle');
    const logoutTileTitle = document.getElementById('tile-emp-logout-title');
    const logoutTileSubtitle = document.getElementById('tile-emp-logout-subtitle');

    if (nameEl) nameEl.textContent = user.name;
    if (dateEl) dateEl.textContent = Utils.formatDate(todayAttendance.attendance_date);
    if (checkInEl) checkInEl.textContent = Utils.formatTime(todayAttendance.check_in);

    if (statusEl) {
      statusEl.innerHTML = `
        <span class="badge badge-present">${Utils.escapeHtml(todayAttendance.status)}</span>
        ${Utils.getApprovalBadgeHtml(todayAttendance.approval_status)}
      `;
    }

    if (todayAttendance.check_out) {
      const duration = Utils.calculateDuration(todayAttendance.check_in, todayAttendance.check_out);
      if (completedBanner) {
        completedBanner.classList.remove('hidden');
        completedBanner.innerHTML = `
          <div>
            <strong>Today's Attendance Completed</strong><br>
            Checked in at <strong>${Utils.formatTime(todayAttendance.check_in)}</strong> &bull;
            Checked out at <strong>${Utils.formatTime(todayAttendance.check_out)}</strong> &bull;
            Duration: <strong>${duration}</strong><br>
            <span style="font-size: 0.8rem;">Further work entries are locked for today (${Utils.formatDate(
              todayAttendance.attendance_date
            )}).</span>
          </div>
        `;
      }
      if (workTileSubtitle) {
        workTileSubtitle.textContent = 'View submitted history (Locked)';
      }
      if (logoutTileTitle) {
        logoutTileTitle.textContent = 'Logout';
      }
      if (logoutTileSubtitle) {
        logoutTileSubtitle.textContent = 'Checked out • Sign out';
      }
    } else {
      if (completedBanner) {
        completedBanner.classList.add('hidden');
      }
      if (workTileSubtitle) {
        workTileSubtitle.textContent = 'Log GPS, photo & field work';
      }
      if (logoutTileTitle) {
        logoutTileTitle.textContent = 'Logout';
      }
      if (logoutTileSubtitle) {
        logoutTileSubtitle.textContent = 'Check-out GPS & sign out';
      }
    }
  },

  /**
   * Screen 3: Employee Profile (Read-Only)
   */
  showProfileScreen() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      App.showLoginView();
      return;
    }

    // Ensure latest advance_total is reflected
    const freshUser = StorageService.getUserById(user.id) || user;

    this.hideAllEmployeeScreens();
    const screen = document.getElementById('emp-screen-profile');
    if (screen) screen.classList.remove('hidden');

    const grid = document.getElementById('emp-profile-readonly-grid');
    if (!grid) return;

    const fields = [
      { label: 'Employee Name', value: freshUser.name },
      { label: 'Mobile Number', value: freshUser.mobile },
      { label: 'Employee Role', value: freshUser.role },
      { label: 'Monthly Salary', value: Utils.formatCurrency(freshUser.salary) },
      { label: 'OT Salary (Per Hour)', value: Utils.formatCurrency(freshUser.ot_salary) },
      { label: 'Total Advances', value: Utils.formatCurrency(freshUser.advance_total) },
      { label: 'Access Type', value: freshUser.access_type.toUpperCase() },
      { label: 'Working Hours', value: `${freshUser.work_hours} Hours / Day` }
    ];

    grid.innerHTML = fields
      .map(
        (f) => `
        <div class="profile-field-box">
          <span class="profile-field-label">${Utils.escapeHtml(f.label)}</span>
          <div class="profile-field-value">${Utils.escapeHtml(f.value)}</div>
        </div>
      `
      )
      .join('');
  },

  /**
   * Screen 4: Work Entry
   */
  showWorkEntryScreen() {
    this.hideAllEmployeeScreens();
    const screen = document.getElementById('emp-screen-work');
    if (screen) screen.classList.remove('hidden');
    WorkEntryModule.renderWorkEntryScreen();
  }
};

window.EmployeeModule = EmployeeModule;
