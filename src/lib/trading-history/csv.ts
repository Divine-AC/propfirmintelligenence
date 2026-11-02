import type { ClosedTrade, CsvPreview, TradeAnalysis, TradeColumnMap, TradeField } from "./types";
import { analyzeTrades } from "./analytics";

export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_TRADE_ROWS = 10_000;

export class TradeCsvError extends Error {
  constructor(message: string) { super(message); this.name = "TradeCsvError"; }
}

function parseRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new TradeCsvError("The CSV contains an unclosed quoted value.");
  if (cell.length > 0 || row.length > 0) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/[ _-]+/g, " ");

const aliases: Record<TradeField, string[]> = {
  symbol: ["symbol", "instrument", "market", "asset"],
  side: ["side", "type", "direction", "action"],
  openTime: ["open time", "opened at", "open date", "time open", "entry time", "entry date"],
  closeTime: ["close time", "closed at", "close date", "time close", "exit time", "exit date"],
  profit: ["profit", "gross profit", "net profit", "net pnl", "p&l", "pnl", "profit/loss"],
  commission: ["commission", "commissions", "fee", "fees"],
  swap: ["swap", "swaps", "financing"],
  riskAmount: ["risk", "risk amount", "planned risk", "initial risk"],
  tradeId: ["ticket", "trade id", "deal id", "position id", "order id"],
  balance: ["balance", "account balance"],
  equity: ["equity", "account equity"],
};

const requiredFields: TradeField[] = ["symbol", "side", "openTime", "closeTime", "profit"];
const allFields: TradeField[] = Object.keys(aliases) as TradeField[];

function suggestMapping(headers: string[]): TradeColumnMap {
  const mapping: TradeColumnMap = {};
  const claimed = new Set<number>();
  for (const field of allFields) {
    const index = headers.findIndex((header, i) => !claimed.has(i) && aliases[field].includes(normalizeHeader(header)));
    if (index >= 0) { mapping[field] = index; claimed.add(index); }
  }
  return mapping;
}

function readNumber(value: string, label: string, errors: string[]): number | null {
  const text = value.trim();
  if (!text) { errors.push(`${label} is missing.`); return null; }
  if (text.includes(",") && !/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) { errors.push(`${label} uses an ambiguous number format.`); return null; }
  const normalized = text.replace(/,/g, "");
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) { errors.push(`${label} must be a valid number.`); return null; }
  const number = Number(normalized);
  if (!Number.isFinite(number)) { errors.push(`${label} must be finite.`); return null; }
  if (label === "Risk amount" && number <= 0) { errors.push("Risk amount must be greater than zero."); return null; }
  return number;
}

function readTimestamp(value: string, label: string, errors: string[]): string | null {
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    errors.push(`${label} must be ISO date/time with a timezone.`); return null;
  }
  const stamp = Date.parse(text);
  if (!Number.isFinite(stamp)) { errors.push(`${label} is not a valid date/time.`); return null; }
  const [year, month, day] = text.slice(0, 10).split("-").map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() + 1 !== month || normalized.getUTCDate() !== day) {
    errors.push(`${label} is not a valid calendar date.`); return null;
  }
  return new Date(stamp).toISOString();
}

function cellFor(row: string[], mapping: TradeColumnMap, field: TradeField): string {
  const index = mapping[field];
  return index === undefined ? "" : (row[index] ?? "");
}

function parseTrade(row: string[], rowNumber: number, mapping: TradeColumnMap, headers: string[]): { trade?: ClosedTrade; errors: string[] } {
  const errors: string[] = [];
  for (const field of requiredFields) if (mapping[field] === undefined) errors.push(`Map a CSV column to ${field}.`);
  if (row.length !== headers.length) errors.push("The number of values does not match the header.");
  const symbol = cellFor(row, mapping, "symbol").trim();
  if (mapping.symbol !== undefined && !symbol) errors.push("Symbol cannot be empty.");
  const sideText = cellFor(row, mapping, "side").trim().toLowerCase();
  const side = ["long", "buy"].includes(sideText) ? "long" : ["short", "sell"].includes(sideText) ? "short" : null;
  if (mapping.side !== undefined && !side) errors.push("Side must be buy/long or sell/short.");
  const openTime = mapping.openTime === undefined ? null : readTimestamp(cellFor(row, mapping, "openTime"), "Open time", errors);
  const closeTime = mapping.closeTime === undefined ? null : readTimestamp(cellFor(row, mapping, "closeTime"), "Close time", errors);
  if (openTime && closeTime && Date.parse(closeTime) < Date.parse(openTime)) errors.push("Close time cannot be before open time.");

  const profitHeader = mapping.profit === undefined ? "" : normalizeHeader(headers[mapping.profit] ?? "");
  const profit = mapping.profit === undefined ? null : readNumber(cellFor(row, mapping, "profit"), "Profit", errors);
  const commissionText = cellFor(row, mapping, "commission");
  const swapText = cellFor(row, mapping, "swap");
  const commission = mapping.commission === undefined || !commissionText.trim() ? 0 : readNumber(commissionText, "Commission", errors);
  const swap = mapping.swap === undefined || !swapText.trim() ? 0 : readNumber(swapText, "Swap", errors);
  const risk = mapping.riskAmount === undefined || !cellFor(row, mapping, "riskAmount").trim() ? null : readNumber(cellFor(row, mapping, "riskAmount"), "Risk amount", errors);
  const balance = mapping.balance === undefined || !cellFor(row, mapping, "balance").trim() ? null : readNumber(cellFor(row, mapping, "balance"), "Balance", errors);
  const equity = mapping.equity === undefined || !cellFor(row, mapping, "equity").trim() ? null : readNumber(cellFor(row, mapping, "equity"), "Equity", errors);
  const isNetProfit = ["net profit", "net pnl"].includes(profitHeader);
  const netProfit = profit === null ? null : profit + (isNetProfit ? 0 : (commission ?? 0) + (swap ?? 0));
  if (errors.length || !openTime || !closeTime || !side || netProfit === null) return { errors };
  return { trade: { rowNumber, tradeId: mapping.tradeId === undefined ? null : (cellFor(row, mapping, "tradeId").trim() || null), symbol, side, openTime, closeTime, netProfit, riskAmount: risk, observedBalance: balance, observedEquity: equity }, errors };
}

