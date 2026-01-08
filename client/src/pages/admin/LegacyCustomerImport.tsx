import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader,
} from 'lucide-react';

type ImportStep = 1 | 2 | 3 | 4;

interface FormData {
  // Step 1: Customer Data
  contractNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;

  // Step 2: Bank & Bond Data
  iban: string;
  bic: string;
  accountHolder: string;
  bondNumber: string;
  investmentAmount: string;
  shareCount: string;
  shareValue: string;

  // Step 3: Contract Data
  contractDate: string;
  valueDate: string;
  annualInterestRate: string;
  interestPaymentFrequency: 'monthly' | 'quarterly' | 'annual';
  annualInterestDate: string;
  monthlyPaymentDay: string;
  maturityDate: string;
  termMonths: string;
  capitalGainsTax: string;
  solidaritySurcharge: string;
  churchTax: string;

  // Step 4: Documents
  documents: File[];
}

const defaultFormData: FormData = {
  contractNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: 'Deutschland',
  country: '',
  iban: '',
  bic: '',
  accountHolder: '',
  bondNumber: '',
  investmentAmount: '',
  shareCount: '',
  shareValue: '',
  contractDate: '',
  valueDate: '',
  annualInterestRate: '',
  interestPaymentFrequency: 'monthly',
  annualInterestDate: '',
  monthlyPaymentDay: '15',
  maturityDate: '',
  termMonths: '',
  capitalGainsTax: '25.00',
  solidaritySurcharge: '5.50',
  churchTax: '0.00',
  documents: [],
};

