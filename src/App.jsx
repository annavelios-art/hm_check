import { useState, useEffect } from 'react'
import { 
  ClipboardCheck, 
  Calendar, 
  Stethoscope, 
  Activity, 
  Pill, 
  Hash, 
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  RotateCcw,
  Loader2
} from 'lucide-react'
import { checkPrescription, loadCsvData } from './lib/checkPrescription'

/**
 * Heilmittel-Check PWA
 * 
 * Mobile-first Progressive Web App zur Prüfung von Heilmittelverordnungen (Muster 13)
 * Prüft ausschließlich die formelle/abrechnungsrelevante Plausibilität.
 */

// ============================================
// Konfigurationsdaten
// ============================================

/** Verfügbare Diagnosegruppen */
const DIAGNOSIS_GROUPS = ['EX', 'WS', 'CS', 'LY', 'PN', 'AT', 'ZN', 'SO1', 'SO2', 'SO3', 'SO4', 'SO5', 'GE']

/** Verfügbare Leitsymptomatiken */
const SYMPTOMS = [
  { id: 'a', label: 'a' },
  { id: 'b', label: 'b' },
  { id: 'c', label: 'c' },
  { id: 'x', label: 'x (patientenindividuelle Leitsymptomatik)' }
]

/** Verfügbare Heilmittel */
const REMEDIES = [
  'Krankengymnastik',
  'Manuelle Therapie',
  'KG-ZNS (Bobath/Vojta/PNF)',
  'KG-Gerät',
  'KG-Mukoviszidose',
  'MLD30',
  'MLD45',
  'MLD60',
  'Klassische Massagetherapie',
  'Bindegewebsmassage',
  'Wärmetherapie',
  'Kältetherapie',
  'Elektrotherapie',
  'Ultraschalltherapie',
  'Traktionsbehandlung'
]

/** Verfügbare Therapiefrequenzen */
const FREQUENCIES = [
  '1x wöchentlich',
  '1-2x wöchentlich',
  '2x wöchentlich',
  '2-3x wöchentlich',
  '3x wöchentlich',
  '4x wöchentlich'
]

// ============================================
// Haupt-App-Komponente
// ============================================

