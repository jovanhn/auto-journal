type StatTileProps = {
  label: string;
  value: string;
};

/** Expenses stat tile (design: `StatTile`, default variant): label above an 18 px value. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
