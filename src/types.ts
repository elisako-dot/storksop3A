export interface SectionRow extends Array<string> {}

export interface TableSection {
  name: string;
  type?: "table";
  headers: string[];
  rows: SectionRow[];
}

export interface NotesSection {
  name: string;
  type: "notes";
  items: string[];
}

export type Section = TableSection | NotesSection;

export interface CategoryData {
  title: string;
  updated?: string;
  sections: Section[];
}

export interface CategoryDataMap {
  [key: string]: CategoryData;
}

export interface CategoryInfo {
  key: string;
  label: string;
  icon: string;
  color: string;
  group: string;
}

export interface PricingDataset {
  categoriesData: CategoryDataMap;
  categoriesList: CategoryInfo[];
  groupsList: string[];
}

export interface SearchMatch {
  categoryKey: string;
  sectionName: string;
  matches: string[];
}
