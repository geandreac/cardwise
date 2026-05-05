/**
 * CardWise Engine Validation — GSD Final (Âncora Absoluta, Zero Retroação)
 * Regra: Data impressa = Parcela 1. Fórmula: Date(i) = Âncora + (i-1) meses.
 * Executa com: npx tsx src/lib/__tests__/invoice-engine-validation.ts
 */

// ═══════ FUNÇÕES PURAS (espelho do invoice-utils.ts) ═══════

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function addMonthsPure(y: number, m: number, d: number, monthsToAdd: number): { year: number; month: number; day: number } {
  let newMonth = m + monthsToAdd;
  let newYear = y;
  while (newMonth > 12) { newMonth -= 12; newYear += 1; }
  while (newMonth < 1)  { newMonth += 12; newYear -= 1; }
  const maxDay = getDaysInMonth(newYear, newMonth);
  return { year: newYear, month: newMonth, day: Math.min(d, maxDay) };
}

function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateSafely(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-").map(p => parseInt(p, 10));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      if (parts[0] > 1900) return { year: parts[0], month: parts[1], day: parts[2] };
      return { day: parts[0], month: parts[1], year: parts[2] };
    }
  }
  return null;
}

function calculateCompetenceDate(card: { closing_day: number }, transactionDate: string) {
  const dateObj = parseDateSafely(transactionDate);
  if (!dateObj) return "0000-00-01";
  const { day, month, year } = dateObj;
  let targetMonth = month;
  let targetYear = year;
  if (day <= card.closing_day) { targetMonth += 1; } else { targetMonth += 2; }
  if (targetMonth > 12) {
    targetYear += Math.floor((targetMonth - 1) / 12);
    targetMonth = ((targetMonth - 1) % 12) + 1;
  }
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
}

function generateInstallmentSeries(
  baseTransaction: any, currentInstallment: number, totalInstallments: number,
  card: any, invoiceReferenceMonth: string,
) {
  const series: any[] = [];
  const dateObj = parseDateSafely(baseTransaction.transaction_date);
  if (!dateObj) throw new Error(`Data inválida: ${baseTransaction.transaction_date}`);

  // REGRA ABSOLUTA: data impressa = Parcela 1. Zero retroação.
  const anchorDay = dateObj.day;
  const anchorMonth = dateObj.month;
  const invParts = invoiceReferenceMonth.split('-').map(Number);
  const invoiceYear = invParts[0];
  const invoiceMonth = invParts[1];

  let anchorYear = invoiceYear;
  if (anchorMonth > invoiceMonth) { anchorYear = invoiceYear - 1; }

  // Fórmula: Date(i) = Âncora + (i - 1) meses
  for (let i = 1; i <= totalInstallments; i++) {
    const projected = addMonthsPure(anchorYear, anchorMonth, anchorDay, i - 1);
    const txDateStr = formatDateStr(projected.year, projected.month, projected.day);
    const competenceStr = calculateCompetenceDate(card, txDateStr);
    series.push({
      ...baseTransaction,
      transaction_date: txDateStr,
      competence_date: competenceStr,
      installment_info: `${i}/${totalInstallments}`,
      is_projection: i !== currentInstallment,
    });
  }
  return series;
}

