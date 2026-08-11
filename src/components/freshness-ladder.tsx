import { freshnessLadder } from '@/lib/eo';

export function FreshnessLadder() {
  const rungs = freshnessLadder();
  return (
    <div className="border-line overflow-x-auto rounded-xl border bg-panel">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-line border-b text-xs uppercase tracking-wider text-dim">
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Refresh</th>
            <th className="px-4 py-3">Latency</th>
            <th className="px-4 py-3">Resolution</th>
            <th className="px-4 py-3">Best for</th>
          </tr>
        </thead>
        <tbody>
          {rungs.map((r) => (
            <tr key={r.source} className="border-line border-b last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium">{r.source}</div>
                <div className="text-xs text-dim">{r.sensor}</div>
              </td>
              <td className="px-4 py-3 font-mono text-signal">{r.cadence}</td>
              <td className="px-4 py-3 text-dim">{r.latency}</td>
              <td className="px-4 py-3 font-mono">{r.resolution}</td>
              <td className="px-4 py-3 text-dim">{r.bestFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
