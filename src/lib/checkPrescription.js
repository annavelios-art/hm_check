/**
 * checkPrescription.js
 * 
 * Prüflogik für Heilmittelverordnungen (Muster 13)
 * 
 * Diese Datei enthält alle Regeln zur formalen Plausibilitätsprüfung.
 * Die Prüfung ist rein formal/abrechnungsrelevant - keine medizinische Bewertung.
 * 
 * Vorbereitet für spätere Erweiterung durch CSV-Datenquellen.
 */

import { addDays, format } from 'date-fns'
import { de } from 'date-fns/locale'

/**
 * Mapping der Therapiefrequenzen auf minimale Behandlungen pro Woche
 * Wird verwendet für die 12-Wochen-Regel (Regel 5)
 */
const FREQUENCY_MAP = {
  '1x wöchentlich': 1,
  '1-2x wöchentlich': 1,
  '2x wöchentlich': 2,
  '2-3x wöchentlich': 2,
  '3x wöchentlich': 3,
  '4x wöchentlich': 4,
}

/**
 * Hauptfunktion zur Prüfung einer Heilmittelverordnung
 * 
 * @param {Object} data - Formulardaten der Verordnung
 * @param {string} data.issueDate - Ausstellungsdatum (ISO-Format)
 * @param {string} data.diagnosisGroup - Diagnosegruppe (z.B. EX, WS, ZN)
 * @param {string[]} data.symptoms - Ausgewählte Leitsymptomatiken (a, b, c, x)
 * @param {string} data.remedy - Ausgewähltes Heilmittel
 * @param {number} data.units - Anzahl Behandlungseinheiten
 * @param {string} data.icd10 - ICD-10 Code
 * @param {string} data.frequency - Therapiefrequenz
 * @param {Array} csvData - Geladene CSV-Daten für Diagnosenliste
 * 
 * @returns {Object} Prüfergebnis
 * @returns {string} returns.status - "success" oder "error"
 * @returns {string} returns.title - Titel der Ergebnismeldung
 * @returns {string[]} returns.errors - Liste der formalen Fehler
 * @returns {string[]} returns.infos - Liste der neutralen Hinweise
 * @returns {string|null} returns.latestStartDate - Spätester Therapiebeginn
 * @returns {Object|null} returns.csvMatch - Gefundener CSV-Eintrag (falls vorhanden)
 */
