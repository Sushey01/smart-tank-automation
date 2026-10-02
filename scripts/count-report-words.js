/**
 * Word count script for CMP6207 Coursework Report.
 * Specifically measures word count per section (Sections 1 through 6) against budgets,
 * calculates the main narrative total, and calculates a second total including tables and captions.
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', 'report', 'CMP6207-report.md');
const FALLBACK_PATH = path.join(__dirname, '..', 'report', 'REPORT.md');

const BUDGETS = {
  1: { title: 'Introduction', budget: 300 },
  2: { title: 'Principal NoSQL types and theoretical basis', budget: 900 },
  3: { title: 'Critical comparison: relational and document', budget: 900 },
  4: { title: 'Design, implementation and distributed management', budget: 1300 },
  5: { title: 'API implementation and dashboard evidence', budget: 350 },
  6: { title: 'Summary, conclusion and future investment', budget: 250 },
};

function cleanProse(text) {
  // Strip code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, ' ');
  // Strip inline code
  cleaned = cleaned.replace(/`[^`]+`/g, ' ');
  // Strip markdown image links ![alt](url)
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, ' ');
  // Strip markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip tables (lines starting with |)
  cleaned = cleaned.replace(/^\|.*\|$/gm, ' ');
  // Strip figure and table captions (lines starting with *Figure or *Table)
  cleaned = cleaned.replace(/^\*(?:Figure|Table).*?\*$/gm, ' ');
  // Strip blockquotes / alerts
  cleaned = cleaned.replace(/^>.*$/gm, ' ');
  // Strip headers
  cleaned = cleaned.replace(/^#+\s+.*$/gm, ' ');
  // Strip markdown bullet points and numbers
  cleaned = cleaned.replace(/^[\s*-]+(?:\d+\.)?\s+/gm, ' ');
  // Strip LaTeX math blocks $$ ... $$ and inline $ ... $
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  cleaned = cleaned.replace(/\$[^$]+\$/g, ' ');
  // Strip formatting symbols
  cleaned = cleaned.replace(/[*_~`]/g, ' ');

  return cleaned;
}

function cleanInclusive(text) {
  // Strip code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, ' ');
  // Strip inline code
  cleaned = cleaned.replace(/`[^`]+`/g, ' ');
  // Keep tables, captions, prose, links
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, ' ');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  cleaned = cleaned.replace(/\$[^$]+\$/g, ' ');
  cleaned = cleaned.replace(/[*_~`#]/g, ' ');
  cleaned = cleaned.replace(/\|/g, ' ');

  return cleaned;
}

function countWordsInText(text) {
  const words = text
    .split(/\s+/)
    .map((w) => w.trim().replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));
  return words.length;
}

function parseSections(content) {
  const lines = content.split('\n');
  const sections = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], appendices: [], other: [] };
  let currentSec = null;

  for (const line of lines) {
    const secMatch = line.match(/^##\s+([1-6])\b/);
    const refMatch = line.match(/^##\s+(?:References|Bibliography)/i);
    const appMatch = line.match(/^##\s+(?:Appendices|Appendix|[A-F]\b)/i);

    if (secMatch) {
      currentSec = parseInt(secMatch[1], 10);
    } else if (refMatch || appMatch) {
      currentSec = 'appendices';
    }

    if (currentSec && sections[currentSec]) {
      sections[currentSec].push(line);
    } else {
      sections.other.push(line);
    }
  }

  return sections;
}

function main() {
  const targetFile = fs.existsSync(REPORT_PATH) ? REPORT_PATH : FALLBACK_PATH;
  if (!fs.existsSync(targetFile)) {
    console.error(`Error: Report file not found at ${REPORT_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(targetFile, 'utf8');
  const parsed = parseSections(content);

  console.log('========================================================================================');
  console.log('                    CMP6207 MODERN DATA STORES - REPORT WORD COUNT                     ');
  console.log(` File: ${path.relative(process.cwd(), targetFile)}`);
  console.log('========================================================================================');
  console.log('Section                             Actual (Prose)   Target Budget   Variance     Status');
  console.log('----------------------------------------------------------------------------------------');

  let totalProse = 0;
  let totalInclusive = 0;

  for (let s = 1; s <= 6; s += 1) {
    const secLines = parsed[s].join('\n');
    const proseCount = countWordsInText(cleanProse(secLines));
    const inclusiveCount = countWordsInText(cleanInclusive(secLines));
    totalProse += proseCount;
    totalInclusive += inclusiveCount;

    const b = BUDGETS[s];
    const diff = proseCount - b.budget;
    const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
    const status = Math.abs(diff) <= Math.round(b.budget * 0.15) ? 'OK' : (diff > 0 ? 'HIGH' : 'LOW');

    const secTitle = `Section ${s}: ${b.title}`.padEnd(35).substring(0, 35);
    console.log(
      `${secTitle} ${String(proseCount).padStart(8)} words   ${String(b.budget).padStart(7)} words   ${diffStr.padStart(8)}   [${status}]`
    );
  }

  console.log('========================================================================================');
  console.log(`TOTAL MAIN NARRATIVE PROSE (Sections 1-6):   ${totalProse} words  (Target: 4,000 ± 10% / 3,600-4,400)`);
  console.log(`TOTAL INCLUSIVE (Sections 1-6 + Tables/Captions): ${totalInclusive} words`);
  
  // Excluded appendices & references count
  const appWords = countWordsInText(cleanInclusive(parsed.appendices.join('\n')));
  console.log(`APPENDICES & REFERENCES (Excluded):               ${appWords} words`);
  console.log('----------------------------------------------------------------------------------------');

  if (totalProse >= 3600 && totalProse <= 4400) {
    console.log(`[COMPLIANCE STATUS] PASS: Main narrative word count is COMPLIANT (${totalProse} words).`);
  } else if (totalProse < 3600) {
    console.log(`[COMPLIANCE STATUS] WARNING: Word count is below minimum 3,600 (${totalProse} words).`);
  } else {
    console.log(`[COMPLIANCE STATUS] WARNING: Word count exceeds maximum 4,400 (${totalProse} words).`);
  }
  console.log('========================================================================================');
}

main();
