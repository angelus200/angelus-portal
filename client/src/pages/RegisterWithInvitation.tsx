import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

type InvitationSource = 'general' | 'legacy';

interface ResolvedInvitation {
  source: InvitationSource;
  email: string;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  expiresAt: Date;
}

export function RegisterWithInvitation() {
  const [, navigate] = useLocation();
  // Token AUSSCHLIESSLICH aus der echten Browser-URL (wouter useLocation liefert kein ?param — Bug dd80531)
  const searchParams = new URLSearchParams(window.location.search);
  const invitationToken = searchParams.get('invitation');

  const [resolved, setResolved] = useState<ResolvedInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // General invitation query
  const generalQuery = trpc.invitations.getByToken.useQuery(
    { token: invitationToken || '' },
    { enabled: !!invitationToken, retry: false }
  );

  // Legacy invitation query (fallback)
  const legacyQuery = trpc.legacyInvitations.getByToken.useQuery(
    { token: invitationToken || '' },
    {
      enabled: !!invitationToken && generalQuery.isError,
      retry: false,
    }
  );

  const registerGeneral = trpc.auth.registerWithInvitation.useMutation();
  const registerLegacy = trpc.auth.registerWithLegacyInvitation.useMutation();

  useEffect(() => {
    if (!invitationToken) {
      setError('Kein Einladungs-Token vorhanden');
      setLoading(false);
      return;
    }

    if (generalQuery.data) {
      setResolved({
        source: 'general',
        email: generalQuery.data.email,
        name: generalQuery.data.name,
        expiresAt: new Date(generalQuery.data.expiresAt),
      });
      // Namen vorbefüllen falls vorhanden
      if (generalQuery.data.name && !firstName && !lastName) {
        const parts = generalQuery.data.name.trim().split(/\s+/);
        setFirstName(parts.slice(0, -1).join(' ') || parts[0] || '');
        setLastName(parts.length > 1 ? parts[parts.length - 1] : '');
      }
      setLoading(false);
    } else if (generalQuery.isError && legacyQuery.data) {
      const c = legacyQuery.data.customer;
      setResolved({
        source: 'legacy',
        email: legacyQuery.data.invitation.email,
        firstName: c?.firstName,
        lastName: c?.lastName,
        expiresAt: new Date(legacyQuery.data.invitation.expiresAt),
      });
      if (c?.firstName && !firstName) setFirstName(c.firstName);
      if (c?.lastName && !lastName) setLastName(c.lastName);
      setLoading(false);
    } else if (generalQuery.isError && legacyQuery.isError) {
      setError('Einladung nicht gefunden oder abgelaufen');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invitationToken,
    generalQuery.data,
    generalQuery.isError,
    legacyQuery.data,
    legacyQuery.isError,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolved || !invitationToken) return;
    if (password.length < 10) { setError('Das Passwort muss mindestens 10 Zeichen lang sein'); return; }
    if (password !== passwordConfirm) { setError('Die Passwörter stimmen nicht überein'); return; }
    if (!acceptTerms) { setError('Bitte akzeptieren Sie die Bedingungen'); return; }
    if (!acceptPrivacy) { setError('Bitte akzeptieren Sie die Datenschutzerklärung'); return; }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        token: invitationToken,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      };
      if (resolved.source === 'general') {
        await registerGeneral.mutateAsync(payload);
      } else {
        await registerLegacy.mutateAsync(payload);
      }

      setSuccess(true);
      // Session-Cookie ist gesetzt → harter Reload ins Onboarding, damit auth.me frisch lädt
      setTimeout(() => {
        window.location.href = '/investor/onboarding';
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Einladung wird geprüft...</p>
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border rounded-lg shadow-sm p-8 max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h1 className="text-xl font-semibold">Einladung ungültig</h1>
          </div>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Konto erstellt</h1>
          <p className="text-muted-foreground">Sie werden angemeldet...</p>
        </div>
      </div>
    );
  }

  const displayName =
    resolved.source === 'general'
      ? resolved.name || resolved.email
      : `${resolved.firstName ?? ''} ${resolved.lastName ?? ''}`.trim() || resolved.email;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden max-w-md w-full">
        <div className="bg-primary/5 border-b px-8 py-8">
          <h1 className="text-2xl font-semibold mb-1">Willkommen</h1>
          <p className="text-muted-foreground text-sm">
            Sie wurden eingeladen. Legen Sie jetzt Ihr Passwort fest.
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 p-4 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground">{resolved.email}</p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium">Vorname</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={submitting}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-sm font-medium">Nachname</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={submitting}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Passwort (mind. 10 Zeichen)</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="passwordConfirm" className="text-sm font-medium">Passwort bestätigen</label>
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={submitting}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 w-4 h-4 rounded border-input"
              />
              <span className="text-sm text-muted-foreground">
                Ich akzeptiere die{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                  Allgemeinen Geschäftsbedingungen
                </a>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 w-4 h-4 rounded border-input"
              />
              <span className="text-sm text-muted-foreground">
                Ich akzeptiere die{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                  Datenschutzerklärung
                </a>
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Konto wird erstellt...
                </>
              ) : (
                'Konto erstellen & anmelden'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