export function checkPrescription(data, csvData = []) {
  const errors = []
  const infos = []
  let latestStartDate = null
  let csvMatch = null

  // ============================================
  // REGEL 1: Ausstellungsdatum muss vorhanden sein
  // ============================================
  if (!data.issueDate) {
    errors.push('Bitte Ausstellungsdatum eingeben.')
  } else {
    // Berechne spätesten Therapiebeginn (28 Tage nach Ausstellung)
    try {
      const issueDate = new Date(data.issueDate)
      const latestStart = addDays(issueDate, 28)
      latestStartDate = format(latestStart, 'dd.MM.yyyy', { locale: de })
    } catch (e) {
      errors.push('Ungültiges Datumsformat.')
    }
  }

  // ============================================
  // REGEL 2: Diagnosegruppe muss ausgewählt sein
  // ============================================
  if (!data.diagnosisGroup) {
    errors.push('Bitte Diagnosegruppe auswählen.')
  }

  // ============================================
  // REGEL 3: Heilmittel muss ausgewählt sein
  // ============================================
  if (!data.remedy) {
    errors.push('Bitte Heilmittel auswählen.')
  }

  // ============================================
  // REGEL 4: Behandlungseinheiten müssen > 0 sein
  // ============================================
  const units = parseInt(data.units, 10)
  if (!data.units || isNaN(units) || units <= 0) {
    errors.push('Bitte Behandlungseinheiten eingeben.')
  }

  // ============================================
  // REGEL 5: 12-Wochen-Regel bei > 6 Einheiten
  // ============================================
  if (units > 6) {
    // 5a: Frequenz ist Pflicht
    if (!data.frequency) {
      errors.push('Bei mehr als 6 Behandlungseinheiten muss eine Therapiefrequenz angegeben werden.')
    } else {
      // 5b: Prüfung ob Abschluss in 12 Wochen möglich
      const minFrequency = FREQUENCY_MAP[data.frequency] || 1
      const requiredWeeks = Math.ceil(units / minFrequency)
      
      if (requiredWeeks > 12) {
        errors.push(
          'Die Verordnung kann mit der angegebenen Frequenz rechnerisch nicht innerhalb von 12 Wochen abgeschlossen werden.'
        )
      }
    }
    
    // 5c: ICD-10 ist Pflicht bei > 6 Einheiten
    const icd10Normalized = normalizeIcd10(data.icd10)
    
    if (!icd10Normalized) {
      errors.push('Bei mehr als 6 Behandlungseinheiten muss ein ICD-10-Code angegeben werden.')
    } else if (csvData.length > 0) {
      // Prüfe ob ICD-10 in der CSV-Datei vorhanden ist
      csvMatch = findIcdInCsv(icd10Normalized, csvData)
      
      if (!csvMatch) {
        // ICD-10 NICHT in CSV gefunden => Fehler
        errors.push(
          `Der ICD-10-Code "${data.icd10}" wurde nicht in der Diagnoseliste für langfristigen Heilmittelbedarf / besonderen Verordnungsbedarf gefunden. Die Verordnung ist bei mehr als 6 Behandlungseinheiten nur mit einem gelisteten ICD-10-Code zulässig.`
        )
      } else {
        // ICD-10 in CSV gefunden => Prüfe Diagnosegruppe
        const physioGroups = parsePhysioGroups(csvMatch.Physio)
        
        if (data.diagnosisGroup && physioGroups.length > 0) {
          const inputGroup = data.diagnosisGroup.toUpperCase()
          const groupMatches = physioGroups.some(g => g.toUpperCase() === inputGroup)
          
          if (!groupMatches) {
            // Diagnosegruppe passt NICHT zur CSV - formaler Fehler
            errors.push(
              `Die Diagnosegruppe passt nicht zur ICD-10-Diagnose. Erwartet laut Diagnoseliste: ${physioGroups.join('/')}, eingegeben: ${data.diagnosisGroup}. Bitte Verordnung ärztlich ändern lassen oder Abweichung dokumentieren.`
            )
          }
        }
        
        // Neutrale Hinweise aus CSV (beeinflussen NICHT den Status)
        if (csvMatch.Hinweis?.trim()) {
          infos.push(`Hinweis aus Diagnoseliste: ${csvMatch.Hinweis}`)
        }
        
        if (csvMatch.Diagnose?.trim()) {
          infos.push(`Diagnose: ${csvMatch.Diagnose}`)
        }
        
        if (physioGroups.length > 0) {
          infos.push(`Erlaubte Physio-Diagnosegruppen laut Liste: ${physioGroups.join(', ')}`)
        }
      }
    }
  }

  // ============================================
  // Ergebnis zusammenstellen
  // ============================================
  const hasErrors = errors.length > 0
  
  return {
    status: hasErrors ? 'error' : 'success',
    title: hasErrors 
      ? 'Formale Fehler gefunden' 
      : 'Die Verordnung wurde formal korrekt ausgestellt',
    errors,
    infos,
    latestStartDate,
    csvMatch
  }
}

/**
 * Normalisiert einen ICD-10 Code für den Vergleich
 * Entfernt Leerzeichen und konvertiert zu Großbuchstaben
 * 
 * @param {string} icd10 - Roher ICD-10 Code
 * @returns {string} Normalisierter Code
 */
