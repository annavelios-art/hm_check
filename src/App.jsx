import { useState, useEffect } from 'react'
import {
  ClipboardCheck,
  Calendar,
  Stethoscope,
  Pill,
  Hash,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { checkPrescription, loadCsvData } from './lib/checkPrescription'

const DIAGNOSIS_GROUPS = ['EX', 'WS', 'CS', 'LY', 'PN', 'AT', 'ZN', 'SO1', 'SO2', 'SO3', 'SO4', 'SO5', 'GE']

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
  'Traktionsbehandlung',
]

const FREQUENCIES = [
  '1x wöchentlich',
  '1-2x wöchentlich',
  '2x wöchentlich',
  '2-3x wöchentlich',
  '3x wöchentlich',
  '4x wöchentlich',
]

export default function App() {
  const [formData, setFormData] = useState({
    issueDate: '',
    diagnosisGroup: '',
    remedy: '',
    units: '',
    icd10: '',
    frequency: '',
  })

  const [result, setResult] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [csvLoading, setCsvLoading] = useState(true)

  const showExtendedFields = parseInt(formData.units, 10) > 6

  useEffect(() => {
    async function loadData() {
      setCsvLoading(true)
      const data = await loadCsvData()
      setCsvData(data)
      setCsvLoading(false)
    }

    loadData()
  }, [])

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (result) setResult(null)
  }

  const handleCheck = () => {
    const checkResult = checkPrescription(formData, csvData)
    setResult(checkResult)

    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  const handleReset = () => {
    setFormData({
      issueDate: '',
      diagnosisGroup: '',
      remedy: '',
      units: '',
      icd10: '',
      frequency: '',
    })
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <header className="bg-slate-800 text-white px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-sky-300" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">Heilmittel-Check</h1>
            <p className="text-xs text-slate-300">Formale Prüfung Muster 13</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p>
              Werkzeug zur formalen Plausibilitätsprüfung. Keine medizinische oder rechtliche Beratung.
            </p>
          </div>
        </div>

        {csvLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
            <p className="text-sm text-amber-800">Diagnoseliste wird geladen...</p>
          </div>
        )}

        <section className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-200 border-b border-slate-300 px-4 py-2">
            <h2 className="font-semibold text-slate-800">Verordnung prüfen</h2>
          </div>

          <div className="p-4 flex flex-col gap-6">
            <Field label="Ausstellungsdatum" icon={<Calendar className="w-4 h-4" />}>
              <input
                type="date"
                value={formData.issueDate}
                onChange={e => updateField('issueDate', e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Diagnosegruppe" icon={<Stethoscope className="w-4 h-4" />}>
              <select
                value={formData.diagnosisGroup}
                onChange={e => updateField('diagnosisGroup', e.target.value)}
                className="input"
              >
                <option value="">Bitte auswählen...</option>
                {DIAGNOSIS_GROUPS.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </Field>

            <Field label="Heilmittel" icon={<Pill className="w-4 h-4" />}>
              <select
                value={formData.remedy}
                onChange={e => updateField('remedy', e.target.value)}
                className="input"
              >
                <option value="">Bitte auswählen...</option>
                {REMEDIES.map(remedy => (
                  <option key={remedy} value={remedy}>{remedy}</option>
                ))}
              </select>
            </Field>

            <Field label="Behandlungseinheiten" icon={<Hash className="w-4 h-4" />}>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                value={formData.units}
                onChange={e => updateField('units', e.target.value)}
                placeholder="z. B. 6"
                className="input"
              />
            </Field>

            {showExtendedFields && (
              <div className="border-t border-slate-200 pt-6 flex flex-col gap-6">
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-800">
                  Bei mehr als 6 Behandlungseinheiten sind ICD-10 und Therapiefrequenz erforderlich.
                </div>

                <Field label="ICD-10 Code" icon={<FileText className="w-4 h-4" />}>
                  <input
                    type="text"
                    value={formData.icd10}
                    onChange={e => updateField('icd10', e.target.value.toUpperCase())}
                    placeholder="z. B. M17.1"
                    className="input uppercase"
                  />
                </Field>

                <Field label="Therapiefrequenz" icon={<Clock className="w-4 h-4" />}>
                  <select
                    value={formData.frequency}
                    onChange={e => updateField('frequency', e.target.value)}
                    className="input"
                  >
                    <option value="">Bitte auswählen...</option>
                    {FREQUENCIES.map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <div className="flex gap-4 pt-8">
              <button
                onClick={handleCheck}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-md transition flex items-center justify-center gap-2"
              >
                <ClipboardCheck className="w-5 h-5" />
                Prüfen
              </button>

              <button
                onClick={handleReset}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-md transition flex items-center justify-center"
                title="Zurücksetzen"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {result && (
          <div id="result-section">
            <ResultDisplay result={result} />
          </div>
        )}
      </main>

      <footer className="max-w-2xl mx-auto px-4 pt-4 pb-6">
        <p className="text-center text-xs text-slate-500">
          Datenstand Diagnoseliste / Prüfregeln: 2024
        </p>
      </footer>
    </div>
  )
}

function Field({ label, icon, children }) {
  return (
    <label className="block mb-6">
      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-700">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      {children}
    </label>
  )
}

function ResultDisplay({ result }) {
  const isSuccess = result.status === 'success'

  return (
    <section className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
      <div className={isSuccess ? 'bg-emerald-600 text-white px-4 py-3' : 'bg-red-600 text-white px-4 py-3'}>
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <XCircle className="w-6 h-6" />
          )}
          <h2 className="font-semibold text-lg">{result.title}</h2>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isSuccess && result.latestStartDate && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3">
            <p className="text-sm text-emerald-900">
              Therapiebeginn spätestens am{' '}
              <strong>{result.latestStartDate}</strong>.
            </p>
          </div>
        )}

        {!isSuccess && result.errors.length > 0 && (
          <div className="space-y-2">
            {result.errors.map((error, index) => (
              <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-3 flex gap-2">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-950">{error}</p>
              </div>
            ))}
          </div>
        )}

        {result.infos.length > 0 && (
          <div className="border border-slate-200 bg-slate-50 rounded-lg overflow-hidden">
            <div className="bg-slate-200 px-3 py-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-800">Hinweise</h3>
            </div>
            <div className="p-3 space-y-2">
              {result.infos.map((info, index) => (
                <p key={index} className="text-sm text-slate-700">
                  • {info}
                </p>
              ))}
            </div>
          </div>
        )}

        {result.csvMatch && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              ICD-10 wurde in der Diagnoseliste für langfristigen Heilmittelbedarf /
              besonderen Verordnungsbedarf gefunden.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}