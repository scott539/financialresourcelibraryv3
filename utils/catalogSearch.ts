import type { Resource } from '../types';

const aliases: Record<string, string> = {
  taxes: 'tax', calculators: 'calculator', calculation: 'calculator',
  worksheets: 'worksheet', checklists: 'checklist', templates: 'template',
  spreadsheets: 'spreadsheet', excel: 'spreadsheet', xlsx: 'spreadsheet', sheets: 'spreadsheet', sheet: 'spreadsheet',
  documents: 'document', docx: 'document', word: 'document',
  presentations: 'presentation', slides: 'presentation', powerpoint: 'presentation', pptx: 'presentation',
  apps: 'app', webapp: 'app', tools: 'tool',
  retire: 'retirement', retiring: 'retirement', retired: 'retirement', fire: 'retirement',
  budgets: 'budget', budgeting: 'budget', expenses: 'expense', savings: 'saving',
  households: 'household', families: 'family', goals: 'goal',
  health: 'healthcare', medical: 'healthcare',
  compare: 'comparison', comparing: 'comparison', comparisons: 'comparison',
  withdrawals: 'withdrawal', investments: 'investing', investment: 'investing',
};
const stopWords = new Set(['a', 'an', 'the', 'to', 'for', 'and', 'with', 'my', 'your', 'of', 'on', 'in']);
const normalize = (text: string) => text.toLowerCase().normalize('NFKD')
  .replace(/fi\/re/g, 'fire').replace(/net\s+worth/g, 'networth')
  .replace(/cash\s+flow/g, 'cashflow').replace(/health\s+care/g, 'healthcare')
  .replace(/web\s+(?:apps?|tools?)/g, 'webapp');
const words = (text: string) => (normalize(text).match(/[a-z0-9]+/g) || [])
  .filter(word => !stopWords.has(word)).map(word => aliases[word] || word);

// Every meaningful query term must match. Format words never waive topic words.
export function scoreResource(resource: Resource, query: string): number {
  const terms = [...new Set(words(query))];
  if (!terms.length) return 0;
  const title = words(resource.title || '');
  const fields: [Set<string>, number][] = [
    [new Set(title), 40],
    [new Set(words(resource.description || '')), 12],
    [new Set(words((resource.tags || []).join(' '))), 16],
    [new Set(words(resource.longDescription || '')), 4],
    [new Set(words(resource.type + (resource.isOpenDirectly ? ' tool app' : ''))), 16],
  ];
  // PFS and balance-sheet searches resolve to the statement without making other
  // "statement" searches (such as investor policy statement) synonyms for PFS.
  if (title.join(' ').includes('personal financial statement')) {
    fields.push([new Set(['pfs', 'networth', 'balance', 'sheet', 'spreadsheet']), 30]);
  }
  // Preserve the familiar search name after clarifying what this tool does.
  if (resource.id === 'bp-budget-template-tracker') {
    fields.push([new Set(['budget', 'calculator', 'benchmark', 'spending']), 30]);
  }
  let score = 0;
  for (const term of terms) {
    const weight = Math.max(0, ...fields.filter(([tokens]) => tokens.has(term)).map(([, weight]) => weight));
    if (!weight) return -1;
    score += weight;
  }
  if (title.join(' ').includes(terms.join(' '))) score += 100;
  return score;
}
