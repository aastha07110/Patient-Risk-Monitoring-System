let currentPatientId = null;
let charts = {};

const FIELD_LABELS = {
  name: 'Name', dob: 'Date of Birth', age: 'Age', gender: 'Gender', contact: 'Contact',
  admissionDate: 'Admission Date', heartRate: 'Heart Rate', systolicBP: 'Systolic BP',
  spo2: 'SpO2', temperature: 'Temperature', respRate: 'Respiratory Rate',
  diabetes: 'Diabetes', copd: 'COPD', cardiac: 'Cardiac Disease', erVisits: 'ER Visits (30d)',
  WBC: 'Elevated WBC', highCreatinine: 'High Creatinine', CRP: 'High CRP', notes: 'Notes'
};

function $(selector) { return document.querySelector(selector); }
function $$(selector) { return Array.from(document.querySelectorAll(selector)); }

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDateTime(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function formatValue(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v === undefined || v === null || v === '') return '—';
  return v;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoString(n) {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

function ageFromDob(dob) {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (isNaN(birth)) return undefined;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function riskColor(level) {
  return { LOW: '#2e7d4f', MEDIUM: '#a56c00', HIGH: '#c0392b' }[level];
}

function showView(name) {
  $$('.view').forEach(function (v) { v.classList.remove('active'); });
  $('#view-' + name).classList.add('active');
  $$('.nav-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.view === name); });

  if (name === 'dashboard') renderDashboard();
  if (name === 'patients') renderPatientList();
  if (name === 'detail') renderDetail();
}

function openPatient(id) {
  currentPatientId = id;
  showView('detail');
}

function openNewPatient() {
  currentPatientId = null;
  showView('detail');
}

function renderDashboard() {
  const all = getAllPatients();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

  $('#stat-total').textContent = all.length;
  $('#stat-high').textContent = all.filter(function (p) { return p.riskLevel === 'HIGH'; }).length;
  $('#stat-recent').textContent = all.filter(function (p) {
    return p.admissionDate && new Date(p.admissionDate).getTime() >= weekAgo;
  }).length;

  if (typeof Chart === 'undefined') return;
  drawDistributionChart(all);
  drawTrendChart(all);
}

function drawDistributionChart(all) {
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  all.forEach(function (p) { counts[p.riskLevel]++; });

  if (charts.distribution) charts.distribution.destroy();
  charts.distribution = new Chart($('#chart-distribution'), {
    type: 'bar',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        data: [counts.LOW, counts.MEDIUM, counts.HIGH],
        backgroundColor: [riskColor('LOW'), riskColor('MEDIUM'), riskColor('HIGH')]
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function drawTrendChart(all) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(daysAgoString(i));
  }
  const highPerDay = {};
  days.forEach(function (d) { highPerDay[d] = 0; });

  all.forEach(function (p) {
    p.auditLog.forEach(function (entry) {
      const day = entry.timestamp.slice(0, 10);
      if (entry.riskAfter === 'HIGH' && highPerDay[day] !== undefined) {
        highPerDay[day]++;
      }
    });
  });

  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart($('#chart-trend'), {
    type: 'line',
    data: {
      labels: days.map(function (d) { return d.slice(5); }),
      datasets: [{
        label: 'HIGH-risk events',
        data: days.map(function (d) { return highPerDay[d]; }),
        borderColor: riskColor('HIGH'),
        backgroundColor: 'rgba(192,57,43,0.15)',
        fill: true,
        tension: 0.25
      }]
    },
    options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}


function renderPatientList() {
  const list = getAllPatients().slice().sort(function (a, b) {
    return new Date(b.lastUpdated) - new Date(a.lastUpdated);
  });
  const body = $('#patient-list-body');

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state">No patients yet. Click "+ Add Patient".</td></tr>';
    return;
  }

  body.innerHTML = list.map(function (p) {
    return `
      <tr>
        <td><button class="row-expand" data-id="${p.id}" title="Quick view">▸</button> ${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.age)}</td>
        <td>${escapeHtml(p.admissionDate)}</td>
        <td>${formatDateTime(p.lastUpdated)}</td>
        <td><span class="badge badge-${p.riskLevel.toLowerCase()}">${p.riskLevel} · ${p.riskScore}</span></td>
        <td><button class="btn-link" data-open="${p.id}">Open</button></td>
      </tr>
      <tr class="quick-view" id="qv-${p.id}" hidden>
        <td colspan="6">
          <div class="quick-grid">
            <div>HR: <strong>${escapeHtml(p.heartRate)}</strong> bpm</div>
            <div>BP: <strong>${escapeHtml(p.systolicBP)}</strong> mmHg</div>
            <div>SpO2: <strong>${escapeHtml(p.spo2)}</strong>%</div>
            <div>Temp: <strong>${escapeHtml(p.temperature)}</strong> °C</div>
            <div>Resp: <strong>${escapeHtml(p.respRate)}</strong>/min</div>
            <div>ER visits: <strong>${escapeHtml(p.erVisits)}</strong></div>
          </div>
        </td>
      </tr>`;
  }).join('');

  $$('.row-expand').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const row = document.getElementById('qv-' + btn.dataset.id);
      row.hidden = !row.hidden;
      btn.textContent = row.hidden ? '▸' : '▾';
    });
  });
  $$('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { openPatient(btn.dataset.open); });
  });
}


function formElements() {
  return $('#patient-form').elements;
}

function readForm() {
  const f = formElements();
  function num(n) { return f[n].value === '' ? undefined : Number(f[n].value); }

  const dob = f['dob'].value;
  const typedAge = num('age');

  return {
    name: f['name'].value.trim(),
    dob: dob,
    age: typedAge !== undefined ? typedAge : ageFromDob(dob),
    gender: f['gender'].value,
    contact: f['contact'].value.trim(),
    admissionDate: f['admissionDate'].value,
    heartRate: num('heartRate'),
    systolicBP: num('systolicBP'),
    spo2: num('spo2'),
    temperature: num('temperature'),
    respRate: num('respRate'),
    diabetes: f['diabetes'].checked,
    copd: f['copd'].checked,
    cardiac: f['cardiac'].checked,
    erVisits: num('erVisits') !== undefined ? num('erVisits') : 0,
    WBC: f['WBC'].checked,
    highCreatinine: f['highCreatinine'].checked,
    CRP: f['CRP'].checked,
    notes: f['notes'].value
  };
}

function validate(d) {
  if (!d.name) return 'Please enter the patient name.';
  if (d.age === undefined) return 'Please enter the age or date of birth.';
  if (d.heartRate === undefined || d.systolicBP === undefined || d.spo2 === undefined ||
    d.temperature === undefined || d.respRate === undefined) {
    return 'Please fill in all five vitals.';
  }
  if (d.spo2 > 100) return 'SpO2 cannot be more than 100%.';
  return null;
}

function renderDetail() {
  const patient = currentPatientId ? getPatientById(currentPatientId) : null;
  const f = formElements();

  $('#detail-title').textContent = patient ? 'Edit: ' + patient.name : 'New Patient';
  $('#delete-patient-btn').hidden = !patient;
  $('#pdf-status').textContent = '';

  Array.from(f).forEach(function (el) {
    if (!el.name) return;
    if (el.type === 'checkbox') {
      el.checked = patient ? !!patient[el.name] : false;
    } else if (patient && patient[el.name] !== undefined) {
      el.value = patient[el.name];
    } else {
      el.value = '';
    }
  });

  if (!patient) {
    f['admissionDate'].value = todayString();
    f['gender'].value = 'Female';
    f['erVisits'].value = 0;
  }

  renderLiveRisk();
  renderAuditLog(patient);
}

function renderLiveRisk() {
  const risk = calculateRisk(readForm());
  const box = $('#live-risk');
  box.className = 'risk-box risk-' + risk.level.toLowerCase();
  box.innerHTML = '<div class="risk-headline">' + risk.level + '</div>' +
    '<div class="risk-score">Score: ' + risk.score + '</div>';
}

function renderAuditLog(patient) {
  const box = $('#audit-log');
  if (!patient) {
    box.innerHTML = '<p class="empty-state">History appears here once the record is saved.</p>';
    return;
  }

  const entries = patient.auditLog.slice().reverse();
  box.innerHTML = entries.map(function (e) {
    let diff = '';
    if (e.changes.length > 0) {
      diff = '<table class="diff-table"><thead><tr><th>Field</th><th>Previous</th><th>New</th></tr></thead><tbody>' +
        e.changes.map(function (c) {
          return '<tr><td>' + escapeHtml(FIELD_LABELS[c.field] || c.field) + '</td>' +
            '<td class="diff-old">' + escapeHtml(formatValue(c.oldValue)) + '</td>' +
            '<td class="diff-new">' + escapeHtml(formatValue(c.newValue)) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    return '<div class="audit-entry">' +
      '<div class="audit-head"><span class="audit-time">' + formatDateTime(e.timestamp) + '</span>' +
      '<span class="badge badge-' + e.riskAfter.toLowerCase() + '">' + e.riskAfter + ' · ' + e.scoreAfter + '</span></div>' +
      '<div class="audit-note">' + escapeHtml(e.note) + '</div>' + diff + '</div>';
  }).join('');
}


async function handlePdf(file) {
  const status = $('#pdf-status');
  status.textContent = 'Reading PDF…';
  try {
    const text = await extractPdfText(file);
    const found = parseClinicalFields(text);
    applyExtracted(found);
    const count = Object.keys(found).length;
    status.textContent = count > 0
      ? 'Extracted ' + count + ' field(s). Please review and correct them before saving.'
      : 'Could not find recognisable fields. Please enter the details manually.';
  } catch (err) {
    console.error(err);
    status.textContent = 'Could not read that PDF. Please enter the details manually.';
  }
}

function applyExtracted(found) {
  const f = formElements();
  Object.keys(found).forEach(function (key) {
    if (!f[key]) return;
    if (f[key].type === 'checkbox') {
      f[key].checked = found[key];
    } else {
      f[key].value = found[key];
    }
  });
  renderLiveRisk();
}


function seedIfEmpty() {
  if (getAllPatients().length > 0) return;

  const base = {
    dob: '', gender: 'Female', contact: '', admissionDate: todayString(),
    heartRate: 78, systolicBP: 120, spo2: 98, temperature: 36.8, respRate: 16,
    diabetes: false, copd: false, cardiac: false, erVisits: 0,
    WBC: false, highCreatinine: false, CRP: false, notes: ''
  };

  const samples = [
    {
      name: 'Sarah Jenkins', age: 72, admissionDate: daysAgoString(1), heartRate: 102, systolicBP: 110,
      spo2: 91, temperature: 36.8, respRate: 20, diabetes: true, copd: true, erVisits: 1, WBC: true
    },
    { name: 'Ramesh Iyer', age: 45, gender: 'Male', admissionDate: daysAgoString(10) },
    {
      name: 'Fatima Noor', age: 66, admissionDate: daysAgoString(3), heartRate: 108, systolicBP: 100,
      spo2: 92, cardiac: true, erVisits: 2
    },
    { name: 'Priya Menon', age: 38, heartRate: 145 }
  ];

  samples.forEach(function (s) { createPatient({ ...base, ...s }); });
}

function bindEvents() {
  $$('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { showView(btn.dataset.view); });
  });
  $('#add-patient-btn').addEventListener('click', openNewPatient);
  $('#back-to-list-btn').addEventListener('click', function () { showView('patients'); });

  const form = $('#patient-form');
  form.addEventListener('input', renderLiveRisk);
  form.addEventListener('change', function (e) {
    if (e.target.name === 'dob') {
      const derived = ageFromDob(e.target.value);
      if (derived !== undefined) form.elements['age'].value = derived;
    }
    renderLiveRisk();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = readForm();
    const error = validate(data);
    if (error) { alert(error); return; }

    if (currentPatientId) {
      updatePatient(currentPatientId, data);
    } else {
      createPatient(data);
    }
    showView('patients');
  });

  $('#delete-patient-btn').addEventListener('click', function () {
    if (currentPatientId && confirm('Delete this patient record? This cannot be undone.')) {
      removePatient(currentPatientId);
      currentPatientId = null;
      showView('patients');
    }
  });

  const zone = $('#pdf-dropzone');
  const input = $('#pdf-file-input');
  zone.addEventListener('click', function () { input.click(); });
  input.addEventListener('change', function () {
    if (input.files[0]) handlePdf(input.files[0]);
  });
  zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function () { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') handlePdf(file);
  });
}


document.addEventListener('DOMContentLoaded', function () {
  loadFromStorage();
  seedIfEmpty();
  bindEvents();
  showView('dashboard');
});