export function LegacyCustomerImport() {
  const [currentStep, setCurrentStep] = useState<ImportStep>(1);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const createMutation = trpc.legacyCustomer.create.useMutation();

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: ImportStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.contractNumber.trim()) newErrors.contractNumber = 'Vertragsnummer erforderlich';
        if (!formData.firstName.trim()) newErrors.firstName = 'Vorname erforderlich';
        if (!formData.lastName.trim()) newErrors.lastName = 'Nachname erforderlich';
        if (formData.email && !formData.email.includes('@')) newErrors.email = 'Ungültige Email';
        break;

      case 2:
        if (!formData.iban.trim()) newErrors.iban = 'IBAN erforderlich';
        if (!formData.bic.trim()) newErrors.bic = 'BIC erforderlich';
        if (!formData.accountHolder.trim()) newErrors.accountHolder = 'Kontoinhaber erforderlich';
        if (!formData.bondNumber.trim()) newErrors.bondNumber = 'Anleihe-Nummer erforderlich';
        if (!formData.investmentAmount.trim()) newErrors.investmentAmount = 'Betrag erforderlich';
        if (!formData.shareCount.trim()) newErrors.shareCount = 'Anzahl Anteile erforderlich';
        if (!formData.shareValue.trim()) newErrors.shareValue = 'Wert pro Anteil erforderlich';
        break;

      case 3:
        if (!formData.contractDate) newErrors.contractDate = 'Zeichnungsdatum erforderlich';
        if (!formData.valueDate) newErrors.valueDate = 'Wertstellungsdatum erforderlich';
        if (!formData.annualInterestRate) newErrors.annualInterestRate = 'Zinssatz erforderlich';
        if (!formData.annualInterestDate) newErrors.annualInterestDate = 'Jährlicher Stichtag erforderlich';
        if (!formData.maturityDate) newErrors.maturityDate = 'Enddatum erforderlich';
        if (!formData.termMonths) newErrors.termMonths = 'Laufzeit erforderlich';
        break;

      case 4:
        // Documents are optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((currentStep + 1) as ImportStep);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as ImportStep);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...files],
    }));
  };

  const removeDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        contractNumber: formData.contractNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        street: formData.street || undefined,
        houseNumber: formData.houseNumber || undefined,
        postalCode: formData.postalCode || undefined,
        city: formData.city || undefined,
        country: formData.country || 'Deutschland',
        iban: formData.iban || undefined,
        bic: formData.bic || undefined,
        accountHolder: formData.accountHolder || undefined,
        bondNumber: formData.bondNumber || undefined,
        investmentAmount: formData.investmentAmount ? parseFloat(formData.investmentAmount) : undefined,
        shareCount: formData.shareCount ? parseInt(formData.shareCount) : undefined,
        shareValue: formData.shareValue ? parseFloat(formData.shareValue) : undefined,
        contractDate: formData.contractDate ? new Date(formData.contractDate) : undefined,
        valueDate: formData.valueDate ? new Date(formData.valueDate) : undefined,
        annualInterestRate: formData.annualInterestRate ? parseFloat(formData.annualInterestRate) : undefined,
        interestPaymentFrequency: formData.interestPaymentFrequency,
        annualInterestDate: formData.annualInterestDate ? new Date(formData.annualInterestDate) : undefined,
        monthlyPaymentDay: formData.monthlyPaymentDay ? parseInt(formData.monthlyPaymentDay) : undefined,
        maturityDate: formData.maturityDate ? new Date(formData.maturityDate) : undefined,
        termMonths: formData.termMonths ? parseInt(formData.termMonths) : undefined,
        capitalGainsTax: formData.capitalGainsTax ? parseFloat(formData.capitalGainsTax) : undefined,
        solidaritySurcharge: formData.solidaritySurcharge ? parseFloat(formData.solidaritySurcharge) : undefined,
        churchTax: formData.churchTax ? parseFloat(formData.churchTax) : undefined,
      });

      setSuccessMessage(`Bestandskunde ${formData.firstName} ${formData.lastName} erfolgreich importiert!`);
      setFormData(defaultFormData);
      setCurrentStep(1);

      // Reset success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrors({ submit: `Fehler beim Importieren: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bestandskunde importieren</h1>
          <p className="text-gray-600 mt-2">
            Importieren Sie bestehende Kunden mit DocuSign-Anleihen in das System
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">Erfolg!</h3>
              <p className="text-green-800 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Fehler</h3>
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Kundendaten</span>
            <span>Bankverbindung</span>
            <span>Vertragsdaten</span>
            <span>Dokumente</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          {currentStep === 1 && (
            <Step1 formData={formData} errors={errors} onChange={handleInputChange} />
          )}
          {currentStep === 2 && (
            <Step2 formData={formData} errors={errors} onChange={handleInputChange} />
          )}
          {currentStep === 3 && (
            <Step3 formData={formData} errors={errors} onChange={handleInputChange} />
          )}
          {currentStep === 4 && (
            <Step4
              formData={formData}
              errors={errors}
              onFileUpload={handleFileUpload}
              onRemoveDocument={removeDocument}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </button>

          {currentStep === 4 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Wird importiert...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Kunden importieren
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * Step 1: Customer Data
 */
function Step1({
  formData,
  errors,
  onChange,
}: {
  formData: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, value: any) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Persönliche Daten</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vertragsnummer *
          </label>
          <input
            type="text"
            value={formData.contractNumber}
            onChange={(e) => onChange('contractNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.contractNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 136171024"
          />
          {errors.contractNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.contractNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vorname *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. Brigitte"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nachname *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. Brendel"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Geburtsdatum
          </label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => onChange('birthDate', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="brigitte@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefon
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+49 123 456789"
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">Adresse</h3>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Straße
          </label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => onChange('street', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Gartenweg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hausnummer
          </label>
          <input
            type="text"
            value={formData.houseNumber}
            onChange={(e) => onChange('houseNumber', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. 2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PLZ
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. 91257"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stadt
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Pegnitz"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 2: Bank & Bond Data
 */
function Step2({
  formData,
  errors,
  onChange,
}: {
  formData: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, value: any) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Bankverbindung & Anleihedaten</h2>

      <h3 className="text-lg font-semibold mb-4">Bankverbindung</h3>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IBAN *
          </label>
          <input
            type="text"
            value={formData.iban}
            onChange={(e) => onChange('iban', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.iban ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. DE57 7734 0076 0380 6924 00"
          />
          {errors.iban && <p className="text-red-500 text-sm mt-1">{errors.iban}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            BIC *
          </label>
          <input
            type="text"
            value={formData.bic}
            onChange={(e) => onChange('bic', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.bic ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. COBADEFFXXX"
          />
          {errors.bic && <p className="text-red-500 text-sm mt-1">{errors.bic}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kontoinhaber *
          </label>
          <input
            type="text"
            value={formData.accountHolder}
            onChange={(e) => onChange('accountHolder', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.accountHolder ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. Siglinde Brigitte Brendel"
          />
          {errors.accountHolder && (
            <p className="text-red-500 text-sm mt-1">{errors.accountHolder}</p>
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">Anleihe-Informationen</h3>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anleihe-Nummer *
          </label>
          <input
            type="text"
            value={formData.bondNumber}
            onChange={(e) => onChange('bondNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.bondNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 60-2023"
          />
          {errors.bondNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.bondNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Investitionsbetrag (EUR) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.investmentAmount}
            onChange={(e) => onChange('investmentAmount', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.investmentAmount ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 100000.00"
          />
          {errors.investmentAmount && (
            <p className="text-red-500 text-sm mt-1">{errors.investmentAmount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anzahl Anteile *
          </label>
          <input
            type="number"
            value={formData.shareCount}
            onChange={(e) => onChange('shareCount', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.shareCount ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 100"
          />
          {errors.shareCount && (
            <p className="text-red-500 text-sm mt-1">{errors.shareCount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wert pro Anteil (EUR) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.shareValue}
            onChange={(e) => onChange('shareValue', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.shareValue ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 1000.00"
          />
          {errors.shareValue && (
            <p className="text-red-500 text-sm mt-1">{errors.shareValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Step 3: Contract Data
 */
function Step3({
  formData,
  errors,
  onChange,
}: {
  formData: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, value: any) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Vertragsdaten</h2>

      <h3 className="text-lg font-semibold mb-4">Vertragsinformationen</h3>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zeichnungsdatum *
          </label>
          <input
            type="date"
            value={formData.contractDate}
            onChange={(e) => onChange('contractDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.contractDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.contractDate && (
            <p className="text-red-500 text-sm mt-1">{errors.contractDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wertstellungsdatum *
          </label>
          <input
            type="date"
            value={formData.valueDate}
            onChange={(e) => onChange('valueDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.valueDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.valueDate && (
            <p className="text-red-500 text-sm mt-1">{errors.valueDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zinssatz (%) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.annualInterestRate}
            onChange={(e) => onChange('annualInterestRate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.annualInterestRate ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 18.00"
          />
          {errors.annualInterestRate && (
            <p className="text-red-500 text-sm mt-1">{errors.annualInterestRate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zinsfälligkeit
          </label>
          <select
            value={formData.interestPaymentFrequency}
            onChange={(e) =>
              onChange(
                'interestPaymentFrequency',
                e.target.value as 'monthly' | 'quarterly' | 'annual'
              )
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="monthly">Monatlich</option>
            <option value="quarterly">Quartalsweise</option>
            <option value="annual">Jährlich</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jährlicher Stichtag *
          </label>
          <input
            type="date"
            value={formData.annualInterestDate}
            onChange={(e) => onChange('annualInterestDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.annualInterestDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.annualInterestDate && (
            <p className="text-red-500 text-sm mt-1">{errors.annualInterestDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zahlungstag im Monat
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={formData.monthlyPaymentDay}
            onChange={(e) => onChange('monthlyPaymentDay', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. 15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enddatum *
          </label>
          <input
            type="date"
            value={formData.maturityDate}
            onChange={(e) => onChange('maturityDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.maturityDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.maturityDate && (
            <p className="text-red-500 text-sm mt-1">{errors.maturityDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Laufzeit (Monate) *
          </label>
          <input
            type="number"
            value={formData.termMonths}
            onChange={(e) => onChange('termMonths', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.termMonths ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 120"
          />
          {errors.termMonths && (
            <p className="text-red-500 text-sm mt-1">{errors.termMonths}</p>
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">Steuern</h3>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kapitalertragsteuer (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.capitalGainsTax}
            onChange={(e) => onChange('capitalGainsTax', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. 25.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Solidaritätszuschlag (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.solidaritySurcharge}
            onChange={(e) => onChange('solidaritySurcharge', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. 5.50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kirchensteuer (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.churchTax}
            onChange={(e) => onChange('churchTax', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. 0.00"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 4: Documents
 */
function Step4({
  formData,
  errors,
  onFileUpload,
  onRemoveDocument,
}: {
  formData: FormData;
  errors: Record<string, string>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocument: (index: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dokumente hochladen</h2>

      <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">
          Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
        </p>
        <input
          type="file"
          multiple
          onChange={onFileUpload}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Dateien auswählen
        </label>
        <p className="text-gray-500 text-sm mt-4">
          Unterstützte Formate: PDF, Word, Excel, Bilder
        </p>
      </div>

      {formData.documents.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Hochgeladene Dokumente ({formData.documents.length})</h3>
          <div className="space-y-2">
            {formData.documents.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveDocument(index)}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-900 text-sm">
          <strong>Hinweis:</strong> Dokumente sind optional. Sie können diese später hinzufügen.
          Empfohlen: Vertrag, Hochrechnung, Zahlungsbestätigung
        </p>
      </div>
    </div>
  );
}
