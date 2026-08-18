import fs from "node:fs";
import path from "node:path";

/**
 * Carrega o .env.local nos testes. O vitest não roda o loader do Next,
 * então testes de integração precisam fazer isso à mão.
 *
 * Cuidado com CRLF: `.` não casa com \r em regex JS, por isso o split
 * remove o \r antes de aplicar o padrão. Sem isso, só a última linha do
 * arquivo é lida — falha silenciosa que faz o teste passar pelo motivo errado.
 */
export function carregarEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const linha of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
}
