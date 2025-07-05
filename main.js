document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('photoStrip');
  const ctx = canvas.getContext('2d');
  const images = [null, null, null, null];
  let uploadedCount = 0;
  let currentIndex = 0;
  let currentMode = 'upload';
  let frameColor = '#000000';
  let frameGradient = null;
  let stream = null;

  const config = {
    canvasWidth: 220,
    canvasHeight: 580,
    photoWidth: 192,
    photoHeight: 111,
    topSpacing: 44,
    bottomSpacing: 53,
    photoSpacing: 13,
    sideSpacing: 14,
  };

  function updateUploadStatus() {
    const el = document.getElementById('uploadStatus');
    el.textContent = `${uploadedCount} of 4 photos ready`;
    if (uploadedCount === 4) {
      el.textContent = `All photos ready! Generating strip...`;
      el.style.color = '#28a745';
      el.style.fontWeight = 'bold';
    }
  }

  function drawImageStrip() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
    if (frameGradient) {
      const gradient = ctx.createLinearGradient(0, 0, config.canvasWidth, config.canvasHeight);
      gradient.addColorStop(0, frameGradient.split(',')[0].split('(')[1]);
      gradient.addColorStop(1, frameGradient.split(',')[1].split(')')[0]);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = frameColor;
    }
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

    images.forEach((img, i) => {
      if (img) {
        const y = config.topSpacing + i * (config.photoHeight + config.photoSpacing);
        ctx.drawImage(img, config.sideSpacing, y, config.photoWidth, config.photoHeight);
      }
    });
  }

  function handleUpload(e, idx) {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      images[idx] = img;
      uploadedCount++;
      updateUploadStatus();
      if (uploadedCount === 4) {
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        drawImageStrip();
      }
    };
    img.src = URL.createObjectURL(file);
  }

  for (let i = 1; i <= 4; i++) {
    document.getElementById(`photo${i}`).addEventListener('change', (e) => handleUpload(e, i - 1));
  }

  document.getElementById('resetBtn').addEventListener('click', () => location.reload());

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `photo-strip-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Camera mode
  document.getElementById('startCameraBtn').addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.getElementById('cameraVideo');
      video.srcObject = stream;
      document.getElementById('startCameraBtn').classList.add('hidden');
      document.getElementById('captureBtn').classList.remove('hidden');
    } catch {
      alert('Camera access denied');
    }
  });

  document.getElementById('captureBtn').addEventListener('click', () => {
    const video = document.getElementById('cameraVideo');
    const capCanvas = document.getElementById('captureCanvas');
    const capCtx = capCanvas.getContext('2d');
    capCanvas.width = video.videoWidth;
    capCanvas.height = video.videoHeight;
    capCtx.drawImage(video, 0, 0);
    const img = new Image();
    img.onload = () => {
      images[currentIndex] = img;
      uploadedCount++;
      updateUploadStatus();
      if (uploadedCount === 4) {
        stream.getTracks().forEach(t => t.stop());
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        drawImageStrip();
      }
      currentIndex++;
      document.getElementById('photoCounter').textContent = currentIndex + 1;
    };
    img.src = capCanvas.toDataURL();
  });

  // Mode toggling
  document.getElementById('uploadModeBtn').addEventListener('click', () => {
    currentMode = 'upload';
    document.getElementById('uploadMode').classList.remove('hidden');
    document.getElementById('cameraMode').classList.add('hidden');
  });

  document.getElementById('cameraModeBtn').addEventListener('click', () => {
    currentMode = 'camera';
    document.getElementById('uploadMode').classList.add('hidden');
    document.getElementById('cameraMode').classList.remove('hidden');
  });

  // Preset color + gradient pickers
  document.querySelectorAll('.preset-color').forEach(p => {
    p.addEventListener('click', () => {
      frameColor = p.dataset.color;
      frameGradient = null;
      drawImageStrip();
    });
  });

  document.querySelectorAll('.gradient-preset').forEach(p => {
    p.addEventListener('click', () => {
      frameGradient = p.dataset.gradient;
      frameColor = null;
      drawImageStrip();
    });
  });

  updateUploadStatus();
});
