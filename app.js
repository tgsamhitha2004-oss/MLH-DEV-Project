const photoInput = document.getElementById('photo-input');
const dropzone = document.getElementById('dropzone');
const preview = document.getElementById('photo-preview');
const emptyUpload = document.getElementById('upload-empty');
const removePhotoButton = document.getElementById('remove-photo');
const issueInput = document.getElementById('issue-input');
const diagnoseButton = document.getElementById('diagnose-button');
const resultSection = document.getElementById('result-section');
const workbench = document.getElementById('workbench');
const toast = document.getElementById('toast');
let selectedPhoto = null;
let sampleMode = false;
let latestResult = null;

const sampleSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#dbe6d6"/><stop offset="1" stop-color="#bbcbb7"/></linearGradient><linearGradient id="door" x2="0" y2="1"><stop stop-color="#f4f2e8"/><stop offset="1" stop-color="#d9d8cc"/></linearGradient></defs><rect width="900" height="650" fill="url(#bg)"/><path d="M0 480h900v170H0z" fill="#9daf95"/><rect x="235" y="52" width="430" height="535" rx="18" fill="#bbbfb3" opacity=".4"/><rect x="250" y="38" width="400" height="535" rx="16" fill="url(#door)" stroke="#cbcbbb" stroke-width="8"/><rect x="275" y="62" width="350" height="70" rx="8" fill="#eceade"/><rect x="294" y="78" width="96" height="38" rx="5" fill="#25473f"/><text x="307" y="104" fill="#d7efaa" font-family="Arial" font-size="18" font-weight="700">E:04</text><circle cx="563" cy="96" r="23" fill="#e0ded1" stroke="#c4c3b5" stroke-width="5"/><path d="M563 76v8" stroke="#68836a" stroke-width="4" stroke-linecap="round"/><rect x="295" y="170" width="310" height="17" rx="8" fill="#d8d7ca"/><rect x="295" y="231" width="310" height="238" rx="12" fill="#e2e0d2" stroke="#cfcebf" stroke-width="7"/><rect x="315" y="250" width="270" height="195" rx="100" fill="#c8d6c8"/><circle cx="450" cy="348" r="79" fill="#315449" opacity=".78"/><circle cx="450" cy="348" r="60" fill="#a5bca1"/><path d="M398 368c32-38 66-38 104 0M409 326c24-21 49-21 80 0" fill="none" stroke="#e2edda" stroke-width="9" stroke-linecap="round"/><rect x="295" y="500" width="310" height="37" rx="6" fill="#d8d6c9"/><path d="M116 570h670" stroke="#f3f0e6" stroke-width="8" opacity=".45"/></svg>`)}`;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function setPhoto(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showToast('Choose a JPG, PNG or WEBP photo.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('That photo is over 10 MB. Choose a smaller one.');
    return;
  }
  sampleMode = false;
  selectedPhoto = file;
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  emptyUpload.classList.add('hidden');
  removePhotoButton.classList.remove('hidden');
}

function clearPhoto() {
  if (preview.src.startsWith('blob:')) URL.revokeObjectURL(preview.src);
  selectedPhoto = null;
  sampleMode = false;
  photoInput.value = '';
  preview.src = '';
  preview.classList.add('hidden');
  emptyUpload.classList.remove('hidden');
  removePhotoButton.classList.add('hidden');
}

photoInput.addEventListener('change', () => setPhoto(photoInput.files[0]));
removePhotoButton.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); clearPhoto(); });
['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', (event) => setPhoto(event.dataTransfer.files[0]));
issueInput.addEventListener('input', () => { document.getElementById('char-count').textContent = `${issueInput.value.length} / 500`; });
document.querySelectorAll('.prompt-chip').forEach((button) => button.addEventListener('click', () => {
  issueInput.value = button.dataset.prompt;
  issueInput.dispatchEvent(new Event('input'));
  issueInput.focus();
}));

document.getElementById('sample-button').addEventListener('click', () => {
  selectedPhoto = null;
  sampleMode = true;
  issueInput.value = 'My dishwasher stopped mid-cycle and an error light is blinking. It has a small E:04 display. What should I check first?';
  issueInput.dispatchEvent(new Event('input'));
  preview.src = sampleSvg;
  preview.classList.remove('hidden');
  emptyUpload.classList.add('hidden');
  removePhotoButton.classList.remove('hidden');
  showToast('Sample repair loaded. Let’s take a look.');
  runDiagnosis();
});

function normalizeResult(value) {
  const validRisks = ['low', 'medium', 'high'];
  return {
    component: String(value.component || 'Possible issue to investigate').slice(0, 90),
    summary: String(value.summary || 'We could not make out every detail. Check the steps and stop if anything feels unsafe.').slice(0, 500),
    risk: validRisks.includes(value.risk) ? value.risk : 'medium',
    safety: String(value.safety || 'Pause if you are unsure. Keep clear of moving parts and contact a qualified technician if the problem continues.').slice(0, 450),
    steps: Array.isArray(value.steps) ? value.steps.slice(0, 5).map((item) => String(item).slice(0, 260)) : [],
    parts: Array.isArray(value.parts) ? value.parts.slice(0, 5).map((item) => String(item).slice(0, 100)) : [],
    time: String(value.time || '5 MIN').slice(0, 20),
    confidence: String(value.confidence || 'First look').slice(0, 30),
    proNote: String(value.proNote || 'Please inspect the part shown in my photo. The issue I noticed is: ').slice(0, 500),
  };
}

