type ProgressCardProps = {
  used: number;
  total: number;
  percent: number;
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ProgressCard({
  used = 4832,
  total = 20000,
  percent = 24,
}: ProgressCardProps) {
  const barColor =
    percent >= 80
      ? "from-red-500 to-rose-400"
      : percent >= 60
      ? "from-yellow-500 to-amber-400"
      : "from-blue-500 to-sky-400";

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">
          Uso do Limite Mensal
        </span>
        <span className="text-xs font-semibold text-white">
          {percent}% utilizado
        </span>
      </div>

      {/* Track */}
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Uso do limite mensal"
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
        <span>{formatBRL(used)} usado</span>
        <span>{formatBRL(total)} limite</span>
      </div>
    </section>
  );
}