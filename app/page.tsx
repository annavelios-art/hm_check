"use client"

import { useState } from "react"
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  format, 
  parseISO,
  isValid
} from "date-fns"
import { de } from "date-fns/locale"
import { 
  Calendar, 
  CalendarDays, 
  RotateCcw, 
  AlertCircle,
  FileText,
  ClipboardList,
  Receipt
} from "lucide-react"

/* ============================================
   EDITIERBARE HINWEISTEXTE
   ============================================
   Hier können die Hinweistexte einfach 
   angepasst werden:
   ============================================ */

const HINWEISE = {
  // Gruppe 1: Verordnung
  verordnung: {
    text: "Bei Verordnungen gilt: Der Therapiebeginn muss innerhalb von 28 Tagen (bei dringlichem Behandlungsbedarf 14 Tage) nach Ausstellung erfolgen. Rezepte sind 3 Monate gültig, unbenutzt sogar 6 Monate.",
    type: "info" as const
  },
  
  // Gruppe 2: Blanko-VO
  blankoVO_1: {
    text: "Blanko-Verordnungen gelten 16 Wochen ab Ausstellungsdatum. Der Therapiebeginn muss dennoch innerhalb von 28 Tagen erfolgen.",
    type: "info" as const
  },
  blankoVO_2: {
    text: "Bei dringlichem Behandlungsbedarf (D-Vermerk) beträgt die Frist für den Therapiebeginn nur 14 Tage.",
    type: "warning" as const
  },
  
  // Gruppe 3: Abrechnung
  abrechnung: {
    text: "Die Abrechnung muss spätestens 9 Monate nach der letzten Behandlung bei der Krankenkasse eingereicht werden.",
    type: "info" as const
  }
}

/* ============================================
   HELPER FUNKTIONEN
   ============================================ */

// Formatiert ein Datum mit deutschem Wochentag
function formatDateWithWeekday(date: Date): string {
  return format(date, "dd.MM.yyyy (EEEE)", { locale: de })
}

// Formatiert ein Datum ohne Wochentag
function formatDate(date: Date): string {
  return format(date, "dd.MM.yyyy", { locale: de })
}

// Gibt das heutige Datum als ISO-String zurück
function getTodayISO(): string {
  return format(new Date(), "yyyy-MM-dd")
}

/* ============================================
   KOMPONENTEN
   ============================================ */

// Hinweisbox-Komponente
interface HinweisboxProps {
  text: string
  type?: "info" | "warning" | "success"
}

