'use client';

import { useState } from 'react';
import { REPORT_REASONS, type ReportReason } from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useMatching } from '../../hooks/useMatching';
import { apiFetch } from '../../lib/apiClient';
import { AppNav } from '../../components/AppNav';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

/**
 * Anonymous matching (MATCHING_ENGINE.md, implementation 03). Phase 03 delivers
 * pairing + session lifecycle; the in-session conversation arrives in Phase 04.
 */
export default function MatchPage() {
  const { user, isLoading } = useRequireAuth();
  const { state, sessionId, endedReason, findMatch, cancel, leaveSession } = useMatching();
  const [reporting, setReporting] = useState(false);

  if (isLoading || !user) return null;

  const report = (reason: ReportReason) => {
    if (!sessionId) return;
    void apiFetch('/matching/report', {
      method: 'POST',
      body: JSON.stringify({ sessionId, reason }),
    }).finally(() => {
      setReporting(false);
      leaveSession();
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-space-6 px-space-4 py-space-8 md:px-space-8">
      <AppNav />
      <div className="flex flex-col gap-space-1">
        <h1 className="text-h1 text-foreground">Meet someone</h1>
        <p className="text-body text-muted-foreground">
          Get paired with another verified student for an anonymous chat. Zero pressure — leave
          anytime.
        </p>
      </div>

      <Card className="flex min-h-64 flex-col items-center justify-center gap-space-6 text-center">
        {state === 'idle' && (
          <>
            <div className="flex flex-col gap-space-1">
              <CardTitle>Ready when you are</CardTitle>
              <CardDescription>
                {endedReason === 'timeout'
                  ? 'No match found this time. Try again.'
                  : endedReason
                    ? 'Your chat ended. Start another anytime.'
                    : 'Tap below to find someone on your campus.'}
              </CardDescription>
            </div>
            <Button size="lg" onClick={findMatch}>
              Find someone
            </Button>
          </>
        )}

        {state === 'waiting' && (
          <>
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
            <div className="flex flex-col gap-space-1">
              <CardTitle>Looking for someone…</CardTitle>
              <CardDescription>This usually takes just a few seconds.</CardDescription>
            </div>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </>
        )}

        {state === 'in_session' && (
          <>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
            <div className="flex flex-col gap-space-1">
              <CardTitle>You&apos;re connected</CardTitle>
              <CardDescription>
                You&apos;re chatting anonymously. Messaging arrives in the next phase — for now you
                can leave or report.
              </CardDescription>
            </div>
            <div className="flex flex-col items-center gap-space-3">
              <div className="flex gap-space-3">
                <Button variant="secondary" onClick={leaveSession}>
                  Leave chat
                </Button>
                <Button variant="ghost" onClick={() => setReporting((v) => !v)}>
                  Report
                </Button>
              </div>
              {reporting && (
                <div className="flex flex-wrap justify-center gap-space-2">
                  {REPORT_REASONS.map((r) => (
                    <Button key={r} variant="danger" size="sm" onClick={() => report(r)}>
                      {r}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
