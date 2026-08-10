import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

export type RamalEntry = {
  ramal: string;
  nomeSetor: string;
};

const DATA_FILE = path.join(process.cwd(), "src", "lib", "Ramais_Completo.xlsx");

let cached: RamalEntry[] | null = null;
let cachedMtime = 0;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function loadRamais(): RamalEntry[] {
  const stat = fs.statSync(DATA_FILE);
  if (cached && cachedMtime === stat.mtimeMs) return cached;

  const workbook = XLSX.readFile(DATA_FILE);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  cached = rows
    .map((row) => {
      const ramal = String(row["Ramal"] ?? "").trim();
      const nomeSetor = String(row["Nome / Setor"] ?? "").trim();
      return { ramal, nomeSetor };
    })
    .filter((row) => row.ramal && row.nomeSetor);

  cachedMtime = stat.mtimeMs;
  return cached;
}

export function searchRamais(options: {
  ramal?: string;
  nomeSetor?: string;
}): RamalEntry[] {
  const all = loadRamais();
  const ramalQuery = normalize(options.ramal ?? "");
  const nomeQuery = normalize(options.nomeSetor ?? "");

  if (!ramalQuery && !nomeQuery) return all;

  return all.filter((entry) => {
    const ramalOk = !ramalQuery || normalize(entry.ramal).includes(ramalQuery);
    const nomeOk = !nomeQuery || normalize(entry.nomeSetor).includes(nomeQuery);
    return ramalOk && nomeOk;
  });
}
