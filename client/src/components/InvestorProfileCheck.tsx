import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Wallet,
  Shield,
  Target,
  Users,
  Info,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Answer {
  questionId: string;
  value: string | string[];
}

interface ProfileResult {
  category: "conservative" | "balanced" | "growth" | "professional";
  title: string;
  description: string;
  recommendation: string;
  riskScore: number;
}

const sections = [
  { id: "rendite", title: "Renditeerwartungen", icon: TrendingUp },
  { id: "kapital", title: "Kapital & Timing", icon: Wallet },
  { id: "risiko", title: "Risiko-Check", icon: Shield },
  { id: "portfolio", title: "Portfolio & Erfahrung", icon: BarChart3 },
  { id: "zusammenarbeit", title: "Zusammenarbeit", icon: Users },
];

const questions = [
  // Abschnitt 1: Renditeerwartungen
  {
    id: "rendite_erwartung",
    section: "rendite",
    question: "Welche jährliche Rendite erwarten Sie von Ihren Investments?",
    type: "single",
    options: [
      { value: "a", label: "Unter 2% p.a.", info: "Das entspricht aktuell Tagesgeld/Festgeld. Inflationsbereinigt oft negativ." },
      { value: "b", label: "2-5% p.a.", info: "Das entspricht etwa Staatsanleihen oder konservativen Mischfonds." },
      { value: "c", label: "5-8% p.a.", info: "Das entspricht der historischen DAX-Rendite (mit erheblichen Schwankungen)." },
      { value: "d", label: "8-12% p.a.", info: "Das entspricht erfolgreichen Unternehmensanleihen oder Private Equity." },
      { value: "e", label: "Über 12% p.a.", info: "Sehr ambitioniert - nur mit erhöhtem Risiko oder Spezialsituationen erreichbar." },
    ],
    hint: "Die Angelus Group bietet Renditen im Bereich von 8-12% p.a. bei entsprechendem Risikoprofil.",
  },
  {
    id: "rendite_sicherheit",
    section: "rendite",
    question: "Was ist Ihnen wichtiger?",
    type: "single",
    options: [
      { value: "a", label: "Kapitalerhalt hat absolute Priorität, auch bei geringer Rendite" },
      { value: "b", label: "Ausgewogenes Verhältnis zwischen Sicherheit und Rendite" },
      { value: "c", label: "Höhere Rendite ist mir wichtiger, ich akzeptiere Schwankungen" },
      { value: "d", label: "Maximale Rendite, ich kann auch Verluste verkraften" },
    ],
  },
  // Abschnitt 2: Kapital & Timing
  {
    id: "kapital_verfuegbar",
    section: "kapital",
    question: "Wann steht Ihr geplantes Investitionskapital zur Verfügung?",
    type: "single",
    options: [
      { value: "a", label: "Sofort verfügbar" },
      { value: "b", label: "Innerhalb der nächsten 3 Monate" },
      { value: "c", label: "Innerhalb der nächsten 6-12 Monate" },
      { value: "d", label: "Flexibel, je nach Angebot" },
    ],
  },
  {
    id: "kapital_bindung",
    section: "kapital",
    question: "Wie lange können Sie auf das investierte Kapital verzichten?",
    type: "single",
    options: [
      { value: "a", label: "Maximal 1 Jahr", info: "Kurzfristig - begrenzte Optionen" },
      { value: "b", label: "1-3 Jahre", info: "Mittelfristig - einige Optionen" },
      { value: "c", label: "3-5 Jahre", info: "Langfristig - gute Optionen" },
      { value: "d", label: "Über 5 Jahre", info: "Sehr langfristig - alle Optionen" },
      { value: "e", label: "Keine feste Bindung nötig", info: "Maximale Flexibilität" },
    ],
    hint: "Unsere Beteiligungen haben typischerweise Laufzeiten von 2-5 Jahren.",
  },
  {
    id: "ausschuettung",
    section: "kapital",
    question: "Welche Ausschüttungsstruktur bevorzugen Sie?",
    type: "single",
    options: [
      { value: "a", label: "Regelmäßige Ausschüttungen (monatlich/quartalsweise) sind mir wichtig" },
      { value: "b", label: "Jährliche Ausschüttungen sind ausreichend" },
      { value: "c", label: "Ausschüttung am Ende der Laufzeit ist akzeptabel" },
      { value: "d", label: "Thesaurierung (Wiederanlage) bevorzugt" },
      { value: "e", label: "Flexibel, je nach Angebot" },
    ],
  },
  {
    id: "liquiditaet",
    section: "kapital",
    question: "Wann benötigen Sie voraussichtlich wieder Zugriff auf das Kapital?",
    type: "single",
    options: [
      { value: "a", label: "Ich benötige jederzeit Zugriff (hohe Liquidität)" },
      { value: "b", label: "Planbare Ausgaben in 2-3 Jahren (z.B. Immobilienkauf)" },
      { value: "c", label: "Altersvorsorge in 5+ Jahren" },
      { value: "d", label: "Kein konkreter Bedarf absehbar" },
    ],
  },
  // Abschnitt 3: Risiko-Realitätscheck
  {
    id: "risiko_einschaetzung",
    section: "risiko",
    question: "Welche dieser Anlagen halten Sie für RISIKOREICH?",
    type: "multiple",
    options: [
      { value: "dax", label: "DAX-ETF", realRisk: "HOCH", info: "Max. Verlust in einem Jahr: -40% (2008). Durchschnittliche Schwankung: ±20% p.a." },
      { value: "staatsanleihen", label: "Deutsche Staatsanleihen", realRisk: "MITTEL", info: "Zinsänderungsrisiko, Inflationsrisiko. 2022: -15% Wertverlust bei langlaufenden Anleihen." },
      { value: "immobilien", label: "Immobilien (Eigennutzung)", realRisk: "MITTEL-HOCH", info: "Klumpenrisiko, Illiquidität, Instandhaltung, Zinsrisiko bei Finanzierung." },
      { value: "festgeld", label: "Festgeld bei deutscher Bank", realRisk: "NIEDRIG", info: "Einlagensicherung bis 100.000€. Aber: Realer Wertverlust durch Inflation." },
      { value: "unternehmensanleihen", label: "Unternehmensanleihen (Investment Grade)", realRisk: "MITTEL", info: "Ausfallrisiko 0,5-2% p.a., Zinsänderungsrisiko." },
      { value: "privateequity", label: "Private Equity / Unternehmensbeteiligungen", realRisk: "HOCH", info: "Totalverlustrisiko, Illiquidität. Aber: Höhere Renditechancen." },
    ],
    showRealRisk: true,
    educationalNote: "Die meisten Anleger unterschätzen das Risiko von Aktien und Immobilien erheblich. Ein DAX-Investment kann in einem Jahr 40% seines Wertes verlieren. Gleichzeitig überschätzen viele das Risiko von strukturierten Unternehmensbeteiligungen, die bei professionellem Management und Diversifikation kalkulierbar sind.",
  },
  {
    id: "dax_verlust",
    section: "risiko",
    question: "Was glauben Sie: Wie hoch war der maximale Jahresverlust des DAX seit 2000?",
    type: "single",
    isQuiz: true,
    correctAnswer: "d",
    options: [
      { value: "a", label: "-10%" },
      { value: "b", label: "-20%" },
      { value: "c", label: "-30%" },
      { value: "d", label: "-40% oder mehr" },
    ],
    educationalNote: "Der DAX verlor 2002 rund 44% und 2008 etwa 40%. Selbst 'sichere' Blue-Chip-Aktien können dramatisch fallen. Zum Vergleich: Unsere Beteiligungen haben definierte Konditionen und keine täglichen Kursschwankungen.",
  },
  {
    id: "verlust_toleranz",
    section: "risiko",
    question: "Welchen maximalen Verlust könnten Sie bei einem Investment finanziell und emotional verkraften?",
    type: "single",
    options: [
      { value: "a", label: "Maximal 10% - darüber würde ich nervös" },
      { value: "b", label: "Bis zu 25% - das gehört dazu" },
      { value: "c", label: "Bis zu 50% - bei entsprechender Renditechance" },
      { value: "d", label: "Auch Totalverlust möglich - wenn es Teil einer Strategie ist" },
    ],
  },
  {
    id: "verlust_reaktion",
    section: "risiko",
    question: "Wie würden Sie reagieren, wenn Ihr Investment nach 6 Monaten 20% im Minus wäre?",
    type: "single",
    options: [
      { value: "a", label: "Sofort verkaufen und Verluste begrenzen" },
      { value: "b", label: "Abwarten und beobachten" },
      { value: "c", label: "Die Situation analysieren und ggf. nachkaufen" },
      { value: "d", label: "Gelassen bleiben - kurzfristige Schwankungen sind normal" },
    ],
  },
  // Abschnitt 4: Portfolio & Erfahrung
  {
    id: "aktuelle_anlagen",
    section: "portfolio",
    question: "Welche Anlagen haben Sie aktuell in Ihrem Portfolio?",
    type: "multiple",
    options: [
      { value: "tagesgeld", label: "Tagesgeld / Festgeld" },
      { value: "aktien", label: "Aktien / ETFs" },
      { value: "anleihen", label: "Anleihen / Rentenfonds" },
      { value: "immobilien_eigen", label: "Immobilien (Eigennutzung)" },
      { value: "immobilien_vermietung", label: "Immobilien (Vermietung)" },
      { value: "privateequity", label: "Private Equity / Beteiligungen" },
      { value: "krypto", label: "Kryptowährungen" },
      { value: "edelmetalle", label: "Edelmetalle" },
      { value: "versicherungen", label: "Lebensversicherungen / Rentenversicherungen" },
      { value: "sonstiges", label: "Sonstiges" },
    ],
    analyzePortfolio: true,
  },
  {
    id: "erfahrung",
    section: "portfolio",
    question: "Wie würden Sie Ihre Erfahrung mit Kapitalanlagen beschreiben?",
    type: "single",
    options: [
      { value: "a", label: "Anfänger - hauptsächlich Sparprodukte" },
      { value: "b", label: "Fortgeschritten - Aktien, ETFs, Fonds" },
      { value: "c", label: "Erfahren - inkl. Anleihen, Derivate, alternative Investments" },
      { value: "d", label: "Professionell - beruflich mit Investments befasst" },
    ],
  },
  {
    id: "volumen",
    section: "portfolio",
    question: "Welches Volumen planen Sie für alternative Investments wie Unternehmensbeteiligungen?",
    type: "single",
    options: [
      { value: "a", label: "50.000 - 100.000 €" },
      { value: "b", label: "100.000 - 250.000 €" },
      { value: "c", label: "250.000 - 500.000 €" },
      { value: "d", label: "500.000 - 1.000.000 €" },
      { value: "e", label: "Über 1.000.000 €" },
    ],
    hint: "Unsere Mindestinvestition beträgt 100.000 €.",
  },
  {
    id: "anteil_vermoegen",
    section: "portfolio",
    question: "Welchen Anteil Ihres liquiden Vermögens würde diese Investition ausmachen?",
    type: "single",
    options: [
      { value: "a", label: "Unter 10%", info: "Konservativ - gute Diversifikation" },
      { value: "b", label: "10-25%", info: "Moderat - angemessene Gewichtung" },
      { value: "c", label: "25-50%", info: "Signifikant - erhöhtes Konzentrationsrisiko" },
      { value: "d", label: "Über 50%", info: "Dominant - hohes Klumpenrisiko" },
    ],
  },
  // Abschnitt 5: Zusammenarbeit
  {
    id: "information",
    section: "zusammenarbeit",
    question: "Wie detailliert möchten Sie über Ihre Investments informiert werden?",
    type: "single",
    options: [
      { value: "a", label: "Quartalsberichte sind ausreichend" },
      { value: "b", label: "Monatliche Updates bevorzugt" },
      { value: "c", label: "Nur bei wichtigen Ereignissen" },
      { value: "d", label: "Zugang zu Echtzeit-Dashboard gewünscht" },
    ],
  },
  {
    id: "entscheidung",
    section: "zusammenarbeit",
    question: "Wie treffen Sie Investitionsentscheidungen?",
    type: "single",
    options: [
      { value: "a", label: "Eigenständig nach eigener Recherche" },
      { value: "b", label: "In Abstimmung mit Partner/Familie" },
      { value: "c", label: "Mit Unterstützung eines Beraters" },
      { value: "d", label: "Über Family Office / Vermögensverwaltung" },
    ],
  },
  {
    id: "geschaeftsbereiche",
    section: "zusammenarbeit",
    question: "Welche Geschäftsbereiche der Angelus Group interessieren Sie besonders?",
    type: "multiple",
    options: [
      { value: "distressed", label: "Distressed Debt & Sanierungen" },
      { value: "immobilien", label: "Immobilien" },
      { value: "startup", label: "Startup-Begleitung & Incubator" },
      { value: "prozess", label: "Prozessfinanzierungen" },
      { value: "mietgarantien", label: "Mietgarantien" },
      { value: "beratung", label: "Unternehmensberatung" },
      { value: "alle", label: "Alle Bereiche interessant" },
    ],
  },
];

