import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react';

export default function InterestParameters() {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Queries
  const { data: allParams, refetch: refetchAll } = trpc.interestParameters.getAll.useQuery();
  const { data: activeParams } = trpc.interestParameters.getActive.useQuery();
  const { data: history } = trpc.interestParameters.getHistory.useQuery({ limit: 10 });

  // Mutations
  const createMutation = trpc.interestParameters.create.useMutation();
  const updateMutation = trpc.interestParameters.update.useMutation();
  const deleteMutation = trpc.interestParameters.delete.useMutation();
  const activateMutation = trpc.interestParameters.activate.useMutation();

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: formData,
        });
        setSuccessMessage('Zinsparameter erfolgreich aktualisiert');
      } else {
        await createMutation.mutateAsync(formData);
        setSuccessMessage('Zinsparameter erfolgreich erstellt');
      }
      setEditingId(null);
      setFormData({});
      refetchAll();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleEdit = (params: any) => {
    setEditingId(params.id);
    setFormData(params);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Möchten Sie diese Zinsparameter wirklich löschen?')) {
      try {
        await deleteMutation.mutateAsync({ id });
        setSuccessMessage('Zinsparameter erfolgreich gelöscht');
        refetchAll();
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error: any) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(''), 3000);
      }
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync({ id });
      setSuccessMessage('Zinsparameter erfolgreich aktiviert');
      refetchAll();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Zinsparameter</h1>
            <p className="text-gray-600 mt-2">Verwalten Sie alle Zinsberechnungsparameter</p>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({});
              setActiveTab('create');
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Neue Parameter
          </Button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="create">Erstellen/Bearbeiten</TabsTrigger>
            <TabsTrigger value="history">Versionshistorie</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Active Parameters */}
            {activeParams && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Aktive Zinsparameter
                  </CardTitle>
                  <CardDescription>{activeParams.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Jährlicher Zinssatz</p>
                      <p className="text-2xl font-bold">{activeParams.annualInterestRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Verzugszins</p>
                      <p className="text-2xl font-bold">{activeParams.defaultInterestRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Kapitalertragsteuer</p>
                      <p className="text-2xl font-bold">{activeParams.capitalGainsTax}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Zahlungsweise</p>
                      <p className="text-2xl font-bold">{activeParams.defaultPaymentFrequency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Alle Zinsparameter</CardTitle>
                <CardDescription>Verwalten Sie verschiedene Parametersätze</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Name</th>
                        <th className="text-left py-2 px-4">Zinssatz</th>
                        <th className="text-left py-2 px-4">Verzugszins</th>
                        <th className="text-left py-2 px-4">Status</th>
                        <th className="text-left py-2 px-4">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allParams?.map((params: any) => (
                        <tr key={params.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{params.name}</td>
                          <td className="py-3 px-4">{params.annualInterestRate}%</td>
                          <td className="py-3 px-4">{params.defaultInterestRate}%</td>
                          <td className="py-3 px-4">
                            {params.isActive ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                <Check className="w-3 h-3" />
                                Aktiv
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                <X className="w-3 h-3" />
                                Inaktiv
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(params)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {!params.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivate(params.id)}
                                >
                                  Aktivieren
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(params.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create/Edit Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? 'Zinsparameter bearbeiten' : 'Neue Zinsparameter erstellen'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Grundinformationen</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="z.B. Standard Parameter 2024"
                      />
                    </div>
                    <div>
                      <Label>Version</Label>
                      <Input
                        type="number"
                        value={formData.version || 1}
                        onChange={(e) => handleInputChange('version', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Beschreibung</Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Optionale Beschreibung"
                    />
                  </div>
                </div>

                {/* Interest Rates */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Zinssätze</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Jährlicher Zinssatz (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.annualInterestRate || 6}
                        onChange={(e) =>
                          handleInputChange('annualInterestRate', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Verzugszins (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.defaultInterestRate || 17}
                        onChange={(e) =>
                          handleInputChange('defaultInterestRate', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Verspätungszins (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.latePaymentInterestRate || 0}
                        onChange={(e) =>
                          handleInputChange('latePaymentInterestRate', parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Taxes */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Steuern</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Kapitalertragsteuer (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.capitalGainsTax || 25}
                        onChange={(e) =>
                          handleInputChange('capitalGainsTax', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Solidaritätszuschlag (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.solidaritySurcharge || 5.5}
                        onChange={(e) =>
                          handleInputChange('solidaritySurcharge', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Kirchensteuer (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.churchTax || 0}
                        onChange={(e) => handleInputChange('churchTax', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Zahlungseinstellungen</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Zahlungsweise</Label>
                      <Select
                        value={formData.defaultPaymentFrequency || 'monthly'}
                        onValueChange={(value) =>
                          handleInputChange('defaultPaymentFrequency', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monatlich</SelectItem>
                          <SelectItem value="quarterly">Quartalsweise</SelectItem>
                          <SelectItem value="annual">Jährlich</SelectItem>
                          <SelectItem value="thesaurierend">Thesaurierend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tage pro Jahr</Label>
                      <Select
                        value={(formData.daysPerYear || 365).toString()}
                        onValueChange={(value) =>
                          handleInputChange('daysPerYear', parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="360">360 Tage</SelectItem>
                          <SelectItem value="365">365 Tage</SelectItem>
                          <SelectItem value="366">366 Tage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Business Rules */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Geschäftsregeln</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.noDefaultInterestForCompany ?? true}
                        onChange={(e) =>
                          handleInputChange('noDefaultInterestForCompany', e.target.checked)
                        }
                      />
                      <span>Keine Verzugszinsen für Verbindlichkeit</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.enableInsolvencyHold ?? true}
                        onChange={(e) =>
                          handleInputChange('enableInsolvencyHold', e.target.checked)
                        }
                      />
                      <span>Insolvenzvorhalt aktivieren</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.enableCompoundInterest ?? false}
                        onChange={(e) =>
                          handleInputChange('enableCompoundInterest', e.target.checked)
                        }
                      />
                      <span>Zinseszins aktivieren</span>
                    </label>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="gap-2">
                    <Check className="w-4 h-4" />
                    {editingId ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({});
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Versionshistorie</CardTitle>
                <CardDescription>Alle Änderungen an Zinsparametern</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history?.map((params: any) => (
                    <div key={params.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{params.name}</h4>
                          <p className="text-sm text-gray-600">{params.description}</p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(params.createdAt).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Zinssatz: {params.annualInterestRate}% | Verzugszins:{' '}
                        {params.defaultInterestRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