function Hinweisbox({ text, type = "info" }: HinweisboxProps) {
  const styles = {
    info: "bg-info border-info-border text-info-foreground",
    warning: "bg-warning border-warning-border text-warning-foreground",
    success: "bg-success border-success-border text-success-foreground"
  }
  
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${styles[type]}`}>
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  )
}

// Datum-Eingabe-Komponente
interface DatumEingabeProps {
  value: string
  onChange: (value: string) => void
  onToday: () => void
  onReset: () => void
}

function DatumEingabe({ value, onChange, onToday, onReset }: DatumEingabeProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-muted-foreground">
        Datum auswählen
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-base rounded-xl border-2 border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToday}
            className="flex-1 sm:flex-none px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CalendarDays className="w-5 h-5" />
            <span>Heute</span>
          </button>
          <button
            onClick={onReset}
            className="flex-1 sm:flex-none px-4 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Ergebnis-Zeile
interface ErgebnisZeileProps {
  label: string
  value: string
  highlight?: boolean
}

function ErgebnisZeile({ label, value, highlight = false }: ErgebnisZeileProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border/50 last:border-0 gap-1 sm:gap-4 ${highlight ? 'bg-primary/5 -mx-4 px-4 rounded-lg' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold text-base ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}

// Gruppe 1: Verordnung
function GruppeVerordnung() {
  const [datum, setDatum] = useState("")
  
  const berechnungen = datum && isValid(parseISO(datum)) ? {
    plus28Tage: addDays(parseISO(datum), 28),
    plus14Tage: addDays(parseISO(datum), 14),
    plus3Monate: addMonths(parseISO(datum), 3),
    plus6Monate: addMonths(parseISO(datum), 6)
  } : null
  
  return (
    <div className="bg-group-1 border-2 border-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Verordnung</h2>
      </div>
      
      {/* Datum-Eingabe */}
      <DatumEingabe
        value={datum}
        onChange={setDatum}
        onToday={() => setDatum(getTodayISO())}
        onReset={() => setDatum("")}
      />
      
      {/* Ergebnisse */}
      {berechnungen && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-1">
          <h3 className="font-semibold text-foreground mb-3">Berechnete Fristen</h3>
          <ErgebnisZeile 
            label="Therapiebeginn spätestens (+28 Tage):" 
            value={formatDateWithWeekday(berechnungen.plus28Tage)}
            highlight
          />
          <ErgebnisZeile 
            label="Bei Dringlichkeit (+14 Tage):" 
            value={formatDateWithWeekday(berechnungen.plus14Tage)}
          />
          <ErgebnisZeile 
            label="Rezept gültig bis (+3 Monate):" 
            value={formatDate(berechnungen.plus3Monate)}
          />
          <ErgebnisZeile 
            label="Unbenutzt gültig bis (+6 Monate):" 
            value={formatDate(berechnungen.plus6Monate)}
          />
        </div>
      )}
      
      {/* Hinweisbox */}
      <Hinweisbox text={HINWEISE.verordnung.text} type={HINWEISE.verordnung.type} />
    </div>
  )
}

// Gruppe 2: Blanko-VO
function GruppeBlankoVO() {
  const [datum, setDatum] = useState("")
  
  const berechnungen = datum && isValid(parseISO(datum)) ? {
    plus16Wochen: addWeeks(parseISO(datum), 16),
    plus28Tage: addDays(parseISO(datum), 28),
    plus14Tage: addDays(parseISO(datum), 14)
  } : null
  
  return (
    <div className="bg-group-2 border-2 border-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-accent/10 rounded-xl">
          <ClipboardList className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Blanko-VO</h2>
      </div>
      
      {/* Datum-Eingabe */}
      <DatumEingabe
        value={datum}
        onChange={setDatum}
        onToday={() => setDatum(getTodayISO())}
        onReset={() => setDatum("")}
      />
      
      {/* Ergebnisse */}
      {berechnungen && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-1">
          <h3 className="font-semibold text-foreground mb-3">Berechnete Fristen</h3>
          <ErgebnisZeile 
            label="Blanko-VO gültig bis (+16 Wochen):" 
            value={formatDate(berechnungen.plus16Wochen)}
            highlight
          />
          <ErgebnisZeile 
            label="Therapiebeginn spätestens (+28 Tage):" 
            value={formatDateWithWeekday(berechnungen.plus28Tage)}
          />
          <ErgebnisZeile 
            label="Bei Dringlichkeit (+14 Tage):" 
            value={formatDateWithWeekday(berechnungen.plus14Tage)}
          />
        </div>
      )}
      
      {/* Hinweisboxen */}
      <div className="space-y-3">
        <Hinweisbox text={HINWEISE.blankoVO_1.text} type={HINWEISE.blankoVO_1.type} />
        <Hinweisbox text={HINWEISE.blankoVO_2.text} type={HINWEISE.blankoVO_2.type} />
      </div>
    </div>
  )
}

// Gruppe 3: Abrechnung
function GruppeAbrechnung() {
  const [datum, setDatum] = useState("")
  
  const berechnungen = datum && isValid(parseISO(datum)) ? {
    plus9Monate: addMonths(parseISO(datum), 9)
  } : null
  
  return (
    <div className="bg-group-3 border-2 border-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <Receipt className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Abrechnung</h2>
      </div>
      
      {/* Datum-Eingabe */}
      <DatumEingabe
        value={datum}
        onChange={setDatum}
        onToday={() => setDatum(getTodayISO())}
        onReset={() => setDatum("")}
      />
      
      {/* Ergebnisse */}
      {berechnungen && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-1">
          <h3 className="font-semibold text-foreground mb-3">Berechnete Frist</h3>
          <ErgebnisZeile 
            label="Abrechnung einreichen bis (+9 Monate):" 
            value={formatDate(berechnungen.plus9Monate)}
            highlight
          />
        </div>
      )}
      
      {/* Hinweisbox */}
      <Hinweisbox text={HINWEISE.abrechnung.text} type={HINWEISE.abrechnung.type} />
    </div>
  )
}

// Mobile Tab Navigation
type TabType = "verordnung" | "blanko" | "abrechnung"

interface MobileTabsProps {
  activeTab: TabType
  onChange: (tab: TabType) => void
}

function MobileTabs({ activeTab, onChange }: MobileTabsProps) {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "verordnung", label: "Verordnung", icon: <FileText className="w-4 h-4" /> },
    { id: "blanko", label: "Blanko-VO", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "abrechnung", label: "Abrechnung", icon: <Receipt className="w-4 h-4" /> }
  ]
  
  return (
    <div className="flex bg-secondary rounded-xl p-1.5 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === tab.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.icon}
          <span className="hidden xs:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ============================================
   HAUPTKOMPONENTE
   ============================================ */

export default function HeilmittelRechner() {
  const [activeTab, setActiveTab] = useState<TabType>("verordnung")
  
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-primary rounded-xl">
              <CalendarDays className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Datumsrechner Heilmittel
            </h1>
          </div>
        </div>
      </header>
      
      {/* Mobile Tabs - nur auf kleinen Bildschirmen */}
      <div className="lg:hidden sticky top-[73px] z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <MobileTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Desktop: Alle Gruppen nebeneinander/untereinander */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          <GruppeVerordnung />
          <GruppeBlankoVO />
          <GruppeAbrechnung />
        </div>
        
        {/* Mobile: Nur aktive Gruppe */}
        <div className="lg:hidden">
          {activeTab === "verordnung" && <GruppeVerordnung />}
          {activeTab === "blanko" && <GruppeBlankoVO />}
          {activeTab === "abrechnung" && <GruppeAbrechnung />}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="text-center py-6 text-sm text-muted-foreground border-t border-border mt-8">
        <p>Alle Berechnungen ohne Gewähr. Bitte beachten Sie die aktuellen Richtlinien.</p>
      </footer>
    </main>
  )
}