function calculateProfile(answers: Answer[]): ProfileResult {
  let riskScore = 50; // Start in der Mitte
  
  // Renditeerwartung
  const rendite = answers.find(a => a.questionId === "rendite_erwartung")?.value;
  if (rendite === "a") riskScore -= 20;
  else if (rendite === "b") riskScore -= 10;
  else if (rendite === "d") riskScore += 10;
  else if (rendite === "e") riskScore += 20;
  
  // Rendite vs Sicherheit
  const sicherheit = answers.find(a => a.questionId === "rendite_sicherheit")?.value;
  if (sicherheit === "a") riskScore -= 15;
  else if (sicherheit === "c") riskScore += 10;
  else if (sicherheit === "d") riskScore += 20;
  
  // Kapitalbindung
  const bindung = answers.find(a => a.questionId === "kapital_bindung")?.value;
  if (bindung === "a") riskScore -= 15;
  else if (bindung === "c" || bindung === "d" || bindung === "e") riskScore += 10;
  
  // Verlusttoleranz
  const verlust = answers.find(a => a.questionId === "verlust_toleranz")?.value;
  if (verlust === "a") riskScore -= 20;
  else if (verlust === "b") riskScore -= 5;
  else if (verlust === "c") riskScore += 10;
  else if (verlust === "d") riskScore += 20;
  
  // Erfahrung
  const erfahrung = answers.find(a => a.questionId === "erfahrung")?.value;
  if (erfahrung === "a") riskScore -= 10;
  else if (erfahrung === "c") riskScore += 5;
  else if (erfahrung === "d") riskScore += 15;
  
  // Volumen
  const volumen = answers.find(a => a.questionId === "volumen")?.value;
  if (volumen === "d" || volumen === "e") riskScore += 10;
  
  // Clamp score
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  // Determine category
  if (riskScore < 30) {
    return {
      category: "conservative",
      title: "Konservativer Investor",
      description: "Sie legen Wert auf Sicherheit und bevorzugen kalkulierbare Risiken. Kapitalerhalt hat für Sie Priorität.",
      recommendation: "Für Sie eignen sich kurzlaufende, besicherte Beteiligungen mit regelmäßigen Ausschüttungen.",
      riskScore,
    };
  } else if (riskScore < 55) {
    return {
      category: "balanced",
      title: "Ausgewogener Investor",
      description: "Sie suchen eine Balance zwischen Rendite und Sicherheit. Moderate Risiken sind für Sie akzeptabel.",
      recommendation: "Diversifizierte Beteiligungen mit mittlerer Laufzeit und regelmäßigen Ausschüttungen passen zu Ihrem Profil.",
      riskScore,
    };
  } else if (riskScore < 80) {
    return {
      category: "growth",
      title: "Wachstumsorientierter Investor",
      description: "Sie sind bereit, für höhere Renditen auch höhere Risiken einzugehen. Langfristiges Denken prägt Ihre Strategie.",
      recommendation: "Equity-Beteiligungen und Startup-Investments mit höherem Renditepotenzial sind für Sie interessant.",
      riskScore,
    };
  } else {
    return {
      category: "professional",
      title: "Professioneller Investor",
      description: "Sie verfügen über umfangreiche Erfahrung und können auch komplexe Investments einschätzen. Hohe Volumina sind für Sie kein Problem.",
      recommendation: "Individuelle Strukturierungen und Co-Investments bieten Ihnen maßgeschneiderte Möglichkeiten.",
      riskScore,
    };
  }
}

