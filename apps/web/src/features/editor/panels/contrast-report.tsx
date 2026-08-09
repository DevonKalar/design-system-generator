import type { ContrastReport as Report } from '@dsg/tokens';

const GRADE_STYLES: Record<Report['grade'], string> = {
  aaa: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  aa: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  'aa-large': 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
  fail: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

const GRADE_LABELS: Record<Report['grade'], string> = {
  aaa: 'AAA',
  aa: 'AA',
  'aa-large': 'AA large only',
  fail: 'Fails',
};

export function ContrastReport({ reports }: { reports: Report[] }) {
  return (
    <ul className="space-y-1">
      {reports.map((report) => (
        <li
          key={`${report.background}-${report.foreground}`}
          className="flex items-center gap-2 text-xs"
        >
          <span className="flex-1 truncate font-mono text-zinc-600 dark:text-zinc-400">
            {report.foreground} on {report.background}
          </span>
          <span className="text-zinc-500 tabular-nums">{report.ratio.toFixed(2)}:1</span>
          <span className={`rounded px-1.5 py-0.5 font-medium ${GRADE_STYLES[report.grade]}`}>
            {GRADE_LABELS[report.grade]}
          </span>
        </li>
      ))}
    </ul>
  );
}