function safetyOverride(result, description) {
  const emergency = /gas smell|smell of gas|gas leak|sparks|electrical fire|flames|fire|smoke|carbon monoxide/i.test(description);
  if (emergency) {
    result.risk = 'high';
    result.safety = 'Stop troubleshooting. Leave the area if there is a gas smell, smoke, or fire; do not operate switches. Contact emergency services or the appropriate utility from a safe location.';
    result.steps = ['Move away from the appliance or suspected leak.', 'Do not touch electrical switches or try to restart the equipment.', 'Contact emergency services or your gas utility from a safe location.'];
    result.parts = [];
    result.time = 'STOP NOW';
  }
  return result;
}

async function runDiagnosis() {
  const description = issueInput.value.trim();
  if (!description) { issueInput.focus(); showToast('Add a sentence about what happened first.'); return; }
  if (!selectedPhoto && !sampleMode) { showToast('Add a photo, or load the sample repair.'); return; }
  diagnoseButton.disabled = true;
  diagnoseButton.innerHTML = '<span>Putting your plan together…</span><span class="button-arrow">···</span>';
  let response;
  try {
    if (sampleMode) {
      await new Promise((resolve) => setTimeout(resolve, 550));
      response = {
        component: 'Dishwasher error light',
        summary: 'The photo shows an E:04 style display on the dishwasher control panel. Error codes vary by brand, so use the model label or manual to confirm the exact meaning before ordering parts.',
        risk: 'medium',
        safety: 'Before checking anything, switch the dishwasher off. If you see water near an outlet, smell burning, or the breaker trips, leave it off and call a qualified technician.',
        steps: ['Turn the dishwasher off at its control and wait 30 seconds. Check the inside door edge for the brand and model number.', 'Look up E:04 in the manual or the manufacturer’s support page. The same code can mean different things across brands.', 'If there is standing water, check whether the filter at the bottom is visibly blocked. Remove it only as the manual describes.', 'Restart only if there is no leak, burning smell, or electrical issue. If the code returns, note it and arrange service.'],
        parts: ['Dishwasher model number (from the door label)', 'Owner’s manual or manufacturer support page'],
        time: '5 MIN', confidence: 'Needs model check',
        proNote: 'My dishwasher stopped mid-cycle and shows an E:04 code. I checked the brand/model label and would like the code interpreted before replacing any parts.',
      };
    } else {
      const base64 = await fileToBase64(selectedPhoto);
      const apiResponse = await fetch('/api/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: selectedPhoto.type, description }),
      });
      const payload = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(payload.error || 'Could not complete the repair check.');
      response = payload;
    }
    latestResult = safetyOverride(normalizeResult(response), description);
    renderResult(latestResult);
  } catch (error) {
    showToast(error.message || 'Something went wrong. Check Google ADC setup or try the sample repair.');
  } finally {
    diagnoseButton.disabled = false;
    diagnoseButton.innerHTML = '<span>Get my game plan</span><span class="button-arrow">↗</span>';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read that photo. Try another image.'));
    reader.readAsDataURL(file);
  });
}

function renderResult(result) {
  const image = sampleMode ? sampleSvg : URL.createObjectURL(selectedPhoto);
  document.getElementById('result-photo').src = image;
  document.getElementById('result-title').textContent = result.component;
  document.getElementById('result-summary').textContent = result.summary;
  document.getElementById('confidence-label').textContent = result.confidence;
  document.getElementById('confidence-pill').textContent = result.risk === 'high' ? 'High caution' : result.risk === 'medium' ? 'Use care' : 'First look';
  const safetyCard = document.getElementById('safety-card');
  safetyCard.className = `safety-card ${result.risk}`;
  document.getElementById('safety-icon').textContent = result.risk === 'high' ? '!' : result.risk === 'low' ? '✓' : '⚠';
  document.getElementById('safety-title').textContent = result.risk === 'high' ? 'Stop and get help' : result.risk === 'low' ? 'Low risk, still take care' : 'Before you start';
  document.getElementById('safety-text').textContent = result.safety;
  document.getElementById('guide-time').textContent = `~ ${result.time}`;
  const steps = result.steps.length ? result.steps : ['Take one clear photo of the area and note any labels or model numbers.', 'Check the manufacturer’s manual for this exact model.', 'If you notice water near electricity, smoke, sparks, or a gas smell, stop and contact a professional.'];
  const list = document.getElementById('steps-list');
  list.replaceChildren(...steps.map((text) => { const item = document.createElement('li'); item.textContent = text; return item; }));
  const partsBox = document.getElementById('parts-box');
  if (result.parts.length) {
    document.getElementById('parts-list').replaceChildren(...result.parts.map((text) => { const item = document.createElement('li'); item.textContent = text; return item; }));
    partsBox.classList.remove('hidden');
  } else partsBox.classList.add('hidden');
  resultSection.classList.remove('hidden');
  workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

diagnoseButton.addEventListener('click', runDiagnosis);
document.getElementById('start-over').addEventListener('click', () => {
  resultSection.classList.add('hidden');
  clearPhoto();
  issueInput.value = '';
  issueInput.dispatchEvent(new Event('input'));
  workbench.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
document.getElementById('about-button').addEventListener('click', () => document.getElementById('workbench').scrollIntoView({ behavior: 'smooth' }));
document.getElementById('pro-button').addEventListener('click', () => {
  const modal = document.getElementById('modal-backdrop');
  const note = latestResult?.proNote || 'Please inspect the issue in my photo. What I noticed: ';
  document.getElementById('pro-note').textContent = note;
  modal.classList.remove('hidden');
});
document.getElementById('modal-close').addEventListener('click', () => document.getElementById('modal-backdrop').classList.add('hidden'));
document.getElementById('modal-backdrop').addEventListener('click', (event) => { if (event.target.id === 'modal-backdrop') event.currentTarget.classList.add('hidden'); });
document.getElementById('copy-note').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.getElementById('pro-note').textContent); showToast('Handoff note copied.'); }
  catch { showToast('Select and copy the note above.'); }
});
