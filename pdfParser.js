async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(function (item) { return item.str; }).join(' ') + '\n';
  }
  return text;
}

function parseClinicalFields(rawText) {
  const t = rawText.replace(/\s+/g, ' ');
  const result = {};

  function firstMatch(regexes) {
    for (let i = 0; i < regexes.length; i++) {
      const m = t.match(regexes[i]);
      if (m) return m[1];
    }
    return undefined;
  }
  function numberFrom(regexes) {
    const v = firstMatch(regexes);
    return v === undefined ? undefined : parseFloat(v);
  }

  result.name = firstMatch([/(?:Patient Name|Name)\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,40}?)(?=\s+(?:Age|DOB|Gender|Sex|Date)\b|\s*$)/i]);
  if (result.name) result.name = result.name.trim();

  result.age = numberFrom([/\bAge\s*[:\-]?\s*(\d{1,3})/i]);

  const gender = firstMatch([/\bGender\s*[:\-]?\s*(Male|Female|Other)\b/i]);
  if (gender) result.gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();

  result.heartRate = numberFrom([/\b(?:Heart Rate|HR|Pulse)\s*[:\-]?\s*(\d{2,3})/i]);
  result.systolicBP = numberFrom([
    /\b(?:BP|Blood Pressure)\s*[:\-]?\s*(\d{2,3})\s*\/\s*\d{2,3}/i,
    /\bSystolic(?: BP)?\s*[:\-]?\s*(\d{2,3})/i
  ]);
  result.spo2 = numberFrom([/\b(?:SpO2|O2 Sat(?:uration)?|Oxygen Saturation)\s*[:\-]?\s*(\d{2,3})/i]);
  result.temperature = numberFrom([/\bTemp(?:erature)?\s*[:\-]?\s*(\d{2}(?:\.\d+)?)/i]);
  result.respRate = numberFrom([/\b(?:Resp(?:iratory)? Rate|RR)\s*[:\-]?\s*(\d{1,2})/i]);
  result.erVisits = numberFrom([
    /\bER Visits?(?: in (?:the )?last 30 days| last 30 days)?\s*[:\-]?\s*(\d{1,2})\b/i,
    /\b(\d{1,2})\s+ER visits?/i
  ]);

  if (/\bdiabet/i.test(t)) result.diabetes = true;
  if (/\bCOPD\b/i.test(t)) result.copd = true;
  if (/\bcardiac\b/i.test(t)) result.cardiac = true;

  function flagged(word) {
    const before = new RegExp('\\b(?:elevated|high|raised)\\s+' + word + '\\b', 'i');
    const after = new RegExp('\\b' + word + '\\b[^.]{0,25}\\b(?:elevated|high|raised)\\b', 'i');
    return before.test(t) || after.test(t);
  }
  if (flagged('WBC')) result.WBC = true;
  if (flagged('creatinine')) result.highCreatinine = true;
  if (flagged('CRP')) result.CRP = true;

  Object.keys(result).forEach(function (k) {
    if (result[k] === undefined) delete result[k];
  });
  return result;
}
