/**
 * Word count script for CMP6207 Coursework Report.
 * Specifically measures word count for assessed sections 3 through 8
 * (Target: 4,000 words ± 10%, i.e., 3,600 - 4,400 words).
 * Excludes headers, code blocks, tables, image links, and references.
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', 'report', 'CMP6207-report.md');
const FALLBACK_PATH = path.join(__dirname, '..', 'report', 'REPORT.md');

function countWords(text) {
  // Strip code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, ' ');
  // Strip inline code
  cleaned = cleaned.replace(/`[^`]+`/g, ' ');
  // Strip image references
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, ' ');
  // Strip markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip markdown headers, bold, italics, bullets
  cleaned = cleaned.replace(/^[#*>-]+\s+/gm, ' ');
  cleaned = cleaned.replace(/[*_~`]/g, ' ');
  // Strip tables (lines starting with |)
  cleaned = cleaned.replace(/^\|.*\|$/gm, ' ');
  // Strip LaTeX math blocks $$ ... $$ and inline $ ... $
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  cleaned = cleaned.replace(/\$[^$]+\$/g, ' ');
  // Split words by whitespace
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim().replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));
  return words.length;
}

function extractSections3to8(content) {
  const lines = content.split('\n');
  let inTargetSection = false;
  const targetLines = [];

  for (const line of lines) {
    // Check if section 3 starts
    if (/^#+\s+(?:3[.\s]|Section\s+3)/i.test(line)) {
      inTargetSection = true;
    }
    // Check if section 9 starts (end of section 8)
    if (/^#+\s+(?:9[.\s]|Section\s+9|References|Bibliography)/i.test(line)) {
      inTargetSection = false;
    }

    if (inTargetSection) {
      targetLines.push(line);
    }
  }

  return targetLines.join('\n');
}

function main() {
  const targetFile = fs.existsSync(REPORT_PATH) ? REPORT_PATH : FALLBACK_PATH;
  if (!fs.existsSync(targetFile)) {
    console.error(`Error: Report file not found at ${REPORT_PATH} or ${FALLBACK_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(targetFile, 'utf8');
  const totalWords = countWords(content);
  const targetSectionContent = extractSections3to8(content);
  const targetWords = countWords(targetSectionContent);

  console.log('============================================================');
  console.log(' CMP6207 Modern Data Stores - Report Word Count Analysis');
  console.log(` File: ${path.relative(process.cwd(), targetFile)}`);
  console.log('============================================================');
  console.log(`Total Document Words (all sections): ${totalWords}`);
  console.log(`Assessed Core Words (Sections 3 to 8): ${targetWords}`);
  console.log('Coursework Target for Sections 3-8: 4,000 words (±10%: 3,600 - 4,400)');
  console.log('------------------------------------------------------------');

  if (targetWords >= 3600 && targetWords <= 4400) {
    console.log(`[STATUS] PASS: Word count is within the compliant range (${targetWords} words).`);
  } else if (targetWords < 3600) {
    console.log(`[STATUS] NOTE: Word count is below 3,600 (${targetWords} words). Elaborate on critical sections.`);
  } else {
    console.log(`[STATUS] WARNING: Word count exceeds 4,400 (${targetWords} words). Trim verbose descriptions.`);
  }
  console.log('============================================================');
}

main();
