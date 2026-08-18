/**
 * Gera um PDF mínimo, porém válido, com as linhas de texto informadas.
 * Serve para exercitar o pipeline de extração ponta a ponta nos testes,
 * sem precisar versionar uma fatura real (que contém dados pessoais).
 */
export function gerarPdfDeTexto(linhas: string[]): Uint8Array {
  const escapar = (s: string) => s.replace(/([\\()])/g, "\\$1");

  // Uma linha de texto a cada 12 pontos, começando no topo da página.
  const comandos = linhas
    .map((linha, i) => `BT /F1 9 Tf 40 ${752 - i * 12} Td (${escapar(linha)}) Tj ET`)
    .join("\n");

  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${comandos.length} >>\nstream\n${comandos}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objetos.forEach((corpo, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${corpo}\nendobj\n`;
  });

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(pdf, "latin1"));
}
