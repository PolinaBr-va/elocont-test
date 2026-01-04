export enum KeyboardKey {
  Escape = 'Escape',
  ArrowDown = 'ArrowDown',
  ArrowUp = 'ArrowUp',
  Enter = 'Enter',
  Space = ' ',
  Home = 'Home',
  End = 'End',
}

export interface DropdownItem {
  label: string;
  value: any;
  disabled?: boolean;
  [key: string]: any;
}

export interface DropdownGroup {
  label: string;
  items: DropdownItem[];
  disabled?: boolean;
}

export interface GroupedDropdownItem {
  item: DropdownItem;
  groupIndex: number;
  itemIndex: number;
}

export enum DropdownMode {
  Single = 'single',
  Multi = 'multi',
}