export default function App() {
  // Formular-State
  const [formData, setFormData] = useState({
    issueDate: '',
    diagnosisGroup: '',
    symptoms: [],
    remedy: '',
    units: '',
    icd10: '',
    frequency: ''
  })
  
  // Prüfergebnis
  const [result, setResult] = useState(null)
  
  // CSV-Daten
  const [csvData, setCsvData] = useState([])
  const [csvLoading, setCsvLoading] = useState(true)
  
  // CSV-Daten beim Start laden
  useEffect(() => {
    async function loadData() {
      setCsvLoading(true)
      const data = await loadCsvData()
      setCsvData(data)
      setCsvLoading(false)
    }
    loadData()
  }, [])
  
  /**
   * Formular-Feld aktualisieren
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Ergebnis zurücksetzen bei Änderungen
    if (result) setResult(null)
  }
  
  /**
   * Symptom toggle
   */
  const toggleSymptom = (symptomId) => {
    setFormData(prev => {
      const symptoms = prev.symptoms.includes(symptomId)
        ? prev.symptoms.filter(s => s !== symptomId)
        : [...prev.symptoms, symptomId]
      return { ...prev, symptoms }
    })
    if (result) setResult(null)
  }
  
  /**
   * Verordnung prüfen
   */
  const handleCheck = () => {
    const checkResult = checkPrescription(formData, csvData)
    setResult(checkResult)
    
    // Zum Ergebnis scrollen
    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }
  
  /**
   * Formular zurücksetzen
   */
  const handleReset = () => {
    setFormData({
      issueDate: '',
      diagnosisGroup: '',
      symptoms: [],
      remedy: '',
      units: '',
      icd10: '',
      frequency: ''
    })
    setResult(null)
    // Nach oben scrollen
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <header className="bg-blue-800 text-white py-4 px-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-semibold">Heilmittel-Check</h1>
            <p className="text-blue-200 text-sm">Verordnungsprüfung Muster 13</p>
          </div>
        </div>
      </header>
      
      {/* Hauptinhalt */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        
        {/* Info-Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Diese App prüft die <strong>formale Plausibilität</strong> einer Heilmittelverordnung. 
            Sie ersetzt keine medizinische oder rechtliche Beratung.
          </p>
        </div>
        
        {/* CSV-Ladestatus */}
        {csvLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            <p className="text-sm text-amber-800">Diagnoseliste wird geladen...</p>
          </div>
        )}
        
        {/* Formular-Karten */}
        <FormSection 
          icon={<Calendar className="w-5 h-5" />}
          title="Ausstellungsdatum"
        >
          <input
            type="date"
            value={formData.issueDate}
            onChange={(e) => updateField('issueDate', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </FormSection>
        
        <FormSection 
          icon={<Stethoscope className="w-5 h-5" />}
          title="Diagnosegruppe"
        >
          <select
            value={formData.diagnosisGroup}
            onChange={(e) => updateField('diagnosisGroup', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
          >
            <option value="">Bitte auswählen...</option>
            {DIAGNOSIS_GROUPS.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </FormSection>
        
        <FormSection 
          icon={<Activity className="w-5 h-5" />}
          title="Leitsymptomatik"
          subtitle="Mehrfachauswahl möglich"
        >
          <div className="space-y-2">
            {SYMPTOMS.map(symptom => (
              <label 
                key={symptom.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.symptoms.includes(symptom.id)}
                  onChange={() => toggleSymptom(symptom.id)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">{symptom.label}</span>
              </label>
            ))}
          </div>
        </FormSection>
        
        <FormSection 
          icon={<Pill className="w-5 h-5" />}
          title="Heilmittel"
        >
          <select
            value={formData.remedy}
            onChange={(e) => updateField('remedy', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
          >
            <option value="">Bitte auswählen...</option>
            {REMEDIES.map(remedy => (
              <option key={remedy} value={remedy}>{remedy}</option>
            ))}
          </select>
        </FormSection>
        
        <FormSection 
          icon={<Hash className="w-5 h-5" />}
          title="Behandlungseinheiten"
        >
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="99"
            value={formData.units}
            onChange={(e) => updateField('units', e.target.value)}
            placeholder="z.B. 6"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </FormSection>
        
        {/* ICD-10 und Therapiefrequenz nur anzeigen wenn Behandlungseinheiten > 6 */}
        {parseInt(formData.units, 10) > 6 && (
          <>
            <FormSection 
              icon={<FileText className="w-5 h-5" />}
              title="ICD-10 Code"
              subtitle="Pflichtfeld bei mehr als 6 Einheiten"
            >
              <input
                type="text"
                value={formData.icd10}
                onChange={(e) => updateField('icd10', e.target.value.toUpperCase())}
                placeholder="z.B. M54.5"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all uppercase"
              />
              <p className="text-xs text-slate-500 mt-2">
                Der ICD-10-Code muss in der Diagnoseliste für langfristigen Heilmittelbedarf / besonderen Verordnungsbedarf enthalten sein.
              </p>
            </FormSection>
            
            <FormSection 
              icon={<Clock className="w-5 h-5" />}
              title="Therapiefrequenz"
              subtitle="Pflichtfeld bei mehr als 6 Einheiten"
            >
              <select
                value={formData.frequency}
                onChange={(e) => updateField('frequency', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
              >
                <option value="">Bitte auswählen...</option>
                {FREQUENCIES.map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </FormSection>
          </>
        )}
        
        {/* Aktions-Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCheck}
            className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ClipboardCheck className="w-5 h-5" />
            Verordnung prüfen
          </button>
          
          <button
            onClick={handleReset}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-4 px-4 rounded-xl transition-all flex items-center justify-center active:scale-[0.98]"
            title="Zurücksetzen"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Ergebnis-Anzeige */}
        {result && (
          <div id="result-section" className="pt-4">
            <ResultDisplay result={result} />
          </div>
        )}
        
      </main>
      
      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 pt-8 pb-4">
        <p className="text-center text-sm text-slate-500">
          Keine Gewähr für Vollständigkeit oder Richtigkeit.
          <br />
          Stand der Prüfregeln: 2024
        </p>
      </footer>
    </div>
  )
}

// ============================================
// Hilfskomponenten
// ============================================

/**
 * Formular-Sektion mit Icon und Titel
 */
function FormSection({ icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <span className="text-blue-700">{icon}</span>
        <div>
          <h2 className="font-medium text-slate-800">{title}</h2>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

/**
 * Ergebnis-Anzeige Komponente
 */
function ResultDisplay({ result }) {
  const isSuccess = result.status === 'success'
  
  return (
    <div className="space-y-4">
      {/* Hauptergebnis-Karte */}
      <div 
        className={`rounded-xl border-2 overflow-hidden shadow-lg ${
          isSuccess 
            ? 'border-emerald-400 bg-emerald-50' 
            : 'border-red-400 bg-red-50'
        }`}
      >
        {/* Status-Balken */}
        <div 
          className={`py-4 px-5 flex items-center gap-3 ${
            isSuccess ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {isSuccess 
            ? <CheckCircle2 className="w-7 h-7 text-white" />
            : <XCircle className="w-7 h-7 text-white" />
          }
          <h3 className="text-lg font-semibold text-white">
            {result.title}
          </h3>
        </div>
        
        {/* Inhalt */}
        <div className="p-5 space-y-4">
          {/* Spätester Therapiebeginn bei Erfolg */}
          {isSuccess && result.latestStartDate && (
            <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-emerald-200">
              <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-700">
                  Die Therapie muss spätestens am{' '}
                  <strong className="text-emerald-700">{result.latestStartDate}</strong>{' '}
                  begonnen werden.
                </p>
              </div>
            </div>
          )}
          
          {/* Fehlerliste bei Fehler */}
          {!isSuccess && result.errors.length > 0 && (
            <div className="space-y-2">
              {result.errors.map((error, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 bg-white rounded-lg p-4 border border-red-200"
                >
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700">{error}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Hinweise-Block (neutral) */}
      {result.infos.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl overflow-hidden">
          <div className="py-3 px-5 bg-sky-100 border-b border-sky-200 flex items-center gap-2">
            <Info className="w-5 h-5 text-sky-700" />
            <h4 className="font-medium text-sky-800">Hinweise</h4>
          </div>
          <div className="p-4 space-y-3">
            {result.infos.map((info, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 bg-white rounded-lg p-3 border border-sky-200"
              >
                <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{info}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* CSV-Match Info */}
      {result.csvMatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-amber-700" />
            <span className="font-medium text-amber-800">Eintrag in Diagnoseliste gefunden</span>
          </div>
          <p className="text-sm text-amber-700">
            Der ICD-10 Code wurde in der Diagnoseliste für langfristigen Heilmittelbedarf / 
            besonderen Verordnungsbedarf gefunden.
          </p>
        </div>
      )}
    </div>
  )
}
