import Papa from "papaparse";

export type ParsedCsvFile = {
  filename: string;
  headers: string[];
  /** Data rows keyed by header, with every value as a trimmed string. */
  rows: Record<string, string>[];
  /** Non-fatal parser complaints, already de-duplicated. */
  warnings: string[];
};

export class CsvParseError extends Error {}

function cleanHeader(header: string, index: number): string {
  const trimmed = header.replace(/^﻿/, "").trim();
  return trimmed === "" ? `Column ${index + 1}` : trimmed;
}

/**
 * Parses CSV text into header-keyed rows.
 *
 * Everything happens in the browser: no bytes of the file leave the device.
 */
export function parseCsvText(text: string, filename: string): ParsedCsvFile {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    header: false,
  });

  const table = result.data.filter((row) => row.some((cell) => cell?.trim() !== ""));
  if (table.length === 0) {
    throw new CsvParseError("This file has no rows.");
  }

  const rawHeaders = table[0] ?? [];
  const headers: string[] = [];
  const seen = new Map<string, number>();
  rawHeaders.forEach((header, index) => {
    const base = cleanHeader(header ?? "", index);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headers.push(count === 0 ? base : `${base} (${count + 1})`);
  });

  if (headers.length === 0) {
    throw new CsvParseError("This file has no header row.");
  }

  const rows = table.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });

  if (rows.length === 0) {
    throw new CsvParseError("This file has a header row but no transactions.");
  }

  const warnings = Array.from(
    new Set(
      result.errors
        .filter((error) => error.code !== "UndetectableDelimiter")
        .map((error) => error.message),
    ),
  ).slice(0, 5);

  return { filename, headers, rows, warnings };
}

/** Reads a `File` selected by the user and parses it locally. */
export async function parseCsvFile(file: File): Promise<ParsedCsvFile> {
  const text = await file.text();
  if (text.trim() === "") {
    throw new CsvParseError("This file is empty.");
  }
  return parseCsvText(text, file.name);
}
