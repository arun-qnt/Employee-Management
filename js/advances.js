/**
 * Advance Management Module (Admin)
 * Handles adding employee salary advances, viewing advance history,
 * and recalculating total active advances per employee.
 */

const AdvancesModule = {
  selectedFilterUserId: '',

  init() {
    const advanceForm = document.getElementById('admin-advance-form');
    const empSelect = document.getElementById('advance-employee-select');
    const historyFilter = document.getElementById('advance-history-emp-filter');
    const dateInput = document.getElementById('advance-date-input');

    if (dateInput && !dateInput.value) {
      dateInput.value = Utils.getTodayDateString();
    }

    if (empSelect) {
      empSelect.addEventListener('change', () => {
        this.updateSelectedEmployeeAdvanceSummary(empSelect.value);
      });
    }

    if (historyFilter) {
      historyFilter.addEventListener('change', () => {
        this.selectedFilterUserId = historyFilter.value;
        this.renderAdvancesTable();
      });
    }

    if (advanceForm) {
      advanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddAdvance();
      });
    }
  },

  renderAdvancesView() {
    this.populateEmployeeDropdowns();
    const dateInput = document.getElementById('advance-date-input');
    if (dateInput && !dateInput.value) {
      dateInput.value = Utils.getTodayDateString();
    }

    const empSelect = document.getElementById('advance-employee-select');
    if (empSelect) {
      this.updateSelectedEmployeeAdvanceSummary(empSelect.value);
    }

    this.renderAdvancesTable();
  },

  populateEmployeeDropdowns() {
    const users = StorageService.getUsers();
    const empSelect = document.getElementById('advance-employee-select');
    const historyFilter = document.getElementById('advance-history-emp-filter');

    // List employees (and allow selecting any active employee)
    const employees = users.filter((u) => u.access_type === 'employee');

    if (empSelect) {
      const prevVal = empSelect.value;
      empSelect.innerHTML =
        `<option value="">-- Select Employee --</option>` +
        employees
          .map(
            (emp) =>
              `<option value="${emp.id}">${Utils.escapeHtml(emp.name)} (${Utils.escapeHtml(
                emp.mobile
              )}) - Active Total: ${Utils.formatCurrency(emp.advance_total)}</option>`
          )
          .join('');

      if (prevVal && employees.some((e) => e.id === prevVal)) {
        empSelect.value = prevVal;
      } else if (employees.length === 1) {
        empSelect.value = employees[0].id;
      }
    }

    if (historyFilter) {
      const prevFilter = this.selectedFilterUserId;
      historyFilter.innerHTML =
        `<option value="">All Employees</option>` +
        employees
          .map(
            (emp) =>
              `<option value="${emp.id}">${Utils.escapeHtml(emp.name)} (${Utils.escapeHtml(
                emp.mobile
              )})</option>`
          )
          .join('');
      historyFilter.value = prevFilter;
    }
  },

  updateSelectedEmployeeAdvanceSummary(userId) {
    const summaryBox = document.getElementById('advance-selected-emp-summary');
    if (!summaryBox) return;

    if (!userId) {
      summaryBox.classList.add('hidden');
      return;
    }

    const user = StorageService.getUserById(userId);
    if (!user) {
      summaryBox.classList.add('hidden');
      return;
    }

    const activeTotal = StorageService.recalculateUserAdvanceTotal(userId);
    summaryBox.classList.remove('hidden');
    summaryBox.innerHTML = `
      <div>
        <strong>${Utils.escapeHtml(user.name)}</strong> (${Utils.escapeHtml(user.role)})<br>
        Monthly Salary: <strong>${Utils.formatCurrency(user.salary)}</strong> &bull;
        Total Active Advances: <strong>${Utils.formatCurrency(activeTotal)}</strong>
      </div>
    `;
  },

  handleAddAdvance() {
    const empSelect = document.getElementById('advance-employee-select');
    const amountInput = document.getElementById('advance-amount-input');
    const dateInput = document.getElementById('advance-date-input');

    const userId = empSelect ? empSelect.value : '';
    const amount = amountInput ? Number(amountInput.value) : 0;
    const date = dateInput ? dateInput.value : '';

    if (!userId) {
      Utils.showToast('Please select an employee.', 'error');
      return;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      Utils.showToast('Please enter a valid advance amount greater than 0.', 'error');
      if (amountInput) amountInput.focus();
      return;
    }

    if (!date) {
      Utils.showToast('Please select a date for the advance transaction.', 'error');
      return;
    }

    Utils.showLoading('Recording advance transaction...');
    setTimeout(() => {
      try {
        StorageService.addAdvance({
          userId,
          amount,
          date
        });

        const updatedUser = StorageService.getUserById(userId);
        Utils.hideLoading();
        Utils.showToast(
          `Advance of ${Utils.formatCurrency(amount)} added for ${
            updatedUser ? updatedUser.name : 'employee'
          }. Updated total advances: ${Utils.formatCurrency(
            updatedUser ? updatedUser.advance_total : amount
          )}.`,
          'success',
          'Advance Recorded'
        );

        if (amountInput) amountInput.value = '';
        this.renderAdvancesView();
        AdminModule.refreshDashboardSummary();
      } catch (err) {
        Utils.hideLoading();
        Utils.showToast(err.message, 'error');
      }
    }, 200);
  },

  renderAdvancesTable() {
    const tbody = document.getElementById('admin-advances-tbody');
    const totalEl = document.getElementById('admin-advances-filtered-total');
    if (!tbody) return;

    const usersMap = {};
    StorageService.getUsers().forEach((u) => {
      usersMap[u.id] = u;
    });

    let advances = StorageService.getAllAdvances();
    if (this.selectedFilterUserId) {
      advances = advances.filter((a) => a.user_id === this.selectedFilterUserId);
    }

    const filteredActiveSum = advances
      .filter((a) => a.is_active !== false)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    if (totalEl) {
      totalEl.textContent = `Total Active Advances: ${Utils.formatCurrency(filteredActiveSum)}`;
    }

    if (advances.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-title">No Advance Transactions Found</div>
              <div class="empty-state-text">Use the form to record an advance transaction for an employee.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = advances
      .map((adv) => {
        const emp = usersMap[adv.user_id];
        const empName = emp ? emp.name : 'Unknown Employee';
        const empMobile = emp ? emp.mobile : '—';
        const empTotal = emp ? emp.advance_total : 0;
        const isActive = adv.is_active !== false;

        return `
          <tr>
            <td>
              <strong>${Utils.escapeHtml(empName)}</strong><br>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(
                empMobile
              )}</span>
            </td>
            <td>${Utils.formatDate(adv.date)}</td>
            <td><strong>${Utils.formatCurrency(adv.amount)}</strong></td>
            <td>${Utils.formatCurrency(empTotal)}</td>
            <td>
              <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                ${isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <button
                type="button"
                class="btn btn-sm ${isActive ? 'btn-danger-outline' : 'btn-primary-soft'}"
                data-toggle-advance-id="${adv.id}"
              >
                ${isActive ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-toggle-advance-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const advId = btn.getAttribute('data-toggle-advance-id');
        this.handleToggleAdvance(advId);
      });
    });
  },

  async handleToggleAdvance(advanceId) {
    const confirmed = await Utils.confirmDialog({
      title: 'Update Advance Transaction Status',
      message:
        'Changing the active status of this advance transaction will recalculate the employee’s total active advances. Continue?',
      confirmText: 'Update Status',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const updated = StorageService.toggleAdvanceStatus(advanceId);
      const user = StorageService.getUserById(updated.user_id);
      Utils.showToast(
        `Advance transaction updated. ${user ? user.name + "'s" : 'Employee'} total active advances: ${Utils.formatCurrency(
          user ? user.advance_total : 0
        )}.`,
        'success'
      );
      this.renderAdvancesView();
      AdminModule.refreshDashboardSummary();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }
};

window.AdvancesModule = AdvancesModule;
