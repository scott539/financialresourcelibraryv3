import { Resource, ResourceType, MainCategory, Tag } from '../types';
import { applyCatalogEditorial } from './catalogEditorial';
import { applyCatalogImage } from './catalogImages';

// Retain the original ID so existing preview and embed links keep working.
const megaCapWorkbook = {
  id: 'bp-mega-backdoor-roth-guide',
  title: 'Mega-Cap Valuation Workbook',
  description: 'See how much cash flow growth the prices of mega-cap companies imply. Start with the July 30, 2026 snapshot or enter your own assumptions.',
  longDescription: 'What growth would justify these share prices? Start with the workbook’s July 30, 2026 valuation snapshot, then change the inputs to see how the required cash flow growth changes. The starting prices are historical, not live quotes.',
  type: ResourceType.WEB_APP,
  tags: [Tag.PROJECTION_MODELS],
  googleDriveUrl: 'https://biggerpocketsmoney.com/megacap/',
  fileUrl: 'https://biggerpocketsmoney.com/megacap/',
  fileName: '',
  actionLabel: 'Open Workbook',
};

export const STATIC_RESOURCES: Resource[] = [
  {
    id: 'bp-budget-template-tracker',
    title: 'Personal Budget Template & Tracker',
    description: 'A comprehensive personal budgeting and cash flow tracking template designed to analyze your spending and optimize your savings rate.',
    longDescription: 'A comprehensive personal budgeting and cash flow tracking template designed specifically for the FI/RE community to analyze your spending, optimize your savings rate, and forecast your journey to financial freedom.',
    category: MainCategory.TOOLKIT,
    type: ResourceType.SPREADSHEET,
    tags: [Tag.CALCULATORS, Tag.GOAL_SETTING],
    googleDriveUrl: 'https://biggerpocketsmoney.com/budget/',
    fileUrl: 'https://biggerpocketsmoney.com/budget/',
    fileName: 'Personal_Budget_Tracker.xlsx',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    downloadCount: 201,
    isComingSoon: false,
    isHidden: false,
    isOpenDirectly: true,
    isFeatured: false,
    actionLabel: 'Open Spreadsheet'
  },
  {
    id: 'bp-income-tax-projection',
    title: 'Income Tax Projection Calculator',
    description: 'Project your annual income tax liability, calculate effective tax brackets, and optimize tax-loss harvesting or deductions.',
    longDescription: 'Plan ahead and prevent surprises. This Income Tax Projection Calculator helps you estimate your annual tax liability, understand your marginal vs. effective tax brackets, and evaluate options for pre-tax contributions.',
    category: MainCategory.TOOLKIT,
    type: ResourceType.SPREADSHEET,
    tags: [Tag.CALCULATORS, Tag.PROJECTION_MODELS],
    googleDriveUrl: 'https://biggerpocketsmoney.com/tax-projection/',
    fileUrl: 'https://biggerpocketsmoney.com/tax-projection/',
    fileName: 'Income_Tax_Projection_Model.xlsx',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
    downloadCount: 899,
    isComingSoon: false,
    isHidden: false,
    isOpenDirectly: true,
    actionLabel: 'Open Spreadsheet'
  },
  {
    id: 'bp-healthcare-costs-estimator',
    title: 'Healthcare Costs Estimator',
    description: 'Estimate and plan for your post-retirement healthcare costs, insurance premiums, and HSA contribution strategies.',
    longDescription: 'One of the largest expenses in retirement is medical care. This Healthcare Costs Estimator helps you plan for future premiums, deductibles, out-of-pocket limits, and maximize tax-free growth with HSA strategies.',
    category: MainCategory.TOOLKIT,
    type: ResourceType.SPREADSHEET,
    tags: [Tag.CALCULATORS, Tag.PROJECTION_MODELS],
    googleDriveUrl: 'https://biggerpocketsmoney.com/healthcarecosts/',
    fileUrl: 'https://biggerpocketsmoney.com/healthcarecosts/',
    fileName: 'Healthcare_Costs_Estimator.xlsx',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80',
    downloadCount: 2509,
    isComingSoon: false,
    isHidden: false,
    isOpenDirectly: true,
    actionLabel: 'Open Spreadsheet'
  },
  {
    id: 'bp-mortgage-payoff-calculator',
    title: 'Mortgage Payoff & Amortization Calculator',
    description: 'Visualize how extra principal payments accelerate your home payoff date and track interest saved over the life of your loan.',
    longDescription: 'Compare the long-term impact of paying down your mortgage early versus investing the difference. Track amortization schedules, extra monthly or annual payments, and discover how many years you can shave off your loan.',
    category: MainCategory.TOOLKIT,
    type: ResourceType.SPREADSHEET,
    tags: [Tag.CALCULATORS],
    googleDriveUrl: 'https://biggerpocketsmoney.com/mortgage-payoff-calculator/',
    fileUrl: 'https://biggerpocketsmoney.com/mortgage-payoff-calculator/',
    fileName: 'Mortgage_Payoff_Amortization_Model.xlsx',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
    downloadCount: 558,
    isComingSoon: false,
    isHidden: false,
    isOpenDirectly: true,
    actionLabel: 'Open Spreadsheet'
  },
  {
    ...megaCapWorkbook,
    category: MainCategory.TOOLKIT,
    imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
    downloadCount: 229,
    isComingSoon: false,
    isHidden: false,
    isOpenDirectly: true
  },
  {
    id: 'bp-personal-financial-statement',
    title: 'Personal Financial Statement (PFS) for FIRE',
    description: 'Track your true net worth, calculate liquid versus non-liquid assets, and optimize your wealth-building trajectory towards financial freedom.',
    longDescription: 'The Personal Financial Statement (PFS) is the bedrock of any serious wealth builder\'s journey. Tailored specifically for the FI/RE community, this comprehensive statement allows you to aggregate your cash, taxable brokerages, retirement funds (401k/IRA), real estate equities, and business valuations against any outstanding debts (mortgages, auto, student loans, or personal liabilities). It computes your debt-to-equity ratio, liquid net worth percentage, and projected progress towards your ultimate FI number, giving you a crystal-clear audit of your financial standing.',
    category: MainCategory.TOOLKIT,
    type: ResourceType.SPREADSHEET,
    tags: [Tag.FINANCIAL_STATEMENTS, Tag.GOAL_SETTING],
    googleDriveUrl: 'https://biggerpocketsmoney.com/resources-pfs/',
    fileUrl: 'https://biggerpocketsmoney.com/resources-pfs/',
    fileName: 'Personal_Financial_Statement_FIRE.xlsx',
    imageUrl: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=600&q=80',
    downloadCount: 1420,
    isComingSoon: false,
    isHidden: false,
    isOpenDirectly: true,
    actionLabel: 'Open Spreadsheet'
  }
].map(resource => correctLegacyCatalogMetadata(resource as Resource));