export function previewTradeCsv(csv: string, mapping?: TradeColumnMap): CsvPreview {
  if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) throw new TradeCsvError("The CSV is larger than the 5 MB limit.");
  const rows = parseRows(csv.replace(/^\uFEFF/, ""));
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim()));
  if (headerIndex < 0) throw new TradeCsvError("The CSV is empty.");
  const headers = rows[headerIndex].map((header) => header.trim());
  const suggestedMapping = suggestMapping(headers);
  const chosen = mapping ?? suggestedMapping;
  const mappedIndices = Object.values(chosen).filter((index): index is number => index !== undefined);
  if (new Set(mappedIndices).size !== mappedIndices.length) throw new TradeCsvError("Each CSV column can only be mapped to one field.");
  for (const [field, index] of Object.entries(chosen)) {
    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= headers.length) throw new TradeCsvError(`The selected CSV column for ${field} is invalid.`);
  }
  const records = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell.trim()));
  if (!records.length) throw new TradeCsvError("The CSV has headers but no trade rows.");
  if (records.length > MAX_TRADE_ROWS) throw new TradeCsvError(`The CSV exceeds the ${MAX_TRADE_ROWS.toLocaleString()} trade limit.`);
  const invalidRows: CsvPreview["invalidRows"] = [];
  const duplicateRows: number[] = [];
  const seen = new Set<string>();
  const trades: ClosedTrade[] = [];
  records.forEach((row, i) => {
    const rowNumber = headerIndex + i + 2;
    const parsed = parseTrade(row, rowNumber, chosen, headers);
    if (!parsed.trade) { invalidRows.push({ rowNumber, errors: parsed.errors }); return; }
    const trade = parsed.trade;
    const key = trade.tradeId ? `id:${trade.tradeId}` : [trade.symbol.toLowerCase(), trade.side, trade.openTime, trade.closeTime, trade.netProfit].join("|");
    if (seen.has(key)) { duplicateRows.push(rowNumber); return; }
    seen.add(key);
    trades.push(trade);
  });
  const used = new Set(Object.values(chosen).filter((index): index is number => index !== undefined));
  const unmappedHeaders = headers.filter((_, index) => !used.has(index));
  const warnings: string[] = [];
  if (chosen.profit !== undefined && ["net profit", "net pnl"].includes(normalizeHeader(headers[chosen.profit])) && (chosen.commission !== undefined || chosen.swap !== undefined)) warnings.push("The selected profit column appears to be net of costs; commission and swap will not be added again.");
  if (trades.some((trade) => trade.riskAmount === null)) warnings.push("Some rows do not include planned risk, so realized R-multiple will cover only rows with risk values.");
  return { headers, suggestedMapping, mapping: chosen, totalRows: records.length, validRows: trades.length, invalidRows, duplicateRows, trades, unmappedHeaders, warnings };
}

export function analyzeTradePreview(preview: CsvPreview, startingBalance = 0): TradeAnalysis {
  if (!Number.isFinite(startingBalance) || startingBalance < 0) throw new TradeCsvError("Starting balance must be a finite, non-negative number.");
  if (!preview.trades.length) throw new TradeCsvError("There are no valid, non-duplicate trades to analyze.");
  return analyzeTrades(preview.trades, startingBalance, preview.warnings);
}

export function analyzeTradeCsv(csv: string, startingBalance = 0, mapping?: TradeColumnMap): TradeAnalysis {
  const preview = previewTradeCsv(csv, mapping);
  if (preview.invalidRows.length) throw new TradeCsvError(`${preview.invalidRows.length} invalid row(s) found; preview and resolve them before analysis.`);
  if (preview.duplicateRows.length) throw new TradeCsvError(`${preview.duplicateRows.length} duplicate row(s) found; preview and resolve them before analysis.`);
  return analyzeTradePreview(preview, startingBalance);
}
