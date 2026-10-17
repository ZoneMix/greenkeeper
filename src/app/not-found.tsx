import Link from 'next/link';
import { PageHead } from '@/components/ui/Layout';

export default function NotFound() {
  return (
    <>
      <PageHead eyebrow="Off the path" title="Not here" lede="That page does not exist." />
      <div className="sect">
        <div />
        <p>
          <Link className="link" href="/">
            Back to today
          </Link>
        </p>
      </div>
    </>
  );
}
