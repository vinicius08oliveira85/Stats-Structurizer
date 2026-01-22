export interface DataRow {
  metric: string;
  values: string[];
}

export interface ColumnGroup {
  title: string;
  colSpan: number;
  offset?: number; // How many empty columns before this group starts
}

export interface ParsedTable {
  id: string;
  title: string;
  headers: string[];
  rows: DataRow[];
  firstColumnHeader?: string;
  columnGroups?: ColumnGroup[]; // For multi-row headers
}