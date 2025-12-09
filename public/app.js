let selectedFile = null;
let currentJobId = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loader = document.getElementById('loader');
const status = document.getElementById('status');

// Upload area click
uploadArea.addEventListener('click', () => fileInput.click());

// File selection
fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.stl')) {
    showStatus('error', 'Please select a valid STL file');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    showStatus('error', 'File size exceeds 50MB limit');
    return;
  }

  selectedFile = file;
  fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
  fileInfo.classList.add('show');
  convertBtn.disabled = false;
  downloadBtn.style.display = 'none';
  status.style.display = 'none';
}

convertBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append('stlFile', selectedFile);

  convertBtn.disabled = true;
  loader.classList.add('show');
  showStatus('processing', 'Converting your file...');

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      currentJobId = data.jobId;
      showStatus('success', 'Conversion completed successfully!');
      
      // Get job details to show expiration
      await updateJobStatus();
      
      downloadBtn.style.display = 'block';
      downloadBtn.disabled = false;
    } else {
      showStatus('error', `Conversion failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    showStatus('error', `Error: ${error.message}`);
  } finally {
    loader.classList.remove('show');
    convertBtn.disabled = false;
  }
});

downloadBtn.addEventListener('click', () => {
  if (currentJobId) {
    window.location.href = `/api/download/${currentJobId}`;
  }
});

async function updateJobStatus() {
  if (!currentJobId) return;

  try {
    const response = await fetch(`/api/job/${currentJobId}`);
    const job = await response.json();

    if (response.ok) {
      const expiresIn = formatDuration(job.expiresIn);
      const expiresInfo = document.createElement('div');
      expiresInfo.className = 'expires-info';
      expiresInfo.textContent = `⏱️ File will expire in ${expiresIn}`;
      
      // Append if not already present
      if (!status.querySelector('.expires-info')) {
        status.appendChild(expiresInfo);
      }
    }
  } catch (error) {
    console.error('Failed to fetch job status:', error);
  }
}

function showStatus(type, message) {
  status.className = `status ${type}`;
  status.textContent = message;
  status.style.display = 'block';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hours`;
}