// ═══════ TEST RUNNER ═══════
let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: string) {
  if (cond) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name} — ${detail || ''}`); failed++; }
}

const BB = { closing_day: 30 };

// ═══════════════════════════════════════════════════════
// CENÁRIO 1: DISTRIBUIDORA (data lida 20/03, parcela 03/03)
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 1: DISTRIBUIDORA 03/03 (Âncora=20/03) ══\n");

const dist = generateInstallmentSeries(
  { transaction_date: "2026-03-20", merchant_name: "DISTRIBUIDORA", amount: 219.41 },
  3, 3, BB, "2026-05-01"
);

assert(dist.length === 3, "Série tem 3 itens", `Got: ${dist.length}`);
assert(dist[0].transaction_date === "2026-03-20", "P1/3 = 20/03/2026 (âncora = data lida)", `Got: ${dist[0].transaction_date}`);
assert(dist[1].transaction_date === "2026-04-20", "P2/3 = 20/04/2026", `Got: ${dist[1].transaction_date}`);
assert(dist[2].transaction_date === "2026-05-20", "P3/3 = 20/05/2026", `Got: ${dist[2].transaction_date}`);

assert(dist[0].competence_date === "2026-04-01", "P1 (20/03) → Fatura Abr (20<=30 → M+1)", `Got: ${dist[0].competence_date}`);
assert(dist[1].competence_date === "2026-05-01", "P2 (20/04) → Fatura Mai (20<=30 → M+1)", `Got: ${dist[1].competence_date}`);
assert(dist[2].competence_date === "2026-06-01", "P3 (20/05) → Fatura Jun (20<=30 → M+1)", `Got: ${dist[2].competence_date}`);

assert(dist[2].is_projection === false, "P3/3 (parcela lida) NÃO é projeção");
assert(dist[0].is_projection === true, "P1/3 é projeção");

// ═══════════════════════════════════════════════════════
// CENÁRIO 2: CHARPEY (data lida 19/12, parcela 05/05)
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 2: CHARPEY 05/05 (Âncora=19/12/2025) ══\n");

const ch = generateInstallmentSeries(
  { transaction_date: "2026-12-19", merchant_name: "CHARPEY", amount: 190.19 },
  5, 5, BB, "2026-05-01"
);

assert(ch.length === 5, "Série tem 5 itens");
assert(ch[0].transaction_date === "2025-12-19", "P1/5 = 19/12/2025", `Got: ${ch[0].transaction_date}`);
assert(ch[1].transaction_date === "2026-01-19", "P2/5 = 19/01/2026", `Got: ${ch[1].transaction_date}`);
assert(ch[2].transaction_date === "2026-02-19", "P3/5 = 19/02/2026", `Got: ${ch[2].transaction_date}`);
assert(ch[3].transaction_date === "2026-03-19", "P4/5 = 19/03/2026", `Got: ${ch[3].transaction_date}`);
assert(ch[4].transaction_date === "2026-04-19", "P5/5 = 19/04/2026", `Got: ${ch[4].transaction_date}`);

assert(ch[0].competence_date === "2026-01-01", "P1 → Fatura Jan/2026", `Got: ${ch[0].competence_date}`);
assert(ch[4].competence_date === "2026-05-01", "P5 → Fatura Mai/2026", `Got: ${ch[4].competence_date}`);
assert(ch[4].is_projection === false, "P5/5 (parcela lida) NÃO é projeção");

// Dia preservado em TODAS
for (let i = 0; i < 5; i++) {
  assert(ch[i].transaction_date.endsWith("-19"), `P${i+1}/5 preserva dia 19`);
}

// ═══════════════════════════════════════════════════════
// CENÁRIO 3: COMPRA NO MÊS CORRENTE (15/04, parcela 01/04)
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 3: NOVA COMPRA 01/04 (Âncora=15/04/2026) ══\n");

const nc = generateInstallmentSeries(
  { transaction_date: "2026-04-15", merchant_name: "NOVA COMPRA", amount: 100 },
  1, 4, BB, "2026-05-01"
);

assert(nc.length === 4, "Série tem 4 itens");
assert(nc[0].transaction_date === "2026-04-15", "P1/4 = 15/04/2026", `Got: ${nc[0].transaction_date}`);
assert(nc[1].transaction_date === "2026-05-15", "P2/4 = 15/05/2026", `Got: ${nc[1].transaction_date}`);
assert(nc[2].transaction_date === "2026-06-15", "P3/4 = 15/06/2026", `Got: ${nc[2].transaction_date}`);
assert(nc[3].transaction_date === "2026-07-15", "P4/4 = 15/07/2026", `Got: ${nc[3].transaction_date}`);

assert(nc[0].is_projection === false, "P1/4 (parcela lida) NÃO é projeção");
assert(nc[1].is_projection === true, "P2/4 é projeção");

// ═══════════════════════════════════════════════════════
// CENÁRIO 4: DATE MATH (31/01 em 3x — clamp de mês curto)
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 4: Date Math (31/01 em 3x) ══\n");

const dm = generateInstallmentSeries(
  { transaction_date: "2026-01-31", merchant_name: "TESTE", amount: 300 },
  1, 3, BB, "2026-02-01"
);

assert(dm[0].transaction_date === "2026-01-31", "P1 = 31/01", `Got: ${dm[0].transaction_date}`);
assert(dm[1].transaction_date === "2026-02-28", "P2 = 28/02 (clamp)", `Got: ${dm[1].transaction_date}`);
assert(dm[2].transaction_date === "2026-03-31", "P3 = 31/03 (volta ao original)", `Got: ${dm[2].transaction_date}`);

// ═══════════════════════════════════════════════════════
// CENÁRIO 5: SMART CYCLE M+2 (fechamento dia 15)
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 5: Smart Cycle M+2 ══\n");

assert(calculateCompetenceDate({ closing_day: 15 }, "2026-04-18") === "2026-06-01", "18 > 15 → M+2 = Jun");
assert(calculateCompetenceDate({ closing_day: 15 }, "2026-04-15") === "2026-05-01", "15 <= 15 → M+1 = Mai");
assert(calculateCompetenceDate({ closing_day: 15 }, "2026-04-16") === "2026-06-01", "16 > 15 → M+2 = Jun");

// ═══════════════════════════════════════════════════════
// CENÁRIO 6: VIRADA DE ANO no Smart Cycle
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 6: Virada de Ano ══\n");

assert(calculateCompetenceDate({ closing_day: 10 }, "2025-12-15") === "2026-02-01", "15/12 Fech10 → M+2 = Fev/2026");
assert(calculateCompetenceDate({ closing_day: 10 }, "2025-12-05") === "2026-01-01", "05/12 Fech10 → M+1 = Jan/2026");
assert(calculateCompetenceDate({ closing_day: 30 }, "2025-12-25") === "2026-01-01", "25/12 Fech30 → M+1 = Jan/2026");

// ═══════════════════════════════════════════════════════
// CENÁRIO 7: FINDORCREATE — meses únicos para criação de faturas
// ═══════════════════════════════════════════════════════
console.log("\n══ CENÁRIO 7: FindOrCreate de Faturas ══\n");

const allMonths = new Set([...dist, ...ch, ...nc].map(tx => tx.competence_date));
console.log(`  Meses de competência detectados: ${[...allMonths].sort().join(', ')}`);
assert(allMonths.has("2026-06-01"), "Fatura Jun/2026 será criada (DISTRIBUIDORA P3)");
assert(allMonths.has("2026-07-01"), "Fatura Jul/2026 será criada (NOVA COMPRA P3)");
assert(allMonths.has("2026-08-01"), "Fatura Ago/2026 será criada (NOVA COMPRA P4)");

// ═══════════════════════════════════════════════════════
// RESULTADO FINAL
// ═══════════════════════════════════════════════════════
console.log(`\n${"═".repeat(50)}`);
console.log(`  RESULTADO: ${passed}/${passed + failed} passaram`);
if (failed === 0) {
  console.log("  🎉 TODOS OS TESTES PASSARAM — Motor validado.\n");
} else {
  console.log(`  ⚠️ ${failed} FALHA(S) — Revisar antes de deploy.\n`);
}
process.exit(failed > 0 ? 1 : 0);
