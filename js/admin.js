/**
 * Admin Application Module
 * Navigation sections:
 *  - Dashboard
 *  - Employees
 *  - Attendance
 *  - Work Entries
 *  - Advances
 *  - Logout
 */

const AdminModule = {
  currentTab: 'dashboard',
  empSearchQuery: '',
  attDateFilter: '',
  attSearchQuery: '',
  workSearchQuery: '',
  workStatusFilter: '',

  init() {
    // Navigation buttons
    document.querySelectorAll('[data-admin-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-admin-nav');
        if (target === 'logout') {
          this.handleAdminLogout();
        } else if (target === 'reset-storage') {
          this.handleAdminResetStorage();
        } else {
          this.switchTab(target);
        }
      });
    });

    const resetStorageBtn = document.getElementById('btn-admin-reset-storage');
    const topbarResetBtn = document.getElementById('btn-admin-topbar-reset');

    if (resetStorageBtn) {
      resetStorageBtn.addEventListener('click', () => {
        this.handleAdminResetStorage();
      });
    }

    if (topbarResetBtn) {
      topbarResetBtn.addEventListener('click', () => {
        this.handleAdminResetStorage();
      });
    }

    // Employee Management Controls
    const empSearchInput = document.getElementById('admin-emp-search');
    const addEmpBtn = document.getElementById('btn-admin-open-add-emp');
    const empForm = document.getElementById('admin-employee-form');
    const empAccessSelect = document.getElementById('emp-form-access-type');
    const closeEmpModalBtns = document.querySelectorAll('[data-close-emp-modal]');
    const closeProfileModalBtns = document.querySelectorAll('[data-close-profile-modal]');

    if (empSearchInput) {
      empSearchInput.addEventListener('input', () => {
        this.empSearchQuery = empSearchInput.value.trim().toLowerCase();
        this.renderEmployeesTable();
      });
    }

    if (addEmpBtn) {
      addEmpBtn.addEventListener('click', () => {
        this.openEmployeeFormModal(null);
      });
    }

    if (empAccessSelect) {
      empAccessSelect.addEventListener('change', () => {
        this.toggleAdminPasswordFieldInForm(empAccessSelect.value);
      });
    }

    if (empForm) {
      empForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveEmployeeForm();
      });
    }

    closeEmpModalBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById('employee-form-modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    closeProfileModalBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById('employee-view-modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    // Attendance Controls
    const attDateInput = document.getElementById('admin-att-date-filter');
    const attTodayBtn = document.getElementById('btn-admin-att-today');
    const attClearDateBtn = document.getElementById('btn-admin-att-clear-date');
    const attSearchInput = document.getElementById('admin-att-search');

    if (attDateInput) {
      attDateInput.addEventListener('change', () => {
        this.attDateFilter = attDateInput.value;
        this.renderAttendanceTable();
      });
    }

    if (attTodayBtn && attDateInput) {
      attTodayBtn.addEventListener('click', () => {
        const today = Utils.getTodayDateString();
        attDateInput.value = today;
        this.attDateFilter = today;
        this.renderAttendanceTable();
      });
    }

    if (attClearDateBtn && attDateInput) {
      attClearDateBtn.addEventListener('click', () => {
        attDateInput.value = '';
        this.attDateFilter = '';
        this.renderAttendanceTable();
      });
    }

    if (attSearchInput) {
      attSearchInput.addEventListener('input', () => {
        this.attSearchQuery = attSearchInput.value.trim().toLowerCase();
        this.renderAttendanceTable();
      });
    }

    // Work Entries Controls
    const workSearchInput = document.getElementById('admin-work-search');
    const workStatusSelect = document.getElementById('admin-work-status-filter');

    if (workSearchInput) {
      workSearchInput.addEventListener('input', () => {
        this.workSearchQuery = workSearchInput.value.trim().toLowerCase();
        this.renderWorkEntriesTable();
      });
    }

    if (workStatusSelect) {
      workStatusSelect.addEventListener('change', () => {
        this.workStatusFilter = workStatusSelect.value;
        this.renderWorkEntriesTable();
      });
    }
  },

  enterAdminPortal() {
    const user = StorageService.getCurrentUser();
    if (!user || user.access_type !== 'admin') {
      App.showLoginView();
      return;
    }

    const headerUserEl = document.getElementById('admin-topbar-user');
    if (headerUserEl) {
      headerUserEl.textContent = `${user.name} (${user.role})`;
    }

    this.switchTab(this.currentTab || 'dashboard');
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('[data-admin-nav]').forEach((btn) => {
      const target = btn.getAttribute('data-admin-nav');
      if (target === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const views = {
      dashboard: 'admin-view-dashboard',
      employees: 'admin-view-employees',
      attendance: 'admin-view-attendance',
      work: 'admin-view-work',
      advances: 'admin-view-advances'
    };

    Object.entries(views).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (key === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    if (tabName === 'dashboard') {
      this.refreshDashboardSummary();
    } else if (tabName === 'employees') {
      this.renderEmployeesTable();
    } else if (tabName === 'attendance') {
      this.renderAttendanceTable();
    } else if (tabName === 'work') {
      this.renderWorkEntriesTable();
    } else if (tabName === 'advances') {
      AdvancesModule.renderAdvancesView();
    }
  },

  /**
   * Calculates and displays all 6 summary cards on the Admin Dashboard
   */
  refreshDashboardSummary() {
    const users = StorageService.getUsers();
    const employees = users.filter((u) => u.access_type === 'employee');
    const attendance = StorageService.getAllAttendance();
    const workSheets = StorageService.getAllWorkSheets();
    const todayStr = Utils.getTodayDateString();

    const totalEmployees = employees.length;
    const todayAttendanceRecords = attendance.filter((a) => a.attendance_date === todayStr);
    const presentToday = todayAttendanceRecords.length;
    const notCheckedOut = todayAttendanceRecords.filter((a) => !a.check_out).length;
    const pendingAttendance = attendance.filter((a) => a.approval_status === 'Pending').length;
    const pendingWork = workSheets.filter((w) => w.approval_status === 'Pending').length;

    const totalAdvances = users.reduce((sum, u) => sum + (Number(u.advance_total) || 0), 0);

    const setElText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElText('stat-total-employees', totalEmployees);
    setElText('stat-present-today', presentToday);
    setElText('stat-not-checked-out', notCheckedOut);
    setElText('stat-pending-attendance', pendingAttendance);
    setElText('stat-pending-work', pendingWork);
    setElText('stat-total-advances', Utils.formatCurrency(totalAdvances));

    this.renderDashboardRecentActivity(attendance, workSheets, users);
  },

  renderDashboardRecentActivity(attendance, workSheets, users) {
    const usersMap = {};
    users.forEach((u) => {
      usersMap[u.id] = u;
    });

    const pendingAttBody = document.getElementById('admin-dash-recent-att-tbody');
    if (pendingAttBody) {
      const recentAtt = attendance.slice(0, 5);
      if (recentAtt.length === 0) {
        pendingAttBody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="empty-state" style="padding: 1.5rem;">
                <div class="empty-state-title">No Attendance Records Yet</div>
                <div class="empty-state-text">Employee check-ins will appear here.</div>
              </div>
            </td>
          </tr>
        `;
      } else {
        pendingAttBody.innerHTML = recentAtt
          .map((rec) => {
            const emp = usersMap[rec.user_id];
            return `
              <tr>
                <td><strong>${Utils.escapeHtml(emp ? emp.name : 'Unknown')}</strong></td>
                <td>${Utils.formatDate(rec.attendance_date)}</td>
                <td>${Utils.formatTime(rec.check_in)}</td>
                <td>${rec.check_out ? Utils.formatTime(rec.check_out) : '<span class="badge badge-info">On Shift</span>'}</td>
                <td>${Utils.getApprovalBadgeHtml(rec.approval_status)}</td>
              </tr>
            `;
          })
          .join('');
      }
    }

    const pendingWorkBody = document.getElementById('admin-dash-recent-work-tbody');
    if (pendingWorkBody) {
      const recentWork = workSheets.slice(0, 5);
      if (recentWork.length === 0) {
        pendingWorkBody.innerHTML = `
          <tr>
            <td colspan="4">
              <div class="empty-state" style="padding: 1.5rem;">
                <div class="empty-state-title">No Field Work Entries Yet</div>
                <div class="empty-state-text">Submitted employee work sheets will appear here.</div>
              </div>
            </td>
          </tr>
        `;
      } else {
        pendingWorkBody.innerHTML = recentWork
          .map((w) => {
            const emp = usersMap[w.user_id];
            return `
              <tr>
                <td><strong>${Utils.escapeHtml(emp ? emp.name : 'Unknown')}</strong></td>
                <td>${Utils.formatDate(w.work_date)}</td>
                <td>${Utils.escapeHtml(w.description)}</td>
                <td>${Utils.getApprovalBadgeHtml(w.approval_status)}</td>
              </tr>
            `;
          })
          .join('');
      }
    }
  },

  /**
   * Employee Management Table & Actions
   */
  renderEmployeesTable() {
    const tbody = document.getElementById('admin-employees-tbody');
    if (!tbody) return;

    const currentAdmin = StorageService.getCurrentUser();
    let users = StorageService.getUsers();

    if (this.empSearchQuery) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(this.empSearchQuery) ||
          String(u.mobile).toLowerCase().includes(this.empSearchQuery) ||
          (u.role && u.role.toLowerCase().includes(this.empSearchQuery))
      );
    }

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-title">No Matching Employees Found</div>
              <div class="empty-state-text">Try adjusting your search query or add a new employee.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users
      .map((u) => {
        const isSelf = currentAdmin && currentAdmin.id === u.id;
        return `
          <tr>
            <td>
              <strong>${Utils.escapeHtml(u.name)}</strong><br>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(
                u.role
              )}</span>
            </td>
            <td>${Utils.escapeHtml(u.mobile)}</td>
            <td>
              <span class="badge ${u.access_type === 'admin' ? 'badge-info' : 'badge-present'}">
                ${Utils.escapeHtml(u.access_type.toUpperCase())}
              </span>
            </td>
            <td>${Utils.formatCurrency(u.salary)}</td>
            <td>${Utils.formatCurrency(u.ot_salary)}/hr</td>
            <td>${Utils.formatCurrency(u.advance_total)}</td>
            <td>
              <span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">
                ${u.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button type="button" class="btn btn-sm btn-outline" data-view-emp="${u.id}">View</button>
                <button type="button" class="btn btn-sm btn-primary-soft" data-edit-emp="${u.id}">Edit</button>
                ${
                  isSelf
                    ? ''
                    : `<button type="button" class="btn btn-sm ${
                        u.is_active ? 'btn-danger-outline' : 'btn-success'
                      }" data-toggle-emp="${u.id}">
                        ${u.is_active ? 'Deactivate' : 'Activate'}
                      </button>`
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-view-emp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openEmployeeProfileModal(btn.getAttribute('data-view-emp'));
      });
    });

    tbody.querySelectorAll('[data-edit-emp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emp = StorageService.getUserById(btn.getAttribute('data-edit-emp'));
        if (emp) this.openEmployeeFormModal(emp);
      });
    });

    tbody.querySelectorAll('[data-toggle-emp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleToggleEmployeeActive(btn.getAttribute('data-toggle-emp'));
      });
    });
  },

  toggleAdminPasswordFieldInForm(accessType) {
    const pwGroup = document.getElementById('emp-form-password-group');
    const pwInput = document.getElementById('emp-form-password');
    if (!pwGroup) return;

    if (accessType === 'admin') {
      pwGroup.classList.remove('hidden');
    } else {
      pwGroup.classList.add('hidden');
      if (pwInput) pwInput.value = '';
    }
  },

  openEmployeeFormModal(employee = null) {
    const modal = document.getElementById('employee-form-modal');
    const titleEl = document.getElementById('employee-form-modal-title');
    const idInput = document.getElementById('emp-form-id');
    const nameInput = document.getElementById('emp-form-name');
    const mobileInput = document.getElementById('emp-form-mobile');
    const roleInput = document.getElementById('emp-form-role');
    const salaryInput = document.getElementById('emp-form-salary');
    const otInput = document.getElementById('emp-form-ot-salary');
    const accessInput = document.getElementById('emp-form-access-type');
    const hoursInput = document.getElementById('emp-form-work-hours');
    const activeInput = document.getElementById('emp-form-is-active');
    const pwInput = document.getElementById('emp-form-password');

    if (!modal) return;

    if (employee) {
      if (titleEl) titleEl.textContent = `Edit Employee: ${employee.name}`;
      idInput.value = employee.id;
      nameInput.value = employee.name;
      mobileInput.value = employee.mobile;
      roleInput.value = employee.role;
      salaryInput.value = employee.salary;
      otInput.value = employee.ot_salary;
      accessInput.value = employee.access_type;
      hoursInput.value = employee.work_hours;
      activeInput.value = employee.is_active ? 'true' : 'false';
      if (pwInput) pwInput.value = employee.password || '';
      this.toggleAdminPasswordFieldInForm(employee.access_type);
    } else {
      if (titleEl) titleEl.textContent = 'Add New Employee';
      idInput.value = '';
      nameInput.value = '';
      mobileInput.value = '';
      roleInput.value = 'Field Executive';
      salaryInput.value = '25000';
      otInput.value = '150';
      accessInput.value = 'employee';
      hoursInput.value = '8';
      activeInput.value = 'true';
      if (pwInput) pwInput.value = '';
      this.toggleAdminPasswordFieldInForm('employee');
    }

    modal.classList.remove('hidden');
  },

  handleSaveEmployeeForm() {
    const id = document.getElementById('emp-form-id').value.trim();
    const name = document.getElementById('emp-form-name').value.trim();
    const mobile = document.getElementById('emp-form-mobile').value.trim();
    const role = document.getElementById('emp-form-role').value.trim();
    const salary = Number(document.getElementById('emp-form-salary').value);
    const ot_salary = Number(document.getElementById('emp-form-ot-salary').value);
    const access_type = document.getElementById('emp-form-access-type').value;
    const work_hours = Number(document.getElementById('emp-form-work-hours').value);
    const is_active = document.getElementById('emp-form-is-active').value === 'true';
    const password = document.getElementById('emp-form-password').value.trim();

    if (!name) {
      Utils.showToast('Employee name is required.', 'error');
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      Utils.showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (!role) {
      Utils.showToast('Employee role is required.', 'error');
      return;
    }

    if (isNaN(salary) || salary < 0) {
      Utils.showToast('Salary must be a valid non-negative number.', 'error');
      return;
    }

    if (isNaN(ot_salary) || ot_salary < 0) {
      Utils.showToast('OT Salary must be a valid non-negative number.', 'error');
      return;
    }

    if (isNaN(work_hours) || work_hours <= 0 || work_hours > 24) {
      Utils.showToast('Working hours must be between 1 and 24.', 'error');
      return;
    }

    if (access_type === 'admin' && !id && !password) {
      Utils.showToast('Password is required when creating an admin account.', 'error');
      return;
    }

    try {
      const savedUser = StorageService.saveUser({
        id: id || null,
        name,
        mobile,
        role,
        salary,
        ot_salary,
        access_type,
        work_hours,
        is_active,
        password
      });

      const modal = document.getElementById('employee-form-modal');
      if (modal) modal.classList.add('hidden');

      Utils.showToast(
        `Employee "${savedUser.name}" ${id ? 'updated' : 'created'} successfully.`,
        'success'
      );

      this.renderEmployeesTable();
      this.refreshDashboardSummary();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async handleToggleEmployeeActive(userId) {
    const user = StorageService.getUserById(userId);
    if (!user) return;

    const actionWord = user.is_active ? 'deactivate' : 'activate';
    const confirmed = await Utils.confirmDialog({
      title: `${user.is_active ? 'Deactivate' : 'Activate'} Employee`,
      message: `Are you sure you want to ${actionWord} ${user.name} (${user.mobile})? ${
        user.is_active ? 'Inactive employees cannot log in.' : 'They will be able to log in again.'
      }`,
      confirmText: user.is_active ? 'Deactivate' : 'Activate',
      cancelText: 'Cancel',
      danger: user.is_active
    });

    if (!confirmed) return;

    try {
      const updated = StorageService.toggleUserActiveStatus(userId);
      Utils.showToast(
        `${updated.name} is now ${updated.is_active ? 'Active' : 'Inactive'}.`,
        'success'
      );
      this.renderEmployeesTable();
      this.refreshDashboardSummary();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  openEmployeeProfileModal(userId) {
    const user = StorageService.getUserById(userId);
    if (!user) return;

    const modal = document.getElementById('employee-view-modal');
    const body = document.getElementById('employee-view-modal-body');
    const title = document.getElementById('employee-view-modal-title');
    if (!modal || !body) return;

    if (title) title.textContent = `Employee Profile: ${user.name}`;

    const attCount = StorageService.getAllAttendance().filter((a) => a.user_id === user.id).length;
    const workCount = StorageService.getWorkSheetsByUser(user.id).length;

    body.innerHTML = `
      <div class="profile-readonly-grid">
        <div class="profile-field-box">
          <span class="profile-field-label">Name</span>
          <div class="profile-field-value">${Utils.escapeHtml(user.name)}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Mobile Number</span>
          <div class="profile-field-value">${Utils.escapeHtml(user.mobile)}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Role</span>
          <div class="profile-field-value">${Utils.escapeHtml(user.role)}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Access Type</span>
          <div class="profile-field-value">${Utils.escapeHtml(user.access_type.toUpperCase())}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Monthly Salary</span>
          <div class="profile-field-value">${Utils.formatCurrency(user.salary)}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">OT Salary (Per Hour)</span>
          <div class="profile-field-value">${Utils.formatCurrency(user.ot_salary)}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Working Hours</span>
          <div class="profile-field-value">${user.work_hours} Hours / Day</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Total Active Advances</span>
          <div class="profile-field-value">${Utils.formatCurrency(user.advance_total)}</div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Account Status</span>
          <div class="profile-field-value">
            <span class="badge ${user.is_active ? 'badge-active' : 'badge-inactive'}">
              ${user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div class="profile-field-box">
          <span class="profile-field-label">Activity Summary</span>
          <div class="profile-field-value">${attCount} Attendances &bull; ${workCount} Work Logs</div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  /**
   * Attendance Management Table & Approval Actions
   */
  renderAttendanceTable() {
    const tbody = document.getElementById('admin-attendance-tbody');
    if (!tbody) return;

    const usersMap = {};
    StorageService.getUsers().forEach((u) => {
      usersMap[u.id] = u;
    });

    let records = StorageService.getAllAttendance();

    if (this.attDateFilter) {
      records = records.filter((r) => r.attendance_date === this.attDateFilter);
    }

    if (this.attSearchQuery) {
      records = records.filter((r) => {
        const emp = usersMap[r.user_id];
        if (!emp) return false;
        return (
          emp.name.toLowerCase().includes(this.attSearchQuery) ||
          String(emp.mobile).toLowerCase().includes(this.attSearchQuery)
        );
      });
    }

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-title">No Attendance Records Found</div>
              <div class="empty-state-text">No employee attendance records match the current date or search filters.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records
      .map((rec) => {
        const emp = usersMap[rec.user_id];
        const empName = emp ? emp.name : 'Unknown Employee';
        const empMobile = emp ? emp.mobile : '—';
        const duration = rec.check_out
          ? Utils.calculateDuration(rec.check_in, rec.check_out)
          : 'In Progress';

        return `
          <tr>
            <td>
              <strong>${Utils.escapeHtml(empName)}</strong><br>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(
                empMobile
              )}</span>
            </td>
            <td>${Utils.formatDate(rec.attendance_date)}</td>
            <td>
              <div><strong>${Utils.formatTime(rec.check_in)}</strong></div>
              <span class="coord-chip">${Utils.formatCoordinates(
                rec.check_in_lat,
                rec.check_in_long
              )}</span>
            </td>
            <td>
              ${
                rec.check_out
                  ? `<div><strong>${Utils.formatTime(rec.check_out)}</strong></div>
                     <span class="coord-chip">${Utils.formatCoordinates(
                       rec.check_out_lat,
                       rec.check_out_long
                     )}</span>`
                  : `<span class="badge badge-info">Not Checked Out</span>`
              }
            </td>
            <td><strong>${Utils.escapeHtml(duration)}</strong></td>
            <td>${Utils.getApprovalBadgeHtml(rec.approval_status)}</td>
            <td>
              <div class="table-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-success"
                  data-att-approve="${rec.id}"
                  ${rec.approval_status === 'Approved' ? 'disabled' : ''}
                >
                  Approve
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  data-att-reject="${rec.id}"
                  ${rec.approval_status === 'Rejected' ? 'disabled' : ''}
                >
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-att-approve]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleAttendanceApproval(btn.getAttribute('data-att-approve'), 'Approved');
      });
    });

    tbody.querySelectorAll('[data-att-reject]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleAttendanceApproval(btn.getAttribute('data-att-reject'), 'Rejected');
      });
    });
  },

  handleAttendanceApproval(attendanceId, status) {
    try {
      StorageService.updateAttendanceApproval(attendanceId, status);
      Utils.showToast(`Attendance record marked as ${status}.`, 'success');
      this.renderAttendanceTable();
      this.refreshDashboardSummary();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  /**
   * Work Entry Management Table & Approval Actions
   */
  renderWorkEntriesTable() {
    const tbody = document.getElementById('admin-work-tbody');
    if (!tbody) return;

    const usersMap = {};
    StorageService.getUsers().forEach((u) => {
      usersMap[u.id] = u;
    });

    let entries = StorageService.getAllWorkSheets();

    if (this.workStatusFilter) {
      entries = entries.filter((w) => w.approval_status === this.workStatusFilter);
    }

    if (this.workSearchQuery) {
      entries = entries.filter((w) => {
        const emp = usersMap[w.user_id];
        const empMatch =
          emp &&
          (emp.name.toLowerCase().includes(this.workSearchQuery) ||
            String(emp.mobile).toLowerCase().includes(this.workSearchQuery));
        const descMatch =
          w.description && w.description.toLowerCase().includes(this.workSearchQuery);
        return empMatch || descMatch;
      });
    }

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-title">No Field Work Submissions Found</div>
              <div class="empty-state-text">Submitted employee work sheets will appear here for inspection and approval.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const entriesMap = {};
    entries.forEach((w) => {
      entriesMap[w.id] = w;
    });

    tbody.innerHTML = entries
      .map((w) => {
        const emp = usersMap[w.user_id];
        const empName = emp ? emp.name : 'Unknown Employee';
        const empMobile = emp ? emp.mobile : '—';
        const images = Utils.getEntryImages(w);

        const thumbsHtml = images
          .map(
            (imgSrc, idx) => `
            <img
              src="${imgSrc}"
              alt="Work Photo ${idx + 1}"
              class="table-thumb"
              data-admin-work-id="${w.id}"
              data-admin-img-idx="${idx}"
              title="Click to preview photo ${idx + 1} of ${images.length}"
            />
          `
          )
          .join('');

        return `
          <tr>
            <td>
              <strong>${Utils.escapeHtml(empName)}</strong><br>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(
                empMobile
              )}</span>
            </td>
            <td>
              <div>${Utils.formatDate(w.work_date)}</div>
              <span style="font-size: 0.76rem; color: var(--text-muted);">${Utils.formatTime(
                w.created_at
              )}</span>
            </td>
            <td style="max-width: 280px;">${Utils.escapeHtml(w.description)}</td>
            <td>
              <span class="coord-chip">${Utils.formatCoordinates(w.latitude, w.longitude)}</span>
            </td>
            <td>
              <div class="admin-thumbs-group">
                ${thumbsHtml}
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
                ${images.length} ${images.length === 1 ? 'photo' : 'photos'}
              </span>
            </td>
            <td>${Utils.getApprovalBadgeHtml(w.approval_status)}</td>
            <td>
              <div class="table-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-success"
                  data-work-approve="${w.id}"
                  ${w.approval_status === 'Approved' ? 'disabled' : ''}
                >
                  Approve
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  data-work-reject="${w.id}"
                  ${w.approval_status === 'Rejected' ? 'disabled' : ''}
                >
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-admin-work-id]').forEach((img) => {
      img.addEventListener('click', () => {
        const workId = img.getAttribute('data-admin-work-id');
        const idx = Number(img.getAttribute('data-admin-img-idx')) || 0;
        const w = entriesMap[workId];
        if (w) {
          const emp = usersMap[w.user_id];
          const empName = emp ? emp.name : 'Employee';
          Utils.openImagePreviewModal(
            Utils.getEntryImages(w),
            `${empName} - ${w.description}`,
            idx
          );
        }
      });
    });

    tbody.querySelectorAll('[data-work-approve]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleWorkEntryApproval(btn.getAttribute('data-work-approve'), 'Approved');
      });
    });

    tbody.querySelectorAll('[data-work-reject]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleWorkEntryApproval(btn.getAttribute('data-work-reject'), 'Rejected');
      });
    });
  },

  handleWorkEntryApproval(workId, status) {
    try {
      StorageService.updateWorkSheetApproval(workId, status);
      Utils.showToast(`Work submission marked as ${status}.`, 'success');
      this.renderWorkEntriesTable();
      this.refreshDashboardSummary();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async handleAdminResetStorage() {
    const confirmed = await Utils.confirmDialog({
      title: 'Clear LocalStorage & Reset Application',
      message:
        'This will permanently clear all added employees, attendance logs, field work entries, advances, and sessions from LocalStorage, and restore the initial demo dataset (Arun Kumar & Admin).\n\nAre you sure you want to reset the application?',
      confirmText: 'Clear LocalStorage & Reset',
      cancelText: 'Cancel',
      danger: true
    });

    if (!confirmed) return;

    Utils.showLoading('Clearing LocalStorage and resetting application...');
    setTimeout(() => {
      StorageService.resetAllData();
      this.currentTab = 'dashboard';
      this.empSearchQuery = '';
      this.attDateFilter = '';
      this.attSearchQuery = '';
      this.workSearchQuery = '';
      this.workStatusFilter = '';

      Utils.hideLoading();
      Utils.showToast(
        'All LocalStorage data has been cleared and reset to the initial demo state.',
        'success',
        'Application Reset Complete'
      );
      App.showLoginView();
    }, 300);
  },

  async handleAdminLogout() {
    const confirmed = await Utils.confirmDialog({
      title: 'Administrator Sign Out',
      message: 'Are you sure you want to log out of the administrator dashboard?',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      danger: true
    });

    if (!confirmed) return;

    StorageService.clearSession();
    Utils.showToast('Logged out of administrator portal.', 'info');
    App.showLoginView();
  }
};

window.AdminModule = AdminModule;
