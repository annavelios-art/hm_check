/**
 * checkPrescription.js
 *
 * Prüflogik für Heilmittelverordnungen (Muster 13)
 *
 * Diese Datei enthält alle Regeln zur formalen Plausibilitätsprüfung.
 * Die Prüfung ist rein formal/abrechnungsrelevant - keine medizinische Bewertung.
 *
 * Die CSV-Datei dient als lokale Diagnoseliste für langfristigen Heilmittelbedarf /
 * besonderen Verordnungsbedarf.
 */

import { addDays, format } from 'date-fns'
import { de } from 'date-fns/locale'

/**
 * Mapping der Therapiefrequenzen auf minimale Behandlungen pro Woche
 * Wird verwendet für die 12-Wochen-Regel.
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
 * Hauptfunktion zur Prüfung einer Heilmittelverordnung.
 *
 * @param {Object} data - Formulardaten der Verordnung
 * @param {string} data.issueDate - Ausstellungsdatum
 * @param {string} data.diagnosisGroup - Diagnosegruppe, z. B. EX, WS, ZN
 * @param {string[]} data.symptoms - Leitsymptomatiken
 * @param {string} data.remedy - Heilmittel
 * @param {number|string} data.units - Anzahl Behandlungseinheiten
 * @param {string} data.icd10 - ICD-10 Code
 * @param {string} data.frequency - Therapiefrequenz
 * @param {Array} csvData - Geladene CSV-Daten
 *
 * @returns {Object} Prüfergebnis
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
    const issueDate = new Date(data.issueDate)

    if (Number.isNaN(issueDate.getTime())) {
      errors.push('Ungültiges Datumsformat.')
    } else {
      const latestStart = addDays(issueDate, 28)
      latestStartDate = format(latestStart, 'dd.MM.yyyy', { locale: de })
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

  if (!data.units || Number.isNaN(units) || units <= 0) {
    errors.push('Bitte Behandlungseinheiten eingeben.')
  }

  // ============================================
  // REGEL 5: Zusatzprüfung bei mehr als 6 Einheiten
  // ============================================
  if (units > 6) {
    // 5a: Therapiefrequenz ist Pflicht
    if (!data.frequency) {
      errors.push('Bei mehr als 6 Behandlungseinheiten muss eine Therapiefrequenz angegeben werden.')
    } else {
      const minFrequency = FREQUENCY_MAP[data.frequency] || 1
      const requiredWeeks = Math.ceil(units / minFrequency)

      if (requiredWeeks > 12) {
        errors.push(
          'Die Verordnung kann mit der angegebenen Frequenz rechnerisch nicht innerhalb von 12 Wochen abgeschlossen werden.'
        )
      }
    }

    // 5b: ICD-10 ist Pflicht
    const icd10Normalized = normalizeIcd10(data.icd10)

    if (!icd10Normalized) {
      errors.push('Bei mehr als 6 Behandlungseinheiten muss ein ICD-10-Code angegeben werden.')
    } else if (csvData.length > 0) {
      csvMatch = findIcdInCsv(icd10Normalized, csvData)

      if (!csvMatch) {
        errors.push(
          `Der ICD-10-Code "${data.icd10}" wurde nicht in der Diagnoseliste für langfristigen Heilmittelbedarf / besonderen Verordnungsbedarf gefunden. Die Verordnung ist bei mehr als 6 Behandlungseinheiten nur mit einem gelisteten ICD-10-Code zulässig.`
        )
      } else {
        const physioGroups = parsePhysioGroups(csvMatch.Physio)

        // Diagnosegruppe gegen Physio-Spalte prüfen
        if (data.diagnosisGroup && physioGroups.length > 0) {
          const inputGroup = data.diagnosisGroup.trim().toUpperCase()
          const groupMatches = physioGroups.includes(inputGroup)

          if (!groupMatches) {
            errors.push(
              `Diagnosegruppe passt nicht zur ICD-10-Diagnose. Erwartet: ${physioGroups.join(', ')}, eingegeben: ${data.diagnosisGroup}.`
            )
          }
        }

        // Neutrale Hinweise aus CSV
        if (csvMatch.Diagnose?.trim()) {
          infos.push(`Diagnose: ${csvMatch.Diagnose}`)
        }

        if (csvMatch.Hinweis?.trim()) {
          infos.push(`Hinweis aus Diagnoseliste: ${csvMatch.Hinweis}`)
        }

        if (physioGroups.length > 0) {
          infos.push(`Erlaubte Physio-Diagnosegruppen laut Liste: ${physioGroups.join(', ')}`)
        }
      }
    }
  }

  const hasErrors = errors.length > 0

  return {
    status: hasErrors ? 'error' : 'success',
    title: hasErrors
      ? 'Formale Fehler gefunden'
      : 'Die Verordnung wurde formal korrekt ausgestellt',
    errors,
    infos,
    latestStartDate,
    csvMatch,
  }
}

/**
 * Normalisiert einen ICD-10 Code.
 */
function normalizeIcd10(icd10) {
  if (!icd10) return ''
  return icd10.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Sucht einen ICD-10 Code in den CSV-Daten.
 *
 * Suchlogik:
 * 1. exakter Treffer in ICD1 oder ICD2
 * 2. Bereichstreffer, z. B. CSV enthält M17 und Eingabe ist M17.1
 *
 * Wichtig:
 * Es wird niemals einfach ein vorheriger CSV-Eintrag übernommen.
 */
function findIcdInCsv(icd10, csvData) {
  // 1. Exakter Treffer
  for (const row of csvData) {
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)

    if (icd1 === icd10 || icd2 === icd10) {
      return row
    }
  }

  // 2. Bereichstreffer
  for (const row of csvData) {
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)

    if (
      row.Physio?.trim() &&
      (
        (icd1 && icd10.startsWith(icd1)) ||
        (icd2 && icd10.startsWith(icd2))
      )
    ) {
      return row
    }
  }

  return null
}

/**
 * Parst die Physio-Spalte und extrahiert einzelne Diagnosegruppen.
 *
 * Erlaubte Formate:
 * EX
 * EX/WS
 * EX / WS
 * EX, WS
 * EX;WS
 */
function parsePhysioGroups(physioString) {
  if (!physioString) return []

  return physioString
    .split(/[;,/\s]+/)
    .map(group => group.trim().toUpperCase())
    .filter(group => group.length > 0)
}

/**
 * Lädt und parst die CSV-Datei mit der Diagnoseliste.
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
 * Parst CSV-Text in ein Array von Objekten.
 */
function parseCsv(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim())

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0])
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
 * Parst eine einzelne CSV-Zeile.
 * Unterstützt Semikolon als Trennzeichen und Anführungszeichen.
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

  values.push(current.trim())

  return values
}