import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  annualInterestRate: '',
  termMonths: '',
  effectiveFrom: '',
  effectiveUntil: '',
  isActive: false,
};

export default function InterestParameters() {
  const [activeTab, setActiveTab] = useState('overview');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const utils = trpc.useUtils();

  // Queries
  const { data: allParams, isLoading, error } = trpc.interestParameters.getAll.useQuery();
  const { data: activeParams } = trpc.interestParameters.getActive.useQuery();

  // Mutations
  const activateMutation = trpc.interestParameters.activate.useMutation();
  const deleteMutation = trpc.interestParameters.delete.useMutation();
  const createMutation = trpc.interestParameters.create.useMutation({
    onSuccess: () => {
      utils.interestParameters.getAll.invalidate();
      utils.interestParameters.getActive.invalidate();
    },
  });

  // When termMonths changes, auto-compute effectiveUntil from effectiveFrom
  const handleTermMonthsChange = (months: string) => {
    setForm(prev => {
      const updated = { ...prev, termMonths: months };
      if (prev.effectiveFrom && months) {
        const from = new Date(prev.effectiveFrom);
        if (!isNaN(from.getTime())) {
          const until = new Date(from);
          until.setMonth(until.getMonth() + parseInt(months, 10));
          updated.effectiveUntil = until.toISOString().slice(0, 10);
        }
      }
      return updated;
    });
  };

  // When effectiveFrom changes, re-compute effectiveUntil if termMonths is set
  const handleEffectiveFromChange = (value: string) => {
    setForm(prev => {
      const updated = { ...prev, effectiveFrom: value };
      if (value && prev.termMonths) {
        const from = new Date(value);
        if (!isNaN(from.getTime())) {
          const until = new Date(from);
          until.setMonth(until.getMonth() + parseInt(prev.termMonths, 10));
          updated.effectiveUntil = until.toISOString().slice(0, 10);
        }
      }
      return updated;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Bitte eine Bezeichnung eingeben.');
      return;
    }
    const rate = parseFloat(form.annualInterestRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setFormError('Zinssatz muss zwischen 0 und 100 liegen.');
      return;
    }
    if (!form.effectiveFrom) {
      setFormError('Bitte ein Startdatum (Gültig ab) eingeben.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        annualInterestRate: rate,
        effectiveFrom: new Date(form.effectiveFrom),
        effectiveUntil: form.effectiveUntil ? new Date(form.effectiveUntil) : undefined,
        isActive: form.isActive,
        // defaults for required fields
        defaultInterestRate: 17,
        capitalGainsTax: 25,
        solidaritySurcharge: 5.5,
      });
      setSuccessMessage('Zinsparameter erfolgreich erstellt');
      setTimeout(() => setSuccessMessage(''), 4000);
      setForm(EMPTY_FORM);
      setActiveTab('overview');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync({ id });
      setSuccessMessage('Zinsparameter erfolgreich aktiviert');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(`Fehler: ${err}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie diese Zinsparameter löschen möchten?')) {
      try {
        await deleteMutation.mutateAsync({ id });
        setSuccessMessage('Zinsparameter erfolgreich gelöscht');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setErrorMessage(`Fehler: ${err}`);
      }
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout variant="admin">
        <div className="max-w-6xl mx-auto py-8">
          <div className="text-center">
            <p className="text-gray-600">Laden...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout variant="admin">
        <div className="max-w-6xl mx-auto py-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Fehler beim Laden</h3>
              <p className="text-red-800 text-sm">{error.message}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="admin">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Zinsparameter</h1>
          <p className="text-gray-600 mt-2">
            Verwalten Sie die Zinsberechnungsparameter für Anleihen
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
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Fehler</h3>
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="active">Aktive Parameter</TabsTrigger>
            <TabsTrigger value="create">Neue Parameter</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alle Zinsparameter</CardTitle>
                <CardDescription>
                  Übersicht aller definierten Zinsparameter-Sets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!allParams || allParams.data?.length === 0 ? (
                  <p className="text-gray-600">Keine Zinsparameter gefunden</p>
                ) : (
                  <div className="space-y-4">
                    {allParams.data?.map((param: any) => (
                      <div
                        key={param.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{param.name}</h3>
                            <p className="text-sm text-gray-600">{param.description}</p>
                          </div>
                          <div className="flex gap-2">
                            {!param.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActivate(param.id)}
                                disabled={activateMutation.isPending}
                              >
                                Aktivieren
                              </Button>
                            )}
                            {param.isActive && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                                Aktiv
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(param.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Zinssatz:</span>
                            <p className="font-semibold">{param.annualInterestRate}%</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Verzugszins:</span>
                            <p className="font-semibold">{param.defaultInterestRate}%</p>
                          </div>
                          <div>
                            <span className="text-gray-600">KESt:</span>
                            <p className="font-semibold">{param.capitalGainsTax}%</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Solidaritätszuschlag:</span>
                            <p className="font-semibold">{param.solidaritySurcharge}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Parameters Tab */}
          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktive Zinsparameter</CardTitle>
                <CardDescription>
                  Derzeit verwendete Zinsparameter für Berechnungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeParams?.data ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Jährlicher Zinssatz</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {activeParams.data.annualInterestRate}%
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Verzugszins</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {activeParams.data.defaultInterestRate}%
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Kapitalertragsteuer</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {activeParams.data.capitalGainsTax}%
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">Solidaritätszuschlag</p>
                        <p className="text-2xl font-bold text-red-600">
                          {activeParams.data.solidaritySurcharge}%
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-3">Geschäftsregeln</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Keine Verzugszinsen für Verbindlichkeit:</span>
                          <span className="font-semibold">
                            {activeParams.data.noDefaultInterestForCompany ? 'Ja' : 'Nein'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insolvenzvorhalt möglich:</span>
                          <span className="font-semibold">
                            {activeParams.data.enableInsolvencyHold ? 'Ja' : 'Nein'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Zinseszins aktiviert:</span>
                          <span className="font-semibold">
                            {activeParams.data.enableCompoundInterest ? 'Ja' : 'Nein'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Standardzahlungsweise:</span>
                          <span className="font-semibold">
                            {activeParams.data.defaultPaymentFrequency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Keine aktiven Zinsparameter gefunden</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Neue Zinsparameter erstellen
                </CardTitle>
                <CardDescription>
                  Erstellt einen neuen Zinsparameter-Satz. Weitere Felder (Verzugszins, KESt etc.) werden mit Standardwerten befüllt und können danach bearbeitet werden.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-5 max-w-lg">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-800">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {formError}
                    </div>
                  )}

                  {/* Bezeichnung */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-name">Bezeichnung <span className="text-destructive">*</span></Label>
                    <Input
                      id="ip-name"
                      placeholder="z.B. Standard 2026"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  {/* Zinssatz */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-rate">Zinssatz p.a. (%) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="ip-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="z.B. 8.50"
                        value={form.annualInterestRate}
                        onChange={e => setForm(p => ({ ...p, annualInterestRate: e.target.value }))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>

                  {/* Gültig ab + Laufzeit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ip-from">Gültig ab <span className="text-destructive">*</span></Label>
                      <Input
                        id="ip-from"
                        type="date"
                        value={form.effectiveFrom}
                        onChange={e => handleEffectiveFromChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ip-term">Laufzeit (Monate)</Label>
                      <Input
                        id="ip-term"
                        type="number"
                        min="1"
                        max="360"
                        placeholder="z.B. 24"
                        value={form.termMonths}
                        onChange={e => handleTermMonthsChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Gültig bis */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-until">
                      Gültig bis
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (optional – wird aus Laufzeit berechnet)
                      </span>
                    </Label>
                    <Input
                      id="ip-until"
                      type="date"
                      value={form.effectiveUntil}
                      onChange={e => setForm(p => ({ ...p, effectiveUntil: e.target.value, termMonths: '' }))}
                    />
                  </div>

                  {/* Aktiv Toggle */}
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      id="ip-active"
                      checked={form.isActive}
                      onCheckedChange={checked => setForm(p => ({ ...p, isActive: checked }))}
                    />
                    <Label htmlFor="ip-active" className="cursor-pointer">
                      Sofort aktivieren
                      <span className="block text-xs text-muted-foreground font-normal">
                        Deaktiviert den aktuell aktiven Parametersatz
                      </span>
                    </Label>
                  </div>

                  {/* Defaults info */}
                  <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Automatisch gesetzte Standardwerte:</p>
                    <p>Verzugszins 17 % · KESt 25 % · Solidaritätszuschlag 5,5 % · Zahlungsweise monatlich</p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                      <Plus className="w-4 h-4" />
                      {createMutation.isPending ? 'Wird erstellt…' : 'Parameter erstellen'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setForm(EMPTY_FORM); setFormError(''); }}
                    >
                      Zurücksetzen
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
