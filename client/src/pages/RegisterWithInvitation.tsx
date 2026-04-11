import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface InvitationData {
  invitation: {
    id: number;
    email: string;
    status: string | null;
    expiresAt: Date;
  };
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    birthDate: Date | null;
    street: string | null;
    houseNumber: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    iban: string | null;
    bic: string | null;
    accountHolder: string | null;
  } | null;
}

interface FormData {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function RegisterWithInvitation() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const invitationToken = searchParams.get('invitation');

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const acceptInvitationMutation = trpc.legacyInvitations.accept.useMutation();

  const getInvitationQuery = trpc.legacyInvitations.getByToken.useQuery(
    { token: invitationToken || '' },
    {
      enabled: !!invitationToken,
    }
  );

  useEffect(() => {
    if (!invitationToken) {
      setError('Keine Einladungs-Token vorhanden');
      setLoading(false);
    } else if (getInvitationQuery.data) {
      setInvitationData(getInvitationQuery.data);
      setLoading(false);
    } else if (getInvitationQuery.error) {
      setError('Einladung nicht gefunden oder abgelaufen');
      setLoading(false);
    }
  }, [invitationToken, getInvitationQuery.data, getInvitationQuery.error]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.acceptTerms) {
      return 'Sie müssen den Bedingungen zustimmen';
    }
    if (!formData.acceptPrivacy) {
      return 'Sie müssen der Datenschutzerklärung zustimmen';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!invitationData || !invitationToken) {
      setError('Einladungsdaten nicht verfügbar');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await acceptInvitationMutation.mutateAsync({
        token: invitationToken,
      });

      setSuccess(true);

      // Redirect to Clerk sign-up with email pre-filled
      setTimeout(() => {
        navigate(`/sign-up?email=${encodeURIComponent(invitationData.invitation.email)}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Fehler</h1>
          </div>
          <p className="text-gray-700 mb-6">{error || 'Einladung nicht gefunden'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registrierung erfolgreich!</h1>
          <p className="text-gray-700 mb-6">
            Sie werden in Kürze zur Anmeldung weitergeleitet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-yellow-500 px-8 py-12">
            <h1 className="text-3xl font-bold mb-2">Willkommen!</h1>
            <p className="text-gray-300">
              Registrieren Sie sich im Angelus Investorenportal
            </p>
          </div>

          <div className="p-8">
            {invitationData.customer && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h2 className="font-semibold text-gray-900 mb-3">Ihre Daten</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">
                      {invitationData.customer.firstName} {invitationData.customer.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">
                      {invitationData.customer.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                Nach Bestätigung werden Sie zum sicheren Clerk-Anmeldeportal weitergeleitet,
                wo Sie Ihr Passwort festlegen können.
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500 border-gray-300"
                  disabled={submitting}
                />
                <label htmlFor="acceptTerms" className="ml-3 text-sm text-gray-700">
                  Ich akzeptiere die{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                    Allgemeinen Geschäftsbedingungen
                  </a>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="acceptPrivacy"
                  checked={formData.acceptPrivacy}
                  onChange={(e) => handleInputChange('acceptPrivacy', e.target.checked)}
                  className="mt-1 w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500 border-gray-300"
                  disabled={submitting}
                />
                <label htmlFor="acceptPrivacy" className="ml-3 text-sm text-gray-700">
                  Ich akzeptiere die{' '}
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                    Datenschutzerklärung
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-black font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Wird registriert...
                  </>
                ) : (
                  'Jetzt registrieren'
                )}
              </button>

              <p className="text-center text-sm text-gray-600">
                Haben Sie bereits ein Konto?{' '}
                <a href="/login" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                  Hier anmelden
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