function normalizeIcd10(icd10) {
  if (!icd10) return ''
  return icd10.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Sucht einen ICD-10 Code in den CSV-Daten
 * Prüft gegen ICD1 und ICD2 Spalten
 * 
 * @param {string} icd10 - Normalisierter ICD-10 Code
 * @param {Array} csvData - CSV-Daten
 * @returns {Object|null} Gefundener Eintrag oder null
 */
function findIcdInCsv(icd10, csvData) {
  // Suche nach exaktem Match in ICD1 oder ICD2
  for (const row of csvData) {
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)
    
    if (icd1 === icd10 || icd2 === icd10) {
      return row
    }
  }
  
  // Suche mit Präfix-Match (z.B. G35 findet G35.0, G35.1, etc.)
  // Aber nur wenn der eingegebene Code kürzer ist
  for (const row of csvData) {
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)
    
    // Präfix-Match: Wenn CSV-Eintrag mit dem eingegebenen Code beginnt
    if ((icd1 && icd1.startsWith(icd10)) || (icd2 && icd2.startsWith(icd10))) {
      // Finde den nächsten übergeordneten Eintrag mit Physio-Daten
      return findParentWithPhysio(icd10, csvData)
    }
    
    // Umgekehrter Präfix-Match: Eingegebener Code beginnt mit CSV-Eintrag
    if ((icd1 && icd10.startsWith(icd1)) || (icd2 && icd10.startsWith(icd2))) {
      // Prüfe ob dieser Eintrag oder ein übergeordneter Physio-Daten hat
      if (row.Physio?.trim()) {
        return row
      }
    }
  }
  
  return null
}

/**
 * Sucht den nächsten übergeordneten Eintrag mit Physio-Daten
 * Die CSV-Struktur hat oft Kategoriezeilen mit Physio-Info, 
 * gefolgt von Detailzeilen ohne
 * 
 * @param {string} icd10 - ICD-10 Code
 * @param {Array} csvData - CSV-Daten
 * @returns {Object|null} Eintrag mit Physio-Daten oder null
 */
function findParentWithPhysio(icd10, csvData) {
  let lastPhysioEntry = null
  
  for (const row of csvData) {
    // Speichere jeden Eintrag mit Physio-Daten
    if (row.Physio?.trim()) {
      lastPhysioEntry = row
    }
    
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)
    
    // Wenn wir den gesuchten Code gefunden haben
    if (icd1 === icd10 || icd2 === icd10 || 
        icd1.startsWith(icd10) || icd2.startsWith(icd10) ||
        (icd1 && icd10.startsWith(icd1)) || (icd2 && icd10.startsWith(icd2))) {
      // Wenn dieser Eintrag Physio hat, nimm ihn
      if (row.Physio?.trim()) {
        return row
      }
      // Sonst nimm den letzten Eintrag mit Physio
      return lastPhysioEntry
    }
  }
  
  return lastPhysioEntry
}

/**
 * Parst die Physio-Spalte und extrahiert einzelne Diagnosegruppen
 * Format in CSV: "ZN/SO3" oder "WS/EX/PN"
 * 
 * @param {string} physioString - Rohwert aus Physio-Spalte
 * @returns {string[]} Array der Diagnosegruppen
 */
function parsePhysioGroups(physioString) {
  if (!physioString) return []
  
  // Trenne nach "/" und entferne Leerzeichen
  return physioString
    .split('/')
    .map(g => g.trim())
    .filter(g => g.length > 0)
}

/**
 * Lädt und parst die CSV-Datei mit der Diagnoseliste
 * 
 * @param {string} url - URL zur CSV-Datei
 * @returns {Promise<Array>} Geparsete CSV-Daten
 */
export async function loadCsvData(url = '/data/blb_pwa.csv') {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn('CSV-Datei konnte nicht geladen werden:', response.status)
      return []
    }
    
    const text = await response.text()
    return parseCsv(text)
  } catch (error) {
    console.warn('Fehler beim Laden der CSV-Datei:', error)
    return []
  }
}

/**
 * Parst CSV-Text in ein Array von Objekten
 * Unterstützt Semikolon als Trennzeichen und Anführungszeichen
 * 
 * @param {string} csvText - Roher CSV-Text
 * @returns {Array} Array von Objekten mit Spaltennamen als Keys
 */
function parseCsv(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  // Header-Zeile parsen
  const headers = parseCsvLine(lines[0])
  
  // Datenzeilen parsen
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }
  
  return data
}

/**
 * Parst eine einzelne CSV-Zeile
 * Berücksichtigt Anführungszeichen und Semikolon als Trennzeichen
 * 
 * @param {string} line - CSV-Zeile
 * @returns {string[]} Array der Werte
 */
function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ';' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Letzten Wert hinzufügen
  values.push(current.trim())
  
  return values
}
