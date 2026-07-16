import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = new URL("../outputs/spec-workbook/ota_habit_coach_spec_updated.xlsx", import.meta.url).pathname;
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "sheet,table",
  tableMaxRows: 4,
  tableMaxCols: 6,
  tableMaxCellChars: 90,
  maxChars: 6000,
});
console.log(overview.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  maxChars: 2000,
});
console.log(errors.ndjson || "no formula errors");
