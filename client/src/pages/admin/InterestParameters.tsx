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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';

export default function InterestParameters() {
  const [activeTab, setActiveTab] = useState('overview');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Queries
  const { data: allParams, isLoading, error } = trpc.interestParameters.getAll.useQuery();
  const { data: activeParams } = trpc.interestParameters.getActive.useQuery();

  // Mutations
  const activateMutation = trpc.interestParameters.activate.useMutation();
  const deleteMutation = trpc.interestParameters.delete.useMutation();

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
                <CardTitle>Neue Zinsparameter erstellen</CardTitle>
                <CardDescription>
                  Diese Funktion wird in Kürze implementiert
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Sie können neue Zinsparameter über die API oder direkt in der Datenbank erstellen.
                </p>
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Parameter erstellen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
