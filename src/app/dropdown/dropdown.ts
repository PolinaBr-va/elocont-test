import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
  effect,
  HostListener,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

export type DropdownMode = 'single' | 'multi';

@Component({
  selector: 'dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
})
export class Dropdown {
  @Input() items: DropdownItem[] = [];
  @Input() groups: DropdownGroup[] = [];
  @Input() placeholder = 'Выберите элемент';
  @Input() mode: DropdownMode = 'single';
  @Input() searchable: boolean = false;
  @Input() selectedValues: any[] = [];
  @Input() label?: string;

  @Output() change = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownPanel') dropdownPanel?: ElementRef<HTMLDivElement>;

  private elementRef = inject(ElementRef);

  isOpen = signal(false);
  searchQuery = signal('');
  focusedIndex = signal(-1);

  // Computed filtered items/groups based on search
  filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.items;
    }
    return this.items.filter((item) =>
      item.label.toLowerCase().includes(query)
    );
  });

  filteredGroups = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.groups.filter((group) => group.items.length > 0);
    }
    return this.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  });

  // Computed display text for selected items
  displayText = computed(() => {
    if (this.mode === 'single') {
      const selected = this.items.find(
        (item) => item.value === this.selectedValues[0]
      );
      return selected?.label || this.placeholder;
    } else {
      if (this.selectedValues.length === 0) {
        return this.placeholder;
      }
      if (this.selectedValues.length === 1) {
        const selected = this.items.find(
          (item) => item.value === this.selectedValues[0]
        );
        return selected?.label || this.placeholder;
      }
      return `Выбрано: ${this.selectedValues.length}`;
    }
  });

  // Get all items from groups for keyboard navigation
  allGroupedItems = computed(() => {
    const items: Array<{ item: DropdownItem; groupIndex: number; itemIndex: number }> = [];
    this.filteredGroups().forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        items.push({ item, groupIndex, itemIndex });
      });
    });
    return items;
  });

  // Get all items (from items or groups) for keyboard navigation
  allItems = computed(() => {
    if (this.groups.length > 0) {
      return this.allGroupedItems();
    }
    return this.filteredItems().map((item, index) => ({
      item,
      groupIndex: -1,
      itemIndex: index,
    }));
  });

  constructor() {
    // Close dropdown when clicking outside
    effect(() => {
      if (this.isOpen()) {
        // Focus search input if searchable
        setTimeout(() => {
          if (this.searchable && this.searchInput) {
            this.searchInput.nativeElement?.focus();
          }
        }, 0);
      } else {
        this.searchQuery.set('');
        this.focusedIndex.set(-1);
      }
    });
  }

  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  close(): void {
    this.isOpen.set(false);
  }

  isSelected(value: any): boolean {
    return this.selectedValues.includes(value);
  }

  selectItem(item: DropdownItem): void {
    if (item.disabled) {
      return;
    }

    if (this.mode === 'single') {
      this.selectedValues = [item.value];
      this.change.emit(item.value);
      this.selectionChange.emit([item.value]);
      this.close();
    } else {
      const index = this.selectedValues.indexOf(item.value);
      if (index > -1) {
        this.selectedValues = this.selectedValues.filter((v) => v !== item.value);
      } else {
        this.selectedValues = [...this.selectedValues, item.value];
      }
      this.selectionChange.emit([...this.selectedValues]);
    }
  }

  selectItemByIndex(index: number): void {
    const allItems = this.allItems();
    if (index >= 0 && index < allItems.length) {
      const { item } = allItems[index];
      this.selectItem(item);
    }
  }

  onSearchChange(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.focusedIndex.set(-1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.isOpen() &&
      !this.elementRef.nativeElement.contains(event.target)
    ) {
      this.close();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.toggle();
      }
      return;
    }

    const allItems = this.allItems();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex.update((idx) =>
          idx < allItems.length - 1 ? idx + 1 : 0
        );
        this.scrollToFocused();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex.update((idx) =>
          idx > 0 ? idx - 1 : allItems.length - 1
        );
        this.scrollToFocused();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.focusedIndex() >= 0 && this.focusedIndex() < allItems.length) {
          this.selectItemByIndex(this.focusedIndex());
        }
        break;
      case 'Home':
        event.preventDefault();
        this.focusedIndex.set(0);
        this.scrollToFocused();
        break;
      case 'End':
        event.preventDefault();
        this.focusedIndex.set(allItems.length - 1);
        this.scrollToFocused();
        break;
    }
  }

  private scrollToFocused(): void {
    setTimeout(() => {
      const focusedElement = this.dropdownPanel?.nativeElement?.querySelector(
        `[data-index="${this.focusedIndex()}"]`
      ) as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  getItemIndex(groupIndex: number, itemIndex: number): number {
    if (this.groups.length === 0) {
      return itemIndex;
    }
    let index = 0;
    for (let i = 0; i < groupIndex; i++) {
      index += this.filteredGroups()[i].items.length;
    }
    return index + itemIndex;
  }
}
