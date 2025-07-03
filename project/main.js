class PhotoStripGenerator {
  constructor() {
    this.canvas = document.getElementById('photoStrip');
    this.ctx = this.canvas.getContext('2d');
    this.images = [null, null, null, null];
    this.frameColor = '#000000';
    this.frameGradient = null;
    this.uploadedCount = 0;
    this.currentMode = 'upload'; // 'upload' or 'camera'
    this.cameraStream = null;
    this.currentPhotoIndex = 0;
    this.colorMode = 'solid'; // 'solid' or 'gradient'
    this.currentHue = 0;
    
    // Canvas dimensions - further reduced size
    this.canvasWidth = 220;
    this.canvasHeight = 580;
    
    // Photo dimensions - further reduced proportionally
    this.photoWidth = 192;
    this.photoHeight = 111;
    
    // Spacing - further reduced proportionally
    this.topSpacing = 44;
    this.bottomSpacing = 53;
    this.photoSpacing = 13;
    this.sideSpacing = 14;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.updateUploadStatus();
    this.setupColorSelector();
  }
  
  setupEventListeners() {
    // Mode toggle listeners
    document.getElementById('uploadModeBtn').addEventListener('click', () => this.switchMode('upload'));
    document.getElementById('cameraModeBtn').addEventListener('click', () => this.switchMode('camera'));
    
    // File input listeners
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`photo${i}`);
      input.addEventListener('change', (e) => this.handleFileUpload(e, i - 1));
    }
    
    // Camera listeners
    document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
    document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
    document.getElementById('retakeBtn').addEventListener('click', () => this.retakePhoto());
    
    // Button listeners
    document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());
    document.getElementById('resetBtn').addEventListener('click', () => this.resetAll());
  }
  
  setupColorSelector() {
    // Color mode toggle
    const colorModeButtons = document.querySelectorAll('.color-mode-btn');
    colorModeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.switchColorMode(mode);
      });
    });
    
    // Color canvas and hue slider
    this.setupColorPicker();
    
    // Color input
    const colorInput = document.getElementById('colorInput');
    colorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      if (this.isValidHex(color)) {
        this.frameColor = color;
        this.updateColorPreview(color);
        this.generatePhotoStrip();
      }
    });
    
    // Preset colors
    const presetColors = document.querySelectorAll('.preset-color');
    presetColors.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        this.frameColor = color;
        this.frameGradient = null;
        this.updateColorPreview(color);
        this.updateColorInput(color);
        this.updatePresetSelection(preset);
        this.generatePhotoStrip();
      });
    });
    
    // Gradient presets
    const gradientPresets = document.querySelectorAll('.gradient-preset');
    gradientPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const gradient = preset.dataset.gradient;
        this.frameGradient = gradient;
        this.frameColor = null;
        this.updateGradientSelection(preset);
        this.generatePhotoStrip();
      });
    });
  }
  
  setupColorPicker() {
    const colorCanvas = document.getElementById('colorCanvas');
    const hueSlider = document.getElementById('hueSlider');
    const colorCursor = document.getElementById('colorCursor');
    const hueCursor = document.getElementById('hueCursor');
    
    let isDraggingColor = false;
    let isDraggingHue = false;
    
    // Color canvas events
    colorCanvas.addEventListener('mousedown', (e) => {
      isDraggingColor = true;
      this.updateColorFromCanvas(e);
    });
    
    colorCanvas.addEventListener('mousemove', (e) => {
      if (isDraggingColor) {
        this.updateColorFromCanvas(e);
      }
    });
    
    // Hue slider events
    hueSlider.addEventListener('mousedown', (e) => {
      isDraggingHue = true;
      this.updateHueFromSlider(e);
    });
    
    hueSlider.addEventListener('mousemove', (e) => {
      if (isDraggingHue) {
        this.updateHueFromSlider(e);
      }
    });
    
    // Global mouse up
    document.addEventListener('mouseup', () => {
      isDraggingColor = false;
      isDraggingHue = false;
    });
    
    // Initialize color picker
    this.updateColorCanvas();
    this.updateHueCursor();
  }
  
  updateColorFromCanvas(e) {
    const canvas = document.getElementById('colorCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const saturation = Math.max(0, Math.min(1, x / rect.width));
    const lightness = Math.max(0, Math.min(1, 1 - (y / rect.height)));
    
    const color = this.hslToHex(this.currentHue, saturation, lightness);
    this.frameColor = color;
    this.frameGradient = null;
    
    this.updateColorCursor(x, y);
    this.updateColorPreview(color);
    this.updateColorInput(color);
    this.clearPresetSelections();
    this.generatePhotoStrip();
  }
  
  updateHueFromSlider(e) {
    const slider = document.getElementById('hueSlider');
    const rect = slider.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    this.currentHue = Math.max(0, Math.min(360, (y / rect.height) * 360));
    
    this.updateColorCanvas();
    this.updateHueCursor();
    
    // Update current color with new hue
    const canvas = document.getElementById('colorCanvas');
    const cursor = document.getElementById('colorCursor');
    const canvasRect = canvas.getBoundingClientRect();
    const cursorX = parseFloat(cursor.style.left) || canvasRect.width / 2;
    const cursorY = parseFloat(cursor.style.top) || canvasRect.height / 2;
    
    const saturation = cursorX / canvasRect.width;
    const lightness = 1 - (cursorY / canvasRect.height);
    
    const color = this.hslToHex(this.currentHue, saturation, lightness);
    this.frameColor = color;
    this.frameGradient = null;
    
    this.updateColorPreview(color);
    this.updateColorInput(color);
    this.clearPresetSelections();
    this.generatePhotoStrip();
  }
  
  updateColorCanvas() {
    const canvas = document.getElementById('colorCanvas');
    const hueColor = this.hslToHex(this.currentHue, 1, 0.5);
    canvas.style.background = `linear-gradient(to right, #fff, ${hueColor})`;
    canvas.style.backgroundImage = 'linear-gradient(to top, #000, transparent)';
  }
  
  updateColorCursor(x, y) {
    const cursor = document.getElementById('colorCursor');
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
  }
  
  updateHueCursor() {
    const cursor = document.getElementById('hueCursor');
    const slider = document.getElementById('hueSlider');
    const position = (this.currentHue / 360) * slider.offsetHeight;
    cursor.style.top = position + 'px';
  }
  
  updateColorPreview(color) {
    const preview = document.getElementById('colorPreview');
    preview.style.background = color;
  }
  
  updateColorInput(color) {
    const input = document.getElementById('colorInput');
    input.value = color;
  }
  
  updatePresetSelection(selectedPreset) {
    const presets = document.querySelectorAll('.preset-color');
    presets.forEach(preset => preset.classList.remove('active'));
    selectedPreset.classList.add('active');
    
    // Clear gradient selection
    const gradients = document.querySelectorAll('.gradient-preset');
    gradients.forEach(gradient => gradient.classList.remove('active'));
  }
  
  updateGradientSelection(selectedGradient) {
    const gradients = document.querySelectorAll('.gradient-preset');
    gradients.forEach(gradient => gradient.classList.remove('active'));
    selectedGradient.classList.add('active');
    
    // Clear preset selection
    const presets = document.querySelectorAll('.preset-color');
    presets.forEach(preset => preset.classList.remove('active'));
  }
  
  clearPresetSelections() {
    const presets = document.querySelectorAll('.preset-color');
    presets.forEach(preset => preset.classList.remove('active'));
    
    const gradients = document.querySelectorAll('.gradient-preset');
    gradients.forEach(gradient => gradient.classList.remove('active'));
  }
  
  switchColorMode(mode) {
    this.colorMode = mode;
    
    // Update button states
    const buttons = document.querySelectorAll('.color-mode-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide mode content
    document.getElementById('solidMode').classList.toggle('hidden', mode !== 'solid');
    document.getElementById('gradientMode').classList.toggle('hidden', mode !== 'gradient');
  }
  
  hslToHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r, g, b;
    
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }
  
  switchMode(mode) {
    this.currentMode = mode;
    
    // Update button states
    document.getElementById('uploadModeBtn').classList.toggle('active', mode === 'upload');
    document.getElementById('cameraModeBtn').classList.toggle('active', mode === 'camera');
    
    // Show/hide mode content
    document.getElementById('uploadMode').classList.toggle('hidden', mode !== 'upload');
    document.getElementById('cameraMode').classList.toggle('hidden', mode !== 'camera');
    
    // Stop camera if switching away from camera mode
    if (mode !== 'camera' && this.cameraStream) {
      this.stopCamera();
    }
    
    // Reset everything when switching modes
    this.resetAll();
  }
  
  async startCamera() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      const video = document.getElementById('cameraVideo');
      video.srcObject = this.cameraStream;
      
      document.getElementById('startCameraBtn').classList.add('hidden');
      document.getElementById('captureBtn').classList.remove('hidden');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions and try again.');
    }
  }
  
  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    
    const video = document.getElementById('cameraVideo');
    video.srcObject = null;
    
    document.getElementById('startCameraBtn').classList.remove('hidden');
    document.getElementById('captureBtn').classList.add('hidden');
    document.getElementById('retakeBtn').classList.add('hidden');
  }
  
  capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('captureCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert to image
    canvas.toBlob((blob) => {
      const img = new Image();
      img.onload = () => {
        this.images[this.currentPhotoIndex] = img;
        this.updateCameraPreview(this.currentPhotoIndex, canvas.toDataURL());
        this.currentPhotoIndex++;
        this.uploadedCount++;
        
        this.updateUploadStatus();
        this.updateCameraControls();
        
        // Check if all photos captured
        if (this.currentPhotoIndex >= 4) {
          this.stopCamera();
          this.showMainContent();
          this.generatePhotoStrip();
        }
      };
      img.src = canvas.toDataURL();
    });
  }
  
  retakePhoto() {
    if (this.currentPhotoIndex > 0) {
      this.currentPhotoIndex--;
      this.uploadedCount--;
      this.images[this.currentPhotoIndex] = null;
      
      // Clear preview
      const preview = document.getElementById(`preview${this.currentPhotoIndex + 1}`);
      preview.innerHTML = '';
      preview.classList.remove('captured');
      
      this.updateUploadStatus();
      this.updateCameraControls();
    }
  }
  
  updateCameraPreview(index, dataUrl) {
    const preview = document.getElementById(`preview${index + 1}`);
    preview.innerHTML = `<img src="${dataUrl}" alt="Captured photo ${index + 1}">`;
    preview.classList.add('captured');
  }
  
  updateCameraControls() {
    const counter = document.getElementById('photoCounter');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    
    counter.textContent = this.currentPhotoIndex + 1;
    
    if (this.currentPhotoIndex >= 4) {
      captureBtn.classList.add('hidden');
    } else {
      captureBtn.classList.remove('hidden');
    }
    
    if (this.currentPhotoIndex > 0) {
      retakeBtn.classList.remove('hidden');
    } else {
      retakeBtn.classList.add('hidden');
    }
  }
  
  handleFileUpload(event, index) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // If this slot was empty, increment count
        if (this.images[index] === null) {
          this.uploadedCount++;
        }
        
        this.images[index] = img;
        this.updateButtonState(index + 1, true);
        this.updateUploadStatus();
        
        // Check if all images are uploaded
        if (this.uploadedCount === 4) {
          this.showMainContent();
          this.generatePhotoStrip();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  updateButtonState(photoNumber, loaded) {
    const label = document.querySelector(`label[for="photo${photoNumber}"]`);
    if (loaded) {
      label.classList.add('loaded');
      label.textContent = `Photo ${photoNumber} ✓`;
    } else {
      label.classList.remove('loaded');
      label.textContent = `Photo ${photoNumber}`;
    }
  }
  
  updateUploadStatus() {
    const statusElement = document.getElementById('uploadStatus');
    const modeText = this.currentMode === 'camera' ? 'photos captured' : 'photos uploaded';
    statusElement.textContent = `${this.uploadedCount} of 4 ${modeText}`;
    
    if (this.uploadedCount === 4) {
      statusElement.textContent = 'All photos ready! Generating strip...';
      statusElement.style.color = '#28a745';
      statusElement.style.fontWeight = 'bold';
    }
  }
  
  showMainContent() {
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
  }
  
  hideMainContent() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
  }
  
  getPhotoY(index) {
    return this.topSpacing + (index * (this.photoHeight + this.photoSpacing));
  }
  
  generatePhotoStrip() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw frame background
    if (this.frameGradient) {
      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
      // Parse gradient string and apply (simplified for demo)
      this.ctx.fillStyle = this.frameColor || '#000000';
    } else {
      this.ctx.fillStyle = this.frameColor || '#000000';
    }
    
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw all images
    for (let i = 0; i < 4; i++) {
      if (this.images[i]) {
        const y = this.getPhotoY(i);
        this.drawResizedImage(this.images[i], this.sideSpacing, y, this.photoWidth, this.photoHeight);
      }
    }
  }
  
  drawResizedImage(img, x, y, width, height) {
    // Calculate scaling to fit while maintaining aspect ratio
    const imgAspect = img.width / img.height;
    const targetAspect = width / height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgAspect > targetAspect) {
      // Image is wider than target - fit to height
      drawHeight = height;
      drawWidth = height * imgAspect;
      drawX = x - (drawWidth - width) / 2;
      drawY = y;
    } else {
      // Image is taller than target - fit to width
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawX = x;
      drawY = y - (drawHeight - height) / 2;
    }
    
    // Create clipping region
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
    
    // Draw the image
    this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    this.ctx.restore();
  }
  
  downloadImage() {
    // Create download link
    const link = document.createElement('a');
    link.download = `photo-strip-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
  
  resetAll() {
    // Clear images array
    this.images = [null, null, null, null];
    this.uploadedCount = 0;
    this.currentPhotoIndex = 0;
    
    // Stop camera if running
    if (this.cameraStream) {
      this.stopCamera();
    }
    
    // Reset file inputs
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`photo${i}`);
      input.value = '';
      this.updateButtonState(i, false);
    }
    
    // Reset camera previews
    for (let i = 1; i <= 4; i++) {
      const preview = document.getElementById(`preview${i}`);
      preview.innerHTML = '';
      preview.classList.remove('captured');
    }
    
    // Reset camera controls
    this.updateCameraControls();
    
    // Reset frame color
    this.frameColor = '#000000';
    this.frameGradient = null;
    this.updateColorPreview('#000000');
    this.updateColorInput('#000000');
    
    // Reset color selector
    const presets = document.querySelectorAll('.preset-color');
    presets.forEach(preset => preset.classList.remove('active'));
    const blackPreset = document.querySelector('.preset-color[data-color="#000000"]');
    if (blackPreset) {
      blackPreset.classList.add('active');
    }
    
    const gradients = document.querySelectorAll('.gradient-preset');
    gradients.forEach(gradient => gradient.classList.remove('active'));
    
    // Update status and hide main content
    this.updateUploadStatus();
    this.hideMainContent();
    
    // Reset status text styling
    const statusElement = document.getElementById('uploadStatus');
    statusElement.style.color = '#666';
    statusElement.style.fontWeight = '500';
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new PhotoStripGenerator();
});