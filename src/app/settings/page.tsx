'use client';

import { SettingsForm } from '@/components/settings/SettingsForm';
import { Loading, PageHead } from '@/components/ui/Layout';
import { ErrorNotice } from '@/components/ui/Notice';
import { useResource } from '@/hooks/useResource';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const settings = useResource('settings', () => api.settings.get());
  return (
    <>
      <PageHead eyebrow="About your yard" title="Settings" lede="Lawn size, equipment and location." />
      {settings.data ? (
        <SettingsForm settings={settings.data} onSaved={settings.reload} />
      ) : settings.state.status === 'error' ? (
        <div className="sect">
          <div />
          <ErrorNotice message={settings.state.message} onRetry={settings.reload} />
        </div>
      ) : (
        <div className="sect">
          <div />
          <Loading label="Loading settings" />
        </div>
      )}
    </>
  );
}
