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

const FREQUENCY_MAP = {
  '1x wöchentlich': 1,
  '1-2x wöchentlich': 1,
  '2x wöchentlich': 2,
  '2-3x wöchentlich': 2,
  '3x wöchentlich': 3,
  '4x wöchentlich': 4,
}

export function checkPrescription(data, csvData = []) {
  const errors = []
  const infos = []
  let latestStartDate = null
  const csvMatches = []

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

  if (!data.diagnosisGroup) {
    errors.push('Bitte Diagnosegruppe auswählen.')
  }

  if (!data.remedy) {
    errors.push('Bitte Heilmittel auswählen.')
  }

  const units = parseInt(data.units, 10)

  if (!data.units || Number.isNaN(units) || units <= 0) {
    errors.push('Bitte Behandlungseinheiten eingeben.')
  }

  if (units > 6) {
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

    const icd10Codes = getNormalizedIcd10Codes(data)

    if (icd10Codes.length === 0) {
      errors.push('Bei mehr als 6 Behandlungseinheiten muss mindestens ein ICD-10-Code angegeben werden.')
    } else if (csvData.length > 0) {
      const checkedCodes = icd10Codes.map(code => {
        const match = findIcdInCsv(code, csvData)

        if (!match) {
          return {
            code,
            match: null,
            physioGroups: [],
            groupMatches: false,
          }
        }

        const physioGroups = parsePhysioGroups(match.Physio)
        const inputGroup = data.diagnosisGroup?.trim().toUpperCase()
        const groupMatches =
          !inputGroup ||
          physioGroups.length === 0 ||
          physioGroups.includes(inputGroup)

        return {
          code,
          match,
          physioGroups,
          groupMatches,
        }
      })

      const validCode = checkedCodes.find(item => item.match && item.groupMatches)

      checkedCodes.forEach(item => {
        if (!item.match) {
          infos.push(
            `ICD-10 "${item.code}" wurde nicht in der Diagnoseliste für langfristigen Heilmittelbedarf / besonderen Verordnungsbedarf gefunden.`
          )
          return
        }

        csvMatches.push(item.match)

        infos.push(
          `ICD-10 "${item.code}" wurde in der Diagnoseliste für langfristigen Heilmittelbedarf / besonderen Verordnungsbedarf gefunden.`
        )

        if (item.match.Diagnose?.trim()) {
          infos.push(`Diagnose zu "${item.code}": ${item.match.Diagnose.trim()}`)
        }

        if (item.match.Hinweis?.trim()) {
          infos.push(`Hinweis zu "${item.code}": ${item.match.Hinweis.trim()}`)
        }

        if (item.physioGroups.length > 0) {
          infos.push(
            `Erlaubte Physio-Diagnosegruppen zu "${item.code}" laut Liste: ${item.physioGroups.join(', ')}`
          )
        }

        if (!item.groupMatches && data.diagnosisGroup) {
          infos.push(
            `ICD-10 "${item.code}" wurde gefunden, passt aber nicht zur eingegebenen Diagnosegruppe "${data.diagnosisGroup}".`
          )
        }
      })

      if (!validCode) {
        errors.push(
          'Keiner der eingegebenen ICD-10-Codes passt zur ausgewählten Diagnosegruppe. Die Verordnung ist bei mehr als 6 Behandlungseinheiten nur mit einem passenden gelisteten ICD-10-Code zulässig.'
        )
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
    csvMatches,
  }
}

function getNormalizedIcd10Codes(data) {
  if (Array.isArray(data.icd10Codes)) {
    return data.icd10Codes
      .map(code => normalizeIcd10(code))
      .filter(Boolean)
  }

  const legacyCode = normalizeIcd10(data.icd10)

  return legacyCode ? [legacyCode] : []
}

function normalizeIcd10(icd10) {
  if (!icd10) return ''
  return icd10.trim().toUpperCase().replace(/\s+/g, '')
}

function findIcdInCsv(icd10, csvData) {
  for (const row of csvData) {
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)

    if (icd1 === icd10 || icd2 === icd10) {
      return row
    }
  }

  for (const row of csvData) {
    const icd1 = normalizeIcd10(row.ICD1)
    const icd2 = normalizeIcd10(row.ICD2)

    if (
      row.Physio?.trim() &&
      ((icd1 && icd10.startsWith(icd1)) || (icd2 && icd10.startsWith(icd2)))
    ) {
      return row
    }
  }

  return null
}

function parsePhysioGroups(physioString) {
  if (!physioString) return []

  return physioString
    .split(/[;,/\s]+/)
    .map(group => group.trim().toUpperCase())
    .filter(group => group.length > 0)
}

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