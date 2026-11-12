import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { BuildInfo } from '@/shared/buildInfo';
import { mediumDate } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';

export type BackendBuild =
  { state: 'checking' } | { state: 'unavailable' } | { state: 'ready'; info: BuildInfo };

type BuildInfoFooterProps = {
  frontend: BuildInfo;
  backend: BackendBuild;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** `Nov 12, 2026` in the viewer's time zone. */
const localDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return mediumDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
};

const details = (info: BuildInfo) =>
  [
    `${info.component} ${info.version}`,
    `  gitSha: ${info.gitSha}`,
    `  buildId: ${info.buildId}`,
    `  buildTime: ${info.buildTime}`,
  ].join('\n');

/** Both components' full metadata as plain text (AC 8). */
const buildDetailsText = (frontend: BuildInfo, backend: BackendBuild): string =>
  [details(frontend), backend.state === 'ready' ? details(backend.info) : `backend ${backend.state}`].join(
    '\n',
  );

function BuildLine({ label, info }: { label: string; info: BuildInfo }) {
  return (
    <p>
      {label} <span className="text-foreground">{info.version}</span> ·{' '}
      <span className="font-mono">{info.gitSha.slice(0, 7)}</span> · {localDate(info.buildTime)}
    </p>
  );
}

/** Quiet build-info footer at the bottom of Settings (specs/app-versioning.md, AC 6–8). */
export function BuildInfoFooter({ frontend, backend }: BuildInfoFooterProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildDetailsText(frontend, backend));
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <footer
      aria-label="Build info"
      className="flex items-end justify-between gap-3 text-xs text-muted-foreground"
    >
      <div className="flex flex-col gap-1">
        <BuildLine label="Frontend" info={frontend} />
        {backend.state === 'ready' ? (
          <BuildLine label="Backend" info={backend.info} />
        ) : (
          <p>Backend {backend.state === 'checking' ? 'Checking…' : 'Unavailable'}</p>
        )}
      </div>
      <Button variant="ghost" size="xs" onClick={() => void copy()}>
        <Copy aria-hidden="true" />
        Copy
      </Button>
    </footer>
  );
}
