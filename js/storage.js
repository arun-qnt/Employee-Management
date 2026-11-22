/**
 * Centralized LocalStorage Data Service
 * Collections:
 *  - users
 *  - advances
 *  - attendance
 *  - work_sheets
 *  - user_sessions
 *
 * Structured as a clean repository layer to allow seamless migration
 * to Vue 3 + Go + MariaDB + AWS S3 REST APIs in future phases.
 */

const COLLECTIONS = {
  USERS: 'users',
  ADVANCES: 'advances',
  ATTENDANCE: 'attendance',
  WORK_SHEETS: 'work_sheets',
  USER_SESSIONS: 'user_sessions'
};

/**
 * Core Required Storage Functions
 */

function getData(collection) {
  try {
    const raw = localStorage.getItem(collection);
    if (!raw) {
      return collection === COLLECTIONS.USER_SESSIONS ? null : [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading collection "${collection}" from LocalStorage:`, err);
    return collection === COLLECTIONS.USER_SESSIONS ? null : [];
  }
}

function saveData(collection, data) {
  try {
    localStorage.setItem(collection, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Error saving collection "${collection}" to LocalStorage:`, err);
    if (window.Utils) {
      Utils.showToast('LocalStorage quota exceeded or unavailable. Please remove large images.', 'error');
    }
    return false;
  }
}

function generateId(prefix = 'rec') {
  const randomPart = Math.random().toString(36).substring(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`;
}

function getEmployeeByMobile(mobile) {
  if (!mobile) return null;
  const cleaned = String(mobile).trim();
  const users = getData(COLLECTIONS.USERS);
  return users.find((u) => String(u.mobile).trim() === cleaned) || null;
}

function getCurrentUser() {
  const session = getData(COLLECTIONS.USER_SESSIONS);
  if (!session || !session.is_authenticated || !session.user_id) {
    return null;
  }
  const users = getData(COLLECTIONS.USERS);
  const user = users.find((u) => u.id === session.user_id);
  if (!user || !user.is_active) {
    return null;
  }
  return user;
}

function getTodayAttendance(userId) {
  const targetUserId = userId || (getCurrentUser() ? getCurrentUser().id : null);
  if (!targetUserId) return null;

  const todayStr = Utils.getTodayDateString();
  const records = getData(COLLECTIONS.ATTENDANCE);
  return (
    records.find(
      (rec) => rec.user_id === targetUserId && rec.attendance_date === todayStr
    ) || null
  );
}

function clearSession() {
  localStorage.removeItem(COLLECTIONS.USER_SESSIONS);
}

/**
 * Seed Demo Data ONLY when LocalStorage is empty.
 * Does not overwrite existing LocalStorage data on reload.
 */
function initializeDemoDataIfNeeded() {
  const existingUsersRaw = localStorage.getItem(COLLECTIONS.USERS);
  if (existingUsersRaw !== null) {
    try {
      const parsed = JSON.parse(existingUsersRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure other collections exist without overwriting
        if (localStorage.getItem(COLLECTIONS.ADVANCES) === null) {
          saveData(COLLECTIONS.ADVANCES, []);
        }
        if (localStorage.getItem(COLLECTIONS.ATTENDANCE) === null) {
          saveData(COLLECTIONS.ATTENDANCE, []);
        }
        if (localStorage.getItem(COLLECTIONS.WORK_SHEETS) === null) {
          saveData(COLLECTIONS.WORK_SHEETS, []);
        }
        return;
      }
    } catch (e) {
      // Proceed to seed if corrupted
    }
  }

  const nowISO = new Date().toISOString();

  const demoUsers = [
    {
      id: 'usr_demo_employee_1',
      name: 'Arun Kumar',
      mobile: '9876543210',
      role: 'Employee',
      salary: 25000,
      ot_salary: 150,
      advance_total: 0,
      access_type: 'employee',
      work_hours: 8,
      is_active: true,
      created_at: nowISO,
      updated_at: nowISO
    },
    {
      id: 'usr_demo_admin_1',
      name: 'Admin',
      mobile: '9999999999',
      password: 'Admin@123',
      role: 'Administrator',
      salary: 0,
      ot_salary: 0,
      advance_total: 0,
      access_type: 'admin',
      work_hours: 8,
      is_active: true,
      created_at: nowISO,
      updated_at: nowISO
    }
  ];

  saveData(COLLECTIONS.USERS, demoUsers);

  if (localStorage.getItem(COLLECTIONS.ADVANCES) === null) {
    saveData(COLLECTIONS.ADVANCES, []);
  }
  if (localStorage.getItem(COLLECTIONS.ATTENDANCE) === null) {
    saveData(COLLECTIONS.ATTENDANCE, []);
  }
  if (localStorage.getItem(COLLECTIONS.WORK_SHEETS) === null) {
    saveData(COLLECTIONS.WORK_SHEETS, []);
  }
}

/**
 * Higher-level StorageService methods for modular entities
 */
const StorageService = {
  COLLECTIONS,
  getData,
  saveData,
  generateId,
  getCurrentUser,
  getTodayAttendance,
  getEmployeeByMobile,
  clearSession,
  initializeDemoDataIfNeeded,

  // Session Management
  resetAllData() {
    localStorage.removeItem(COLLECTIONS.USERS);
    localStorage.removeItem(COLLECTIONS.ADVANCES);
    localStorage.removeItem(COLLECTIONS.ATTENDANCE);
    localStorage.removeItem(COLLECTIONS.WORK_SHEETS);
    localStorage.removeItem(COLLECTIONS.USER_SESSIONS);
    localStorage.clear();
    initializeDemoDataIfNeeded();
  },

  createSession(user) {
    const session = {
      user_id: user.id,
      access_type: user.access_type,
      login_time: new Date().toISOString(),
      is_authenticated: true
    };
    saveData(COLLECTIONS.USER_SESSIONS, session);
    return session;
  },

  getSession() {
    return getData(COLLECTIONS.USER_SESSIONS);
  },

  // User Operations
  getUsers() {
    return getData(COLLECTIONS.USERS);
  },

  getUserById(userId) {
    const users = this.getUsers();
    return users.find((u) => u.id === userId) || null;
  },

  saveUser(userPayload) {
    const users = this.getUsers();
    const nowISO = new Date().toISOString();

    if (userPayload.id) {
      const idx = users.findIndex((u) => u.id === userPayload.id);
      if (idx === -1) {
        throw new Error('Employee record not found.');
      }
      const duplicateMobile = users.find(
        (u) => u.mobile === userPayload.mobile && u.id !== userPayload.id
      );
      if (duplicateMobile) {
        throw new Error('Another user with this mobile number already exists.');
      }

      const updatedUser = {
        ...users[idx],
        name: userPayload.name.trim(),
        mobile: userPayload.mobile.trim(),
        role: userPayload.role.trim(),
        salary: Number(userPayload.salary) || 0,
        ot_salary: Number(userPayload.ot_salary) || 0,
        access_type: userPayload.access_type,
        work_hours: Number(userPayload.work_hours) || 8,
        is_active: Boolean(userPayload.is_active),
        updated_at: nowISO
      };

      if (updatedUser.access_type === 'admin') {
        if (userPayload.password && userPayload.password.trim()) {
          updatedUser.password = userPayload.password.trim();
        } else if (!updatedUser.password) {
          updatedUser.password = 'Admin@123';
        }
      } else {
        delete updatedUser.password;
      }

      users[idx] = updatedUser;
      saveData(COLLECTIONS.USERS, users);
      return updatedUser;
    } else {
      const duplicateMobile = users.find((u) => u.mobile === userPayload.mobile.trim());
      if (duplicateMobile) {
        throw new Error('A user with this mobile number already exists.');
      }

      const newUser = {
        id: generateId('usr'),
        name: userPayload.name.trim(),
        mobile: userPayload.mobile.trim(),
        role: userPayload.role.trim(),
        salary: Number(userPayload.salary) || 0,
        ot_salary: Number(userPayload.ot_salary) || 0,
        advance_total: 0,
        access_type: userPayload.access_type,
        work_hours: Number(userPayload.work_hours) || 8,
        is_active: Boolean(userPayload.is_active),
        created_at: nowISO,
        updated_at: nowISO
      };

      if (newUser.access_type === 'admin') {
        newUser.password = (userPayload.password || 'Admin@123').trim();
      }

      users.push(newUser);
      saveData(COLLECTIONS.USERS, users);
      return newUser;
    }
  },

  toggleUserActiveStatus(userId) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found.');

    users[idx].is_active = !users[idx].is_active;
    users[idx].updated_at = new Date().toISOString();
    saveData(COLLECTIONS.USERS, users);
    return users[idx];
  },

  // Attendance Operations
  getAllAttendance() {
    return getData(COLLECTIONS.ATTENDANCE);
  },

  createCheckIn({ userId, latitude, longitude }) {
    const existing = getTodayAttendance(userId);
    if (existing) {
      throw new Error('Attendance check-in already exists for today.');
    }

    const records = this.getAllAttendance();
    const nowISO = new Date().toISOString();
    const newRecord = {
      id: generateId('att'),
      user_id: userId,
      attendance_date: Utils.getTodayDateString(),
      check_in: nowISO,
      check_in_lat: latitude,
      check_in_long: longitude,
      check_out: '',
      check_out_lat: '',
      check_out_long: '',
      status: 'Present',
      approval_status: 'Pending',
      created_at: nowISO
    };

    records.unshift(newRecord);
    saveData(COLLECTIONS.ATTENDANCE, records);
    return newRecord;
  },

  recordCheckOut({ userId, latitude, longitude }) {
    const todayRecord = getTodayAttendance(userId);
    if (!todayRecord) {
      throw new Error('Cannot check out without an active check-in record for today.');
    }
    if (todayRecord.check_out) {
      throw new Error('You have already checked out for today.');
    }

    const records = this.getAllAttendance();
    const idx = records.findIndex((r) => r.id === todayRecord.id);
    if (idx === -1) {
      throw new Error('Attendance record could not be located.');
    }

    const nowISO = new Date().toISOString();
    records[idx] = {
      ...records[idx],
      check_out: nowISO,
      check_out_lat: latitude,
      check_out_long: longitude
    };

    saveData(COLLECTIONS.ATTENDANCE, records);
    return records[idx];
  },

  updateAttendanceApproval(attendanceId, approvalStatus) {
    const records = this.getAllAttendance();
    const idx = records.findIndex((r) => r.id === attendanceId);
    if (idx === -1) throw new Error('Attendance record not found.');

    records[idx].approval_status = approvalStatus;
    saveData(COLLECTIONS.ATTENDANCE, records);
    return records[idx];
  },

  // Work Sheets Operations
  getAllWorkSheets() {
    return getData(COLLECTIONS.WORK_SHEETS);
  },

  getWorkSheetsByUser(userId) {
    const all = this.getAllWorkSheets();
    return all.filter((w) => w.user_id === userId);
  },

  createWorkSheet({ userId, attendanceId, latitude, longitude, imageData, description }) {
    const all = this.getAllWorkSheets();
    const nowISO = new Date().toISOString();

    const entry = {
      id: generateId('wrk'),
      user_id: userId,
      attendance_id: attendanceId,
      work_date: Utils.getTodayDateString(),
      latitude,
      longitude,
      image_data: imageData,
      description: description.trim(),
      approval_status: 'Pending',
      created_at: nowISO
    };

    all.unshift(entry);
    const saved = saveData(COLLECTIONS.WORK_SHEETS, all);
    if (!saved) {
      throw new Error('Could not save work entry to LocalStorage.');
    }
    return entry;
  },

  updateWorkSheetApproval(workSheetId, approvalStatus) {
    const all = this.getAllWorkSheets();
    const idx = all.findIndex((w) => w.id === workSheetId);
    if (idx === -1) throw new Error('Work entry not found.');

    all[idx].approval_status = approvalStatus;
    saveData(COLLECTIONS.WORK_SHEETS, all);
    return all[idx];
  },

  // Advances Operations
  getAllAdvances() {
    return getData(COLLECTIONS.ADVANCES);
  },

  getAdvancesByUser(userId) {
    return this.getAllAdvances().filter((a) => a.user_id === userId);
  },

  recalculateUserAdvanceTotal(userId) {
    const advances = this.getAllAdvances();
    const total = advances
      .filter((a) => a.user_id === userId && a.is_active !== false)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const users = this.getUsers();
    const uIdx = users.findIndex((u) => u.id === userId);
    if (uIdx !== -1) {
      users[uIdx].advance_total = total;
      users[uIdx].updated_at = new Date().toISOString();
      saveData(COLLECTIONS.USERS, users);
    }
    return total;
  },

  addAdvance({ userId, date, amount }) {
    const advances = this.getAllAdvances();
    const nowISO = new Date().toISOString();

    const newAdvance = {
      id: generateId('adv'),
      user_id: userId,
      date,
      amount: Number(amount),
      is_active: true,
      created_at: nowISO
    };

    advances.unshift(newAdvance);
    saveData(COLLECTIONS.ADVANCES, advances);
    this.recalculateUserAdvanceTotal(userId);
    return newAdvance;
  },

  toggleAdvanceStatus(advanceId) {
    const advances = this.getAllAdvances();
    const idx = advances.findIndex((a) => a.id === advanceId);
    if (idx === -1) throw new Error('Advance record not found.');

    advances[idx].is_active = !advances[idx].is_active;
    saveData(COLLECTIONS.ADVANCES, advances);
    this.recalculateUserAdvanceTotal(advances[idx].user_id);
    return advances[idx];
  }
};

// Expose required functions globally
window.getData = getData;
window.saveData = saveData;
window.generateId = generateId;
window.getCurrentUser = getCurrentUser;
window.getTodayAttendance = getTodayAttendance;
window.getEmployeeByMobile = getEmployeeByMobile;
window.clearSession = clearSession;
window.StorageService = StorageService;
