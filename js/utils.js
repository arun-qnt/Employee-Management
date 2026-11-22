/**
 * Utility Functions & UI Helpers
 * Business Timezone: Asia/Kolkata
 */

const BUSINESS_TIMEZONE = 'Asia/Kolkata';

const Utils = {
  /**
   * Returns current date in YYYY-MM-DD format in Asia/Kolkata timezone
   */
  getTodayDateString(dateObj = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(dateObj);
  },

  /**
   * Returns readable date string (e.g., 22 Nov 2026) in Asia/Kolkata
   */
  formatDate(dateInput) {
    if (!dateInput) return '—';
    let dateObj;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      dateObj = new Date(Date.UTC(y, m - 1, d, 6, 0, 0));
    } else {
      dateObj = new Date(dateInput);
    }
    if (isNaN(dateObj.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: BUSINESS_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(dateObj);
  },

  /**
   * Returns readable time string (e.g., 09:30:12 AM) in Asia/Kolkata
   */
  formatTime(dateInput) {
    if (!dateInput) return '—';
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: BUSINESS_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(dateObj);
  },

  /**
   * Returns readable date and time in Asia/Kolkata
   */
  formatDateTime(dateInput) {
    if (!dateInput) return '—';
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) return String(dateInput);
    return `${this.formatDate(dateObj)}, ${this.formatTime(dateObj)}`;
  },

  /**
   * Calculates human-readable working duration between check_in and check_out
   */
  calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '—';
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return '—';

    const diffSeconds = Math.floor((end - start) / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    if (hours === 0 && minutes === 0) {
      return `${seconds}s`;
    }
    return `${hours}h ${minutes}m`;
  },

  /**
   * Formats currency in INR
   */
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  },

  /**
   * Formats latitude and longitude coordinates
   */
  formatCoordinates(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') {
      return '—';
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return '—';
    return `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
  },

  /**
   * Escapes HTML special characters to prevent XSS
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Returns approval status badge HTML
   */
  getApprovalBadgeHtml(status) {
    const normalized = (status || 'Pending').toLowerCase();
    if (normalized === 'approved') {
      return `<span class="badge badge-approved">Approved</span>`;
    }
    if (normalized === 'rejected') {
      return `<span class="badge badge-rejected">Rejected</span>`;
    }
    return `<span class="badge badge-pending">Pending</span>`;
  },

  /**
   * Shows a toast notification
   */
  showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const defaultTitles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice'
    };

    const toastTitle = title || defaultTitles[type] || 'Notice';
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(toastTitle)}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    };
    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);
    setTimeout(removeToast, 4500);
  },

  /**
   * Shows loading indicator overlay
   */
  showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const label = document.getElementById('loading-overlay-text');
    if (label) label.textContent = text;
    if (overlay) overlay.classList.remove('hidden');
  },

  /**
   * Hides loading indicator overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  /**
   * Displays a custom confirmation modal and returns a Promise<boolean>
   */
  confirmDialog({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false
  }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const confirmBtn = document.getElementById('confirm-modal-accept');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const closeBtn = document.getElementById('confirm-modal-close');

      if (!modal || !confirmBtn || !cancelBtn) {
        resolve(window.confirm(message));
        return;
      }

      titleEl.textContent = title;
      msgEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;
      confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

      modal.classList.remove('hidden');

      const cleanup = (result) => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        resolve(result);
      };

      const onConfirm = () => cleanup(true);
      const onCancel = () => cleanup(false);

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
    });
  },

  /**
   * Normalizes image_data from a work entry (supports single Base64 string or Array of Base64 strings)
   */
  getEntryImages(entryOrData) {
    if (!entryOrData) return [];
    const raw =
      typeof entryOrData === 'object' && !Array.isArray(entryOrData)
        ? entryOrData.images || entryOrData.image_data
        : entryOrData;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter((item) => typeof item === 'string' && item.trim() !== '');
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
      return [raw];
    }
    return [];
  },

  /**
   * Opens full-size image preview modal (supports single image or multiple images gallery)
   */
  openImagePreviewModal(imagesInput, caption = 'Work Entry Image', startIndex = 0) {
    const modal = document.getElementById('image-modal');
    const imgEl = document.getElementById('image-modal-img');
    const titleEl = document.getElementById('image-modal-title');
    const counterEl = document.getElementById('image-modal-counter');
    const prevBtn = document.getElementById('image-modal-prev');
    const nextBtn = document.getElementById('image-modal-next');
    const thumbsEl = document.getElementById('image-modal-thumbs');

    if (!modal || !imgEl) return;

    const images = this.getEntryImages(imagesInput);
    if (images.length === 0) return;

    let currentIndex = Math.max(0, Math.min(startIndex, images.length - 1));

    const renderSlide = () => {
      imgEl.src = images[currentIndex];
      if (titleEl) {
        titleEl.textContent =
          images.length > 1
            ? `${caption} (${currentIndex + 1} of ${images.length})`
            : caption;
      }
      if (counterEl) {
        if (images.length > 1) {
          counterEl.textContent = `Photo ${currentIndex + 1} of ${images.length}`;
          counterEl.classList.remove('hidden');
        } else {
          counterEl.classList.add('hidden');
        }
      }
      if (prevBtn && nextBtn) {
        if (images.length > 1) {
          prevBtn.classList.remove('hidden');
          nextBtn.classList.remove('hidden');
          prevBtn.disabled = currentIndex === 0;
          nextBtn.disabled = currentIndex === images.length - 1;
        } else {
          prevBtn.classList.add('hidden');
          nextBtn.classList.add('hidden');
        }
      }
      if (thumbsEl) {
        if (images.length > 1) {
          thumbsEl.classList.remove('hidden');
          thumbsEl.innerHTML = images
            .map(
              (src, idx) => `
              <img
                src="${src}"
                alt="Photo ${idx + 1}"
                class="modal-gallery-thumb ${idx === currentIndex ? 'active' : ''}"
                data-gallery-idx="${idx}"
              />
            `
            )
            .join('');
          thumbsEl.querySelectorAll('[data-gallery-idx]').forEach((thumb) => {
            thumb.addEventListener('click', () => {
              currentIndex = Number(thumb.getAttribute('data-gallery-idx'));
              renderSlide();
            });
          });
        } else {
          thumbsEl.classList.add('hidden');
          thumbsEl.innerHTML = '';
        }
      }
    };

    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderSlide();
        }
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentIndex < images.length - 1) {
          currentIndex++;
          renderSlide();
        }
      };
    }

    renderSlide();
    modal.classList.remove('hidden');
  },

  /**
   * Requests current GPS coordinates via Browser Geolocation API
   */
  getCurrentGPSLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation API is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (err) => {
          let errorMessage = 'Unable to retrieve your location. Please check GPS settings and retry.';
          if (err.code === 1) {
            errorMessage = 'Location permission was denied. Please allow location access in your browser settings and try again.';
          } else if (err.code === 2) {
            errorMessage = 'GPS position is currently unavailable. Please ensure location services are enabled on your device.';
          } else if (err.code === 3) {
            errorMessage = 'Location request timed out. Please move to an area with better reception and retry.';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  },

  /**
   * Compresses an image File into a Base64 Data URL suitable for LocalStorage persistence
   */
  compressImageToBase64(file, maxWidth = 800, maxHeight = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to decode the selected image file.'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read the selected file.'));
      reader.readAsDataURL(file);
    });
  }
};

window.Utils = Utils;