// Firestore records take precedence over the seed. Correct only the known
// legacy values on read; never re-seed an existing document or reset its views.
export function correctLegacyCatalogMetadata(resource: Resource): Resource {
  return applyCatalogImage(correctEarlierMetadata(applyCatalogEditorial(resource)));
}

function correctEarlierMetadata(resource: Resource): Resource {
  if (resource.id === 'bp-income-tax-projection') {
    const old = 'https://biggerpocketsmoney.com/income-tax-projection/';
    const url = 'https://biggerpocketsmoney.com/tax-projection/';
    return { ...resource, ...(resource.fileUrl === old && { fileUrl: url }),
      ...(resource.googleDriveUrl === old && { googleDriveUrl: url }) };
  }
  if (resource.id === 'QnASLbFPLE48vS6UZqsH' && resource.title === "Bitcon's Binary Endgame (PDF)") {
    return { ...resource, title: "Bitcoin's Binary Endgame (PDF)" };
  }
  if (
    resource.id !== megaCapWorkbook.id ||
    resource.title !== 'Mega Backdoor Roth (Mega Cap) Strategy Guide' ||
    (resource.googleDriveUrl || resource.fileUrl) !== megaCapWorkbook.fileUrl
  ) return resource;

  return {
    ...resource,
    title: megaCapWorkbook.title,
    ...(resource.description === 'Master the advanced after-tax 401(k) contribution strategy to supercharge your tax-free retirement savings.' && { description: megaCapWorkbook.description }),
    ...(resource.longDescription === 'An advanced, step-by-step strategy blueprint designed to help high-income earners utilize after-tax 401(k) contributions and in-plan conversions to funnel up to tens of thousands of extra dollars into tax-free Roth accounts annually.' && { longDescription: megaCapWorkbook.longDescription }),
    ...(resource.type === ResourceType.PDF && { type: megaCapWorkbook.type }),
    ...(resource.tags?.includes(Tag.HIGH_INCOME) && { tags: resource.tags.filter(tag => tag !== Tag.HIGH_INCOME) }),
    ...(resource.fileName === 'Mega_Backdoor_Roth_Strategy_Guide.pdf' && { fileName: megaCapWorkbook.fileName }),
    ...((!resource.actionLabel || resource.actionLabel === 'Read Strategy Guide') && { actionLabel: megaCapWorkbook.actionLabel }),
  };
}
