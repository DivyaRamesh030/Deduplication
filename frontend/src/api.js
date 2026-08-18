const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function uploadCsv(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  // Use XHR so we can report upload progress on large files.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/api/upload`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          reject(new Error(body.detail || `Upload failed (${xhr.status})`));
        }
      } catch (e) {
        reject(new Error('Unexpected response from server.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading. Is the backend running?'));
    xhr.send(formData);
  });
}

export async function listDatasets() {
  const res = await fetch(`${BASE_URL}/api/datasets`);
  return handleResponse(res);
}

export async function runProfile(datasetId, options = {}) {
  const res = await fetch(`${BASE_URL}/api/profile/${datasetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  return handleResponse(res);
}

export async function getProfile(datasetId) {
  const res = await fetch(`${BASE_URL}/api/profile/${datasetId}`);
  return handleResponse(res);
}
