let patients = [];

const TRACKED_FIELDS = [
  'name', 'dob', 'age', 'gender', 'contact', 'admissionDate',
  'heartRate', 'systolicBP', 'spo2', 'temperature', 'respRate',
  'diabetes', 'copd', 'cardiac', 'erVisits',
  'WBC', 'highCreatinine', 'CRP', 'notes'
];

function generateId() {
  return 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

function createPatient(data) {
  let risk = calculateRisk(data);

  let newPatient = {
    id: generateId(),
    ...data,
    riskScore: risk.score,
    riskLevel: risk.level,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    auditLog: [{
      timestamp: new Date().toISOString(),
      changes: [],
      note: "Record created",
      riskAfter: risk.level,
      scoreAfter: risk.score
    }]
  };

  patients.push(newPatient);
  save();
  return newPatient;
}

function getAllPatients() {
  return patients;
}

function getPatientById(id) {
  return patients.find(function (p) { return p.id === id; }) || null;
}

function findPatientIndex(id) {
  for (let i = 0; i < patients.length; i++) {
    if (patients[i].id === id) {
      return i;
    }
  }
  return -1;
}

function updatePatient(id, newData) {
  let index = findPatientIndex(id);
  let existingPatient = patients[index];

  let changes = [];
  for (let i = 0; i < TRACKED_FIELDS.length; i++) {
    let field = TRACKED_FIELDS[i];
    if (newData[field] !== undefined && newData[field] !== existingPatient[field]) {
      changes.push({
        field: field,
        oldValue: existingPatient[field],
        newValue: newData[field]
      });
    }
  }

  let updatedPatient = {
    ...existingPatient,
    ...newData
  };

  let risk = calculateRisk(updatedPatient);
  updatedPatient.riskScore = risk.score;
  updatedPatient.riskLevel = risk.level;
  updatedPatient.lastUpdated = new Date().toISOString();

  let note = changes.length > 0 ? (changes.length + " field(s) updated") : "Recalculated";
  if (existingPatient.riskLevel !== risk.level) {
    note += " — Risk moved from " + existingPatient.riskLevel + " to " + risk.level;
  }

  updatedPatient.auditLog = [
    ...existingPatient.auditLog,
    {
      timestamp: new Date().toISOString(),
      changes: changes,
      note: note,
      riskAfter: risk.level,
      scoreAfter: risk.score
    }
  ];

  patients[index] = updatedPatient;
  save();
  return updatedPatient;
}

function removePatient(id) {
  let index = findPatientIndex(id);
  if (index !== -1) {
    patients.splice(index, 1);
    save();
  }
}

function save() {
  localStorage.setItem('prm_patients', JSON.stringify(patients));
}

function loadFromStorage() {
  let raw = localStorage.getItem('prm_patients');
  if (raw) {
    patients = JSON.parse(raw);
  }
}
