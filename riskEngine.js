function calculateRisk(patient) {
    let score = 0;

    if (patient.age > 75) {
        score = score + 2;
    } else if (patient.age >= 60) {
        score = score + 1;
    }

    if (patient.heartRate > 120) {
        score = score + 2;
    } else if (patient.heartRate >= 100) {
        score = score + 1;
    }

    if (patient.systolicBP < 90) {
        score = score + 2;
    }

    if (patient.spo2 < 90) {
        score = score + 2;
    } else if (patient.spo2 >= 90 && patient.spo2 <= 93) {
        score = score + 1;
    }

    if (patient.temperature > 39) {
        score = score + 2;
    } else if (patient.temperature >= 38 && patient.temperature <= 39) {
        score = score + 1;
    }

    if (patient.respRate > 24) {
        score = score + 1;
    }

    if (patient.diabetes) {
        score = score + 1;
    }
    if (patient.copd) {
        score = score + 1;
    }
    if (patient.cardiac) {
        score = score + 1;
    }

    if (patient.erVisits > 3) {
        score = score + 2;
    } else if (patient.erVisits >= 2) {
        score = score + 1;
    }

    if (patient.WBC) {
        score = score + 1;
    }
    if (patient.highCreatinine) {
        score = score + 1;
    }
    if (patient.CRP) {
        score = score + 1;
    }

    let level = "LOW";
    if (score >= 6) {
        level = "HIGH";
    } else if (score >= 3) {
        level = "MEDIUM";
    }

    if (patient.spo2 < 85 || patient.systolicBP < 80 || patient.heartRate > 140) {
        level = "HIGH";
    }

    return { score: score, level: level };
}
