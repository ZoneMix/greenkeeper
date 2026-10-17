'use client';

import { PageHead } from '@/components/ui/Layout';
import { ErrorNotice } from '@/components/ui/Notice';

export default function ErrorPage({ unstable_retry }: { readonly error: Error & { digest?: string }; readonly unstable_retry: () => void }) {
  return (
    <>
      <PageHead eyebrow="Sorry about that" title="Something broke" lede="The page hit an unexpected error. Your data is safe in the local database." />
      <div className="sect">
        <div />
        <ErrorNotice message="Try loading the page again." onRetry={unstable_retry} />
      </div>
    </>
  );
}