interface InvestorProfileCheckProps {
  onComplete?: (result: ProfileResult) => void;
  onClose?: () => void;
}

export default function InvestorProfileCheck({ onComplete, onClose }: InvestorProfileCheckProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showEducational, setShowEducational] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ProfileResult | null>(null);
  
  const currentQuestion = questions[currentQuestionIndex];
  const currentSection = sections.find(s => s.id === currentQuestion?.section);
  const progress = ((currentQuestionIndex) / questions.length) * 100;
  
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);
  
  const handleSingleSelect = (value: string) => {
    const newAnswers = answers.filter(a => a.questionId !== currentQuestion.id);
    newAnswers.push({ questionId: currentQuestion.id, value });
    setAnswers(newAnswers);
    
    // Show educational note if exists
    if (currentQuestion.educationalNote || currentQuestion.isQuiz) {
      setShowEducational(true);
    }
  };
  
  const handleMultiSelect = (value: string) => {
    const existing = answers.find(a => a.questionId === currentQuestion.id);
    let newValues: string[] = [];
    
    if (existing && Array.isArray(existing.value)) {
      if (existing.value.includes(value)) {
        newValues = existing.value.filter(v => v !== value);
      } else {
        newValues = [...existing.value, value];
      }
    } else {
      newValues = [value];
    }
    
    const newAnswers = answers.filter(a => a.questionId !== currentQuestion.id);
    if (newValues.length > 0) {
      newAnswers.push({ questionId: currentQuestion.id, value: newValues });
    }
    setAnswers(newAnswers);
  };
  
  const canProceed = () => {
    if (!currentAnswer) return false;
    if (Array.isArray(currentAnswer.value)) {
      return currentAnswer.value.length > 0;
    }
    return !!currentAnswer.value;
  };
  
  const handleNext = () => {
    setShowEducational(false);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate result
      const profileResult = calculateProfile(answers);
      setResult(profileResult);
      setShowResult(true);
      onComplete?.(profileResult);
    }
  };
  
  const handleBack = () => {
    setShowEducational(false);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  if (showResult && result) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ihr Investoren-Profil</CardTitle>
          <CardDescription>Basierend auf Ihren Antworten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge className="text-lg px-4 py-2 mb-4" variant={
              result.category === "conservative" ? "secondary" :
              result.category === "balanced" ? "default" :
              result.category === "growth" ? "default" :
              "default"
            }>
              {result.title}
            </Badge>
            <p className="text-muted-foreground mb-4">{result.description}</p>
          </div>
          
          {/* Risk Score Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Konservativ</span>
              <span>Risikobereit</span>
            </div>
            <div className="relative h-4 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-primary rounded-full shadow-lg"
                style={{ left: `calc(${result.riskScore}% - 12px)` }}
              />
            </div>
          </div>
          
          {/* Recommendation */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Unsere Empfehlung
            </h4>
            <p className="text-sm text-muted-foreground">{result.recommendation}</p>
          </div>
          
          {/* Risk Matrix */}
          <div className="space-y-3">
            <h4 className="font-semibold">Risikomatrix im Vergleich</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Anlageform</th>
                    <th className="text-center py-2">Rendite p.a.</th>
                    <th className="text-center py-2">Volatilität</th>
                    <th className="text-center py-2">Liquidität</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Tagesgeld</td>
                    <td className="text-center">0-2%</td>
                    <td className="text-center"><Badge variant="secondary" className="text-xs">Keine</Badge></td>
                    <td className="text-center"><Badge className="bg-green-100 text-green-800 text-xs">Sehr hoch</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">DAX-ETF</td>
                    <td className="text-center">5-8%*</td>
                    <td className="text-center"><Badge className="bg-red-100 text-red-800 text-xs">±20%</Badge></td>
                    <td className="text-center"><Badge className="bg-green-100 text-green-800 text-xs">Hoch</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Immobilien</td>
                    <td className="text-center">3-6%</td>
                    <td className="text-center"><Badge className="bg-yellow-100 text-yellow-800 text-xs">Mittel</Badge></td>
                    <td className="text-center"><Badge className="bg-red-100 text-red-800 text-xs">Niedrig</Badge></td>
                  </tr>
                  <tr className="border-b bg-primary/5">
                    <td className="py-2 font-medium">Angelus Beteiligungen</td>
                    <td className="text-center font-medium">8-12%</td>
                    <td className="text-center"><Badge variant="secondary" className="text-xs">Keine**</Badge></td>
                    <td className="text-center"><Badge className="bg-yellow-100 text-yellow-800 text-xs">Mittel</Badge></td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                *Historischer Durchschnitt, keine Garantie | **Keine tägliche Kursfeststellung
              </p>
            </div>
          </div>
          
          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button className="flex-1" onClick={() => window.location.href = "/register"}>
              Jetzt registrieren
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Später fortfahren
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentSection && (
              <>
                <currentSection.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{currentSection.title}</span>
              </>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Frage {currentQuestionIndex + 1} von {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Section indicators */}
        <div className="flex justify-between mt-4">
          {sections.map((section, idx) => {
            const sectionQuestions = questions.filter(q => q.section === section.id);
            const firstQuestionIdx = questions.findIndex(q => q.section === section.id);
            const lastQuestionIdx = firstQuestionIdx + sectionQuestions.length - 1;
            const isActive = currentQuestionIndex >= firstQuestionIdx && currentQuestionIndex <= lastQuestionIdx;
            const isCompleted = currentQuestionIndex > lastQuestionIdx;
            
            return (
              <div key={section.id} className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  isCompleted ? "bg-primary text-primary-foreground" :
                  isActive ? "bg-primary/20 text-primary" :
                  "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <section.icon className="w-4 h-4" />}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{section.title}</span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
          
          {currentQuestion.type === "single" ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer?.value === option.value;
                const showInfo = isSelected && 'info' in option && option.info;
                
                return (
                  <div key={option.value}>
                    <button
                      onClick={() => handleSingleSelect(option.value)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          isSelected ? "border-primary" : "border-muted-foreground"
                        )}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <span>{option.label}</span>
                      </div>
                    </button>
                    {showInfo && 'info' in option && (
                      <div className="mt-2 ml-8 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        {option.info}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const values = Array.isArray(currentAnswer?.value) ? currentAnswer.value : [];
                const isSelected = values.includes(option.value);
                
                return (
                  <div key={option.value}>
                    <button
                      onClick={() => handleMultiSelect(option.value)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <span>{option.label}</span>
                        {currentQuestion.showRealRisk && 'realRisk' in option && option.realRisk && isSelected && (
                          <Badge className={cn(
                            "ml-auto",
                            option.realRisk === "HOCH" || option.realRisk === "MITTEL-HOCH" ? "bg-red-100 text-red-800" :
                            option.realRisk === "MITTEL" ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          )}>
                            {option.realRisk}
                          </Badge>
                        )}
                      </div>
                    </button>
                    {isSelected && 'info' in option && option.info && currentQuestion.showRealRisk && (
                      <div className="mt-2 ml-8 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
                        {option.info}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Hint */}
        {currentQuestion.hint && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm">{currentQuestion.hint}</p>
          </div>
        )}
        
        {/* Educational Note */}
        {showEducational && currentQuestion.educationalNote && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {currentQuestion.isQuiz && (
                  <p className="font-semibold mb-2">
                    {currentAnswer?.value === currentQuestion.correctAnswer 
                      ? "✓ Richtig!" 
                      : `Die richtige Antwort ist: ${currentQuestion.options.find(o => o.value === currentQuestion.correctAnswer)?.label}`}
                  </p>
                )}
                <p className="text-sm">{currentQuestion.educationalNote}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentQuestionIndex === questions.length - 1 ? "Ergebnis anzeigen" : "Weiter"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
