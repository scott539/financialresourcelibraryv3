export enum ResourceType {
  PDF = 'PDF',
  SPREADSHEET = 'Spreadsheet',
  DOCUMENT = 'Document',
  PRESENTATION = 'Presentation',
  IMAGE = 'Image',
  VIDEO = 'Video',
  AUDIO = 'Audio',
}

export enum MainCategory {
  TOOLKIT = 'DIY Personal Finance Toolkit',
  PLANS = 'Sample Financial Plans',
}

export enum Tag {
  // DIY Personal Finance Toolkit Tags
  CALCULATORS = 'Calculators',
  FINANCIAL_STATEMENTS = 'Personal Financial Statements',
  PROJECTION_MODELS = 'Projection Models',
  FINANCIAL_PLAN_TEMPLATES = 'Financial Plan Templates',
  FINANCIAL_PLANNING_CHECKLISTS = 'Financial Planning Checklists',
  ESTATE_PLANNING = 'Estate Planning',
  GOAL_SETTING = 'Goal Setting/Visioning',
  MONEY_DATE_TEMPLATE = 'Money Date Template',

  // Sample Financial Plans Tags
  FAMILIES = 'Families',
  SINGLE_PARENT = 'Single Parent',
  SINGLE = 'Single',
  DINK = 'DINK (Dual Income, No Kids)',
  HIGH_INCOME = 'High Income',
  LOW_INCOME = 'Low Income',
  MIDDLE_INCOME = 'Middle Income',
  HCOL = 'HCOL (High Cost of Living)',
  VHCOL = 'VHCOL (Very High Cost of Living)',
  MCOL = 'MCOL (Medium Cost of Living)',
  LCOL = 'LCOL (Low Cost of Living)',
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  type: ResourceType;
  category: MainCategory;
  tags: Tag[];
  imageUrl: string;
  downloadCount: number;
  isComingSoon: boolean;
  fileUrl: string;
  fileName: string;
}

export interface Lead {
  id:string;
  firstName: string;
  email: string;
  resourceId: string;
  resourceTitle?: string;
  timestamp: string;
  hasConsented: boolean;
}

export const ALL_TAGS = Object.values(Tag);