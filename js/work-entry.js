/**
 * Work Entry Module (Employee Screen 4)
 * Handles GPS capture, Multi-Image Camera/File Base64 compression, Work Sheet submission & history
 */

const WorkEntryModule = {
  currentLocation: null,
  currentImages: [],
  replacingImageIndex: null,

  init() {
    const captureLocBtn = document.getElementById('btn-work-capture-location');
    const cameraPickerBox = document.getElementById('work-camera-picker');
    const fileInput = document.getElementById('work-image-file');
    const addMoreImgBtn = document.getElementById('btn-work-add-more-images');
    const addMoreSampleBtn = document.getElementById('btn-work-add-sample-more');
    const removeAllImgBtn = document.getElementById('btn-work-remove-image');
    const sampleImgBtn = document.getElementById('btn-work-sample-image');
    const workForm = document.getElementById('work-entry-form');

    if (captureLocBtn) {
      captureLocBtn.addEventListener('click', () => {
        this.captureWorkLocation(false);
      });
    }

    if (cameraPickerBox && fileInput) {
      cameraPickerBox.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'btn-work-sample-image') return;
        this.replacingImageIndex = null;
        fileInput.click();
      });
    }

    if (addMoreImgBtn && fileInput) {
      addMoreImgBtn.addEventListener('click', () => {
        this.replacingImageIndex = null;
        fileInput.click();
      });
    }

    if (addMoreSampleBtn) {
      addMoreSampleBtn.addEventListener('click', () => {
        this.generateSampleFieldImage();
      });
    }

    if (removeAllImgBtn) {
      removeAllImgBtn.addEventListener('click', () => {
        this.clearImageSelection();
      });
    }

    if (sampleImgBtn) {
      sampleImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.generateSampleFieldImage();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) {
          this.handleImageFilesSelected(files);
        }
        fileInput.value = '';
      });
    }

    if (workForm) {
      workForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleWorkEntrySubmit();
      });
    }
  },

  /**
   * Renders the Work Entry screen & checks active attendance eligibility
   */
  renderWorkEntryScreen() {
    const user = StorageService.getCurrentUser();
    if (!user) return;

    const todayAttendance = StorageService.getTodayAttendance(user.id);
    const lockedBanner = document.getElementById('work-entry-locked-banner');
    const formCard = document.getElementById('work-entry-form-card');

    const isCheckedOut = todayAttendance && Boolean(todayAttendance.check_out);
    const hasActiveAttendance = todayAttendance && !isCheckedOut;

    if (!hasActiveAttendance) {
      if (lockedBanner) {
        lockedBanner.classList.remove('hidden');
        lockedBanner.innerHTML = isCheckedOut
          ? `<strong>Attendance Completed for Today:</strong> You checked out at ${Utils.formatTime(
              todayAttendance.check_out
            )}. New work submissions are disabled after check-out.`
          : `<strong>Active Check-In Required:</strong> You must check in before submitting work entries.`;
      }
      if (formCard) {
        formCard.classList.add('hidden');
      }
    } else {
      if (lockedBanner) lockedBanner.classList.add('hidden');
      if (formCard) formCard.classList.remove('hidden');
    }

    this.renderSubmittedWorkEntries(user.id);
  },

  /**
   * Captures current GPS location for the work entry
   */
  async captureWorkLocation(useFallbackCoords = false) {
    const statusBox = document.getElementById('work-location-status');
    const captureBtn = document.getElementById('btn-work-capture-location');

    if (captureBtn) captureBtn.disabled = true;
    if (statusBox) {
      statusBox.className = 'gps-status-box';
      statusBox.innerHTML = `<strong>Capturing current GPS coordinates...</strong>`;
    }

    Utils.showLoading('Capturing work site GPS location...');

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

      this.currentLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: coords.timestamp || new Date().toISOString()
      };

      if (statusBox) {
        statusBox.className = 'gps-status-box gps-success';
        statusBox.innerHTML = `
          <div><strong>Location captured successfully</strong></div>
          <div style="margin-top: 0.25rem; font-size: 0.84rem;">
            <strong>Coordinates:</strong> ${Utils.formatCoordinates(
              this.currentLocation.latitude,
              this.currentLocation.longitude
            )}
          </div>
          <div style="font-size: 0.8rem;">
            <strong>Captured At:</strong> ${Utils.formatDateTime(this.currentLocation.timestamp)}
          </div>
        `;
      }

      Utils.hideLoading();
      if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Update Current Location';
      }
      Utils.showToast('Work location captured successfully.', 'success');
    } catch (err) {
      Utils.hideLoading();
      if (captureBtn) captureBtn.disabled = false;

      if (statusBox) {
        statusBox.className = 'gps-status-box gps-error';
        statusBox.innerHTML = `
          <div style="margin-bottom: 0.5rem;">
            <strong>Location Error:</strong> ${Utils.escapeHtml(err.message)}
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-danger" id="btn-work-retry-gps">Retry GPS</button>
            <button type="button" class="btn btn-sm btn-outline" id="btn-work-fallback-gps">Use Demo GPS (Prototype Test)</button>
          </div>
        `;

        const retryBtn = document.getElementById('btn-work-retry-gps');
        const fallbackBtn = document.getElementById('btn-work-fallback-gps');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.captureWorkLocation(false));
        }
        if (fallbackBtn) {
          fallbackBtn.addEventListener('click', () => this.captureWorkLocation(true));
        }
      }

      Utils.showToast(err.message, 'error', 'GPS Error');
    }
  },

  /**
   * Processes and compresses one or more selected camera/file images to Base64
   */
  async handleImageFilesSelected(files) {
    Utils.showLoading(
      files.length > 1
        ? `Processing and compressing ${files.length} images...`
        : 'Processing and compressing image...'
    );
    try {
      const compressedList = [];
      for (const file of files) {
        const base64DataUrl = await Utils.compressImageToBase64(file);
        compressedList.push(base64DataUrl);
      }

      if (
        this.replacingImageIndex !== null &&
        this.replacingImageIndex >= 0 &&
        this.replacingImageIndex < this.currentImages.length
      ) {
        // Replace specific image (and if multiple were selected during replace, insert them)
        this.currentImages.splice(this.replacingImageIndex, 1, ...compressedList);
        this.replacingImageIndex = null;
        Utils.hideLoading();
        this.renderImagesPreviewGrid();
        Utils.showToast('Image replaced successfully.', 'success');
      } else {
        this.currentImages.push(...compressedList);
        Utils.hideLoading();
        this.renderImagesPreviewGrid();
        Utils.showToast(
          `${compressedList.length} ${
            compressedList.length === 1 ? 'photo' : 'photos'
          } attached (${this.currentImages.length} total).`,
          'success'
        );
      }
    } catch (err) {
      this.replacingImageIndex = null;
      Utils.hideLoading();
      Utils.showToast(err.message, 'error', 'Image Error');
    }
  },

  /**
   * Generates a clean timestamped canvas photo for desktop prototype testing
   * Can be clicked multiple times to attach multiple photos
   */
  generateSampleFieldImage() {
    const photoNumber = this.currentImages.length + 1;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    const palettes = [
      { bg: '#eff6ff', border: '#bfdbfe', accent: '#1e40af', tag: '#15803d' },
      { bg: '#f0fdf4', border: '#bbf7d0', accent: '#166534', tag: '#1e40af' },
      { bg: '#fefce8', border: '#fde047', accent: '#854d0e', tag: '#0369a1' },
      { bg: '#faf5ff', border: '#e9d5ff', accent: '#6b21a8', tag: '#15803d' }
    ];
    const theme = palettes[(photoNumber - 1) % palettes.length];

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`FIELD WORK PHOTO #${photoNumber}`, 42, 85);

    const user = StorageService.getCurrentUser();
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Employee: ${user ? user.name : 'Field Staff'}`, 42, 145);
    ctx.fillText(`Captured: ${Utils.formatDateTime(new Date())}`, 42, 185);

    const coordsText = this.currentLocation
      ? Utils.formatCoordinates(this.currentLocation.latitude, this.currentLocation.longitude)
      : '13.082680, 80.270718';
    ctx.fillText(`GPS Coords: ${coordsText}`, 42, 225);

    ctx.fillStyle = theme.tag;
    ctx.fillRect(42, 265, 240, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`SITE VERIFICATION #${photoNumber}`, 62, 291);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    this.currentImages.push(dataUrl);
    this.renderImagesPreviewGrid();
    Utils.showToast(`Sample field photo #${photoNumber} added (${this.currentImages.length} total).`, 'info');
  },

  /**
   * Renders the multi-image preview grid with individual Replace / Remove controls
   */
  renderImagesPreviewGrid() {
    const pickerBox = document.getElementById('work-camera-picker');
    const previewContainer = document.getElementById('work-image-preview-wrap');
    const gridEl = document.getElementById('work-images-preview-grid');
    const countBadge = document.getElementById('work-images-count-badge');
    const fileInput = document.getElementById('work-image-file');

    if (this.currentImages.length === 0) {
      if (previewContainer) previewContainer.classList.add('hidden');
      if (pickerBox) pickerBox.classList.remove('hidden');
      if (gridEl) gridEl.innerHTML = '';
      if (countBadge) countBadge.textContent = '0 Photos';
      return;
    }

    if (pickerBox) pickerBox.classList.add('hidden');
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (countBadge) {
      countBadge.textContent = `${this.currentImages.length} ${
        this.currentImages.length === 1 ? 'Photo Attached' : 'Photos Attached'
      }`;
    }

    if (!gridEl) return;

    gridEl.innerHTML = this.currentImages
      .map(
        (imgSrc, index) => `
        <div class="multi-image-card">
          <div class="multi-image-badge">Photo ${index + 1}</div>
          <img
            src="${imgSrc}"
            alt="Work Preview ${index + 1}"
            class="multi-image-thumb"
            data-preview-form-idx="${index}"
            title="Click to view full size"
          />
          <div class="multi-image-card-actions">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              data-replace-img-idx="${index}"
              title="Replace this image"
            >
              Replace
            </button>
            <button
              type="button"
              class="btn btn-danger-outline btn-sm"
              data-remove-img-idx="${index}"
              title="Remove this image"
            >
              Remove
            </button>
          </div>
        </div>
      `
      )
      .join('');

    gridEl.querySelectorAll('[data-preview-form-idx]').forEach((imgEl) => {
      imgEl.addEventListener('click', () => {
        const idx = Number(imgEl.getAttribute('data-preview-form-idx'));
        Utils.openImagePreviewModal(this.currentImages, 'Attached Work Photo', idx);
      });
    });

    gridEl.querySelectorAll('[data-replace-img-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-replace-img-idx'));
        this.replacingImageIndex = idx;
        if (fileInput) fileInput.click();
      });
    });

    gridEl.querySelectorAll('[data-remove-img-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-remove-img-idx'));
        this.currentImages.splice(idx, 1);
        this.renderImagesPreviewGrid();
        Utils.showToast('Image removed.', 'info');
      });
    });
  },

  clearImageSelection() {
    this.currentImages = [];
    this.replacingImageIndex = null;
    const fileInput = document.getElementById('work-image-file');
    if (fileInput) fileInput.value = '';
    this.renderImagesPreviewGrid();
  },

  resetWorkForm() {
    this.currentLocation = null;
    this.clearImageSelection();

    const descInput = document.getElementById('work-description-input');
    const statusBox = document.getElementById('work-location-status');
    const captureBtn = document.getElementById('btn-work-capture-location');

    if (descInput) descInput.value = '';
    if (captureBtn) captureBtn.textContent = 'Current Location';
    if (statusBox) {
      statusBox.className = 'gps-status-box';
      statusBox.innerHTML = `Click <strong>Current Location</strong> to capture your field work coordinates.`;
    }
  },

  /**
   * Validates and submits the work entry
   */
  handleWorkEntrySubmit() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      App.showLoginView();
      return;
    }

    // 1. Verify employee has an active attendance record
    const todayAttendance = StorageService.getTodayAttendance(user.id);
    if (!todayAttendance) {
      Utils.showToast('You must check in for today before submitting work entries.', 'error');
      return;
    }
    if (todayAttendance.check_out) {
      Utils.showToast('You have already checked out for today. Work submissions are closed.', 'error');
      this.renderWorkEntryScreen();
      return;
    }

    // 2. Validate location
    if (!this.currentLocation || this.currentLocation.latitude === undefined) {
      Utils.showToast('Please capture your current GPS location before submitting.', 'error', 'Location Required');
      return;
    }

    // 3. Validate images (at least 1 required)
    if (!this.currentImages || this.currentImages.length === 0) {
      Utils.showToast('Please capture or attach at least one work verification photo.', 'error', 'Image Required');
      return;
    }

    // 4. Validate work description
    const descInput = document.getElementById('work-description-input');
    const description = descInput ? descInput.value.trim() : '';
    if (!description) {
      Utils.showToast('Please provide a description of the work performed.', 'error', 'Description Required');
      if (descInput) descInput.focus();
      return;
    }

    Utils.showLoading('Saving work entry...');

    setTimeout(() => {
      try {
        StorageService.createWorkSheet({
          userId: user.id,
          attendanceId: todayAttendance.id,
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          imageData: this.currentImages.slice(),
          description
        });

        Utils.hideLoading();
        Utils.showToast(
          'Work entry submitted successfully and queued for admin approval (Status: Pending).',
          'success',
          'Work Entry Saved'
        );

        this.resetWorkForm();
        this.renderSubmittedWorkEntries(user.id);
      } catch (err) {
        Utils.hideLoading();
        Utils.showToast(err.message, 'error', 'Submission Failed');
      }
    }, 250);
  },

  /**
   * Renders previously submitted work entries below the form (supports multiple images per entry)
   */
  renderSubmittedWorkEntries(userId) {
    const listContainer = document.getElementById('employee-work-history-list');
    const countBadge = document.getElementById('employee-work-history-count');
    if (!listContainer) return;

    const entries = StorageService.getWorkSheetsByUser(userId);
    if (countBadge) {
      countBadge.textContent = `${entries.length} ${entries.length === 1 ? 'Entry' : 'Entries'}`;
    }

    if (entries.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No Work Entries Submitted Yet</div>
          <div class="empty-state-text">Your submitted field work logs and approval statuses will appear here.</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = entries
      .map((entry) => {
        const images = Utils.getEntryImages(entry);
        const thumbsHtml = images
          .map(
            (imgSrc, idx) => `
            <img
              src="${imgSrc}"
              alt="Work Photo ${idx + 1}"
              class="work-entry-thumb"
              data-entry-id="${entry.id}"
              data-img-idx="${idx}"
              title="Click to view photo ${idx + 1} of ${images.length}"
            />
          `
          )
          .join('');

        return `
          <div class="work-entry-item">
            <div class="work-entry-details">
              <div class="work-entry-top">
                <span class="work-entry-time">${Utils.formatDateTime(entry.created_at)}</span>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span class="badge badge-info">${images.length} ${
          images.length === 1 ? 'Photo' : 'Photos'
        }</span>
                  ${Utils.getApprovalBadgeHtml(entry.approval_status)}
                </div>
              </div>
              <div class="work-entry-desc">${Utils.escapeHtml(entry.description)}</div>
              <div class="work-entry-coords">
                GPS: ${Utils.formatCoordinates(entry.latitude, entry.longitude)}
              </div>
              <div class="work-entry-thumbs-row">
                ${thumbsHtml}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const entriesMap = {};
    entries.forEach((e) => {
      entriesMap[e.id] = e;
    });

    listContainer.querySelectorAll('.work-entry-thumb').forEach((img) => {
      img.addEventListener('click', () => {
        const entryId = img.getAttribute('data-entry-id');
        const idx = Number(img.getAttribute('data-img-idx')) || 0;
        const entry = entriesMap[entryId];
        if (entry) {
          Utils.openImagePreviewModal(Utils.getEntryImages(entry), entry.description, idx);
        }
      });
    });
  }
};

window.WorkEntryModule = WorkEntryModule;
