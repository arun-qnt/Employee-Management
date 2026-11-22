/**
 * Attendance Module
 * Handles Employee Check-In (Screen 1) and Employee Check-Out / Logout (Screen 5)
 */

const AttendanceModule = {
  clockTimer: null,

  init() {
    const checkInBtn = document.getElementById('btn-employee-checkin');
    const signOutFromCheckinBtn = document.getElementById('btn-checkin-signout');

    if (checkInBtn) {
      checkInBtn.addEventListener('click', () => {
        this.performCheckIn(false);
      });
    }

    if (signOutFromCheckinBtn) {
      signOutFromCheckinBtn.addEventListener('click', async () => {
        const confirmed = await Utils.confirmDialog({
          title: 'Cancel & Return to Login',
          message: 'Do you want to return to the login page without checking in?',
          confirmText: 'Return to Login',
          cancelText: 'Stay Here'
        });
        if (confirmed) {
          this.stopLiveClock();
          StorageService.clearSession();
          App.showLoginView();
        }
      });
    }
  },

  /**
   * Renders Screen 1: Attendance Check-In
   */
  renderCheckInScreen(user) {
    const nameEl = document.getElementById('checkin-emp-name');
    const avatarEl = document.getElementById('checkin-emp-avatar');
    const dateEl = document.getElementById('checkin-current-date');
    const timeEl = document.getElementById('checkin-current-time');
    const gpsBox = document.getElementById('checkin-gps-status');

    if (nameEl) nameEl.textContent = user.name;
    if (avatarEl) {
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials || 'EM';
    }

    const updateDateTime = () => {
      const now = new Date();
      if (dateEl) dateEl.textContent = Utils.formatDate(now);
      if (timeEl) timeEl.textContent = Utils.formatTime(now);
    };

    updateDateTime();
    this.stopLiveClock();
    this.clockTimer = setInterval(updateDateTime, 1000);

    if (gpsBox) {
      gpsBox.className = 'gps-status-box';
      gpsBox.innerHTML = `
        <strong>Location Capture Status:</strong> Ready to capture GPS location.<br>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Click "Check In Now" below to request browser GPS coordinates.</span>
      `;
    }
  },

  stopLiveClock() {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  },

  /**
   * Executes attendance check-in for the current employee
   */
  async performCheckIn(useFallbackCoords = false) {
    const user = StorageService.getCurrentUser();
    if (!user) {
      App.showLoginView();
      return;
    }

    // Prevent duplicate check-in records
    const existing = StorageService.getTodayAttendance(user.id);
    if (existing) {
      Utils.showToast('Attendance record already exists for today.', 'info');
      EmployeeModule.showDashboard();
      return;
    }

    const gpsBox = document.getElementById('checkin-gps-status');
    const checkInBtn = document.getElementById('btn-employee-checkin');

    if (checkInBtn) checkInBtn.disabled = true;
    if (gpsBox) {
      gpsBox.className = 'gps-status-box';
      gpsBox.innerHTML = `<strong>Capturing GPS Location...</strong> Please allow browser location access if prompted.`;
    }
    Utils.showLoading('Requesting browser GPS location...');

    try {
      let coords;
      if (useFallbackCoords) {
        coords = {
          latitude: 13.08268,
          longitude: 80.270718,
          timestamp: new Date().toISOString()
        };
      } else {
        coords = await Utils.getCurrentGPSLocation();
      }

      const record = StorageService.createCheckIn({
        userId: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      if (gpsBox) {
        gpsBox.className = 'gps-status-box gps-success';
        gpsBox.innerHTML = `
          <strong>Location Captured Successfully!</strong><br>
          Coordinates: ${Utils.formatCoordinates(record.check_in_lat, record.check_in_long)}<br>
          Check-In Time: ${Utils.formatTime(record.check_in)}
        `;
      }

      Utils.hideLoading();
      if (checkInBtn) checkInBtn.disabled = false;
      this.stopLiveClock();

      Utils.showToast(
        `Checked in at ${Utils.formatTime(record.check_in)} (Status: Present | Approval: Pending)`,
        'success',
        'Check-In Complete'
      );

      EmployeeModule.showDashboard();
    } catch (err) {
      Utils.hideLoading();
      if (checkInBtn) checkInBtn.disabled = false;

      if (gpsBox) {
        gpsBox.className = 'gps-status-box gps-error';
        gpsBox.innerHTML = `
          <div style="margin-bottom: 0.65rem;">
            <strong>GPS Location Error:</strong> ${Utils.escapeHtml(err.message)}
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-danger" id="btn-retry-checkin-gps">Retry GPS Capture</button>
            <button type="button" class="btn btn-sm btn-outline" id="btn-fallback-checkin-gps" title="Use simulated coordinates when testing on devices without GPS hardware">Use Demo GPS (Prototype Test)</button>
          </div>
        `;

        const retryBtn = document.getElementById('btn-retry-checkin-gps');
        const fallbackBtn = document.getElementById('btn-fallback-checkin-gps');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.performCheckIn(false));
        }
        if (fallbackBtn) {
          fallbackBtn.addEventListener('click', () => this.performCheckIn(true));
        }
      }

      Utils.showToast(err.message, 'error', 'GPS Access Failed');
    }
  },

  /**
   * Screen 5: Employee Logout (Attendance Check-Out + Sign-Out)
   */
  async initiateEmployeeLogout() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      App.showLoginView();
      return;
    }

    const todayAttendance = StorageService.getTodayAttendance(user.id);

    // If employee already checked out earlier today, confirm simple sign-out
    if (todayAttendance && todayAttendance.check_out) {
      const signOutOnly = await Utils.confirmDialog({
        title: 'Sign Out',
        message: 'Your attendance check-out for today is already completed. Do you want to sign out to the login screen?',
        confirmText: 'Sign Out',
        cancelText: 'Cancel',
        danger: true
      });

      if (signOutOnly) {
        StorageService.clearSession();
        Utils.showToast('You have been signed out.', 'info');
        App.showLoginView();
      }
      return;
    }

    // Prevent check-out without check-in
    if (!todayAttendance) {
      Utils.showToast('No active check-in found for today.', 'error');
      return;
    }

    const confirmed = await Utils.confirmDialog({
      title: 'Confirm Check-Out & Logout',
      message:
        'Logging out will capture your current GPS location, record your check-out timestamp, complete your attendance for today, and sign you out. No further work entries will be allowed today. Proceed?',
      confirmText: 'Check Out & Logout',
      cancelText: 'Stay Logged In',
      danger: true
    });

    if (!confirmed) return;

    await this.executeCheckOutAndLogout(false);
  },

  async executeCheckOutAndLogout(useFallbackCoords = false) {
    const user = StorageService.getCurrentUser();
    if (!user) return;

    Utils.showLoading('Capturing check-out GPS location...');

    try {
      let coords;
      if (useFallbackCoords) {
        coords = {
          latitude: 13.08268,
          longitude: 80.270718
        };
      } else {
        coords = await Utils.getCurrentGPSLocation();
      }

      const updatedRecord = StorageService.recordCheckOut({
        userId: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      const duration = Utils.calculateDuration(updatedRecord.check_in, updatedRecord.check_out);

      Utils.hideLoading();
      StorageService.clearSession();

      Utils.showToast(
        `Check-out recorded at ${Utils.formatTime(updatedRecord.check_out)}. Working duration: ${duration}.`,
        'success',
        'Checked Out & Signed Out'
      );

      App.showLoginView();
    } catch (err) {
      Utils.hideLoading();
      Utils.showToast(err.message, 'error', 'Check-Out GPS Error');

      const retry = await Utils.confirmDialog({
        title: 'GPS Access Required for Check-Out',
        message: `${err.message}\n\nClick "Retry GPS" to try capturing location again, or check your browser location permissions.`,
        confirmText: 'Retry GPS',
        cancelText: 'Use Demo GPS (Prototype Test)',
        danger: false
      });

      if (retry) {
        await this.executeCheckOutAndLogout(false);
      } else {
        const useDemo = await Utils.confirmDialog({
          title: 'Use Prototype Demo GPS for Check-Out?',
          message: 'Do you want to complete check-out using prototype demo coordinates (13.082680, 80.270718) or cancel check-out?',
          confirmText: 'Complete with Demo GPS',
          cancelText: 'Cancel Check-Out'
        });
        if (useDemo) {
          await this.executeCheckOutAndLogout(true);
        }
      }
    }
  }
};

window.AttendanceModule = AttendanceModule;
