import {
  Component,
  EventEmitter,
  Input,
  Output,
  HostListener,
  ElementRef,
  ViewChild,
  inject,
  OnDestroy,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, Subscription } from 'rxjs';
import { DropdownItem, DropdownGroup, DropdownMode, GroupedDropdownItem, KeyboardKey } from './types';

@Component({
  selector: 'dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
})
export class Dropdown implements OnChanges, OnInit, OnDestroy {
  // Public properties
  readonly DropdownMode = DropdownMode;
  @Input() items: DropdownItem[] = [];
  @Input() groups: DropdownGroup[] = [];
  @Input() placeholder = 'Выберите элемент';
  @Input() mode: DropdownMode = DropdownMode.Single;
  @Input() searchable: boolean = false;
  @Input() selectedValues: any[] = [];
  @Input() label?: string;

  @Output() change = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownPanel') dropdownPanel?: ElementRef<HTMLDivElement>;

  // Private properties (BehaviorSubjects must be before observables that use them)
  private elementRef = inject(ElementRef);

  private isOpenSubject: BehaviorSubject<boolean>;
  private searchQuerySubject: BehaviorSubject<string>;
  private focusedIndexSubject: BehaviorSubject<number>;
  private itemsSubject: BehaviorSubject<DropdownItem[]>;
  private groupsSubject: BehaviorSubject<DropdownGroup[]>;
  private selectedValuesSubject: BehaviorSubject<any[]>;
  private modeSubject: BehaviorSubject<DropdownMode>;

  private subscription: Subscription;

  private _isOpen = false;
  private _searchQuery = '';
  private _focusedIndex = -1;
  private _filteredItems: DropdownItem[] = [];
  private _filteredGroups: DropdownGroup[] = [];
  private _allItems: GroupedDropdownItem[] = [];

  // Public observables (initialized in constructor)
  isOpen$!: Observable<boolean>;
  searchQuery$!: Observable<string>;
  focusedIndex$!: Observable<number>;
  filteredItems$!: Observable<DropdownItem[]>;
  filteredGroups$!: Observable<DropdownGroup[]>;
  displayText$!: Observable<string>;
  allItems$!: Observable<GroupedDropdownItem[]>;



  // Getters
  get isOpen(): boolean {
    return this._isOpen;
  }

  get searchQuery(): string {
    return this._searchQuery;
  }

  get focusedIndex(): number {
    return this._focusedIndex;
  }

  get filteredItems(): DropdownItem[] {
    return this._filteredItems;
  }

  get filteredGroups(): DropdownGroup[] {
    return this._filteredGroups;
  }


  get allItems(): GroupedDropdownItem[] {
    return this._allItems;
  }

  // Constructor
  constructor() {

    // Initialize RxJS subjects
    this.isOpenSubject = new BehaviorSubject<boolean>(false);
    this.searchQuerySubject = new BehaviorSubject<string>('');
    this.focusedIndexSubject = new BehaviorSubject<number>(-1);
    this.itemsSubject = new BehaviorSubject<DropdownItem[]>([]);
    this.groupsSubject = new BehaviorSubject<DropdownGroup[]>([]);
    this.selectedValuesSubject = new BehaviorSubject<any[]>([]);
    this.modeSubject = new BehaviorSubject<DropdownMode>(DropdownMode.Single);
    this.subscription = new Subscription();

    // Initialize observables after subjects are created
    this.isOpen$ = this.isOpenSubject.asObservable();
    this.searchQuery$ = this.searchQuerySubject.asObservable();
    this.focusedIndex$ = this.focusedIndexSubject.asObservable();

    this.filteredItems$ = combineLatest([this.itemsSubject.asObservable(), this.searchQuery$]).pipe(
      map(([items, query]) => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) {
          return items;
        }
        return items.filter((item) => item.label.toLowerCase().includes(lowerQuery));
      })
    );

    this.filteredGroups$ = combineLatest([this.groupsSubject.asObservable(), this.searchQuery$]).pipe(
      map(([groups, query]) => {
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
          return groups.filter((group) => group.items.length > 0);
        }
        return groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.label.toLowerCase().includes(lowerQuery)),
          }))
          .filter((group) => group.items.length > 0);
      })
    );

    this.displayText$ = combineLatest([
      this.selectedValuesSubject.asObservable(),
      this.itemsSubject.asObservable(),
      this.groupsSubject.asObservable(),
      this.modeSubject.asObservable(),
    ]).pipe(
      map(([selectedValues, items, groups, mode]) => {
        if (mode === DropdownMode.Single) {
          const selected = this.findItemByValueInData(selectedValues[0], items, groups);
          return selected?.label || this.placeholder;
        } else {
          if (selectedValues.length === 0) {
            return this.placeholder;
          }
          if (selectedValues.length === 1) {
            const selected = this.findItemByValueInData(selectedValues[0], items, groups);
            return selected?.label || this.placeholder;
          }
          return `Выбрано: ${selectedValues.length}`;
        }
      })
    );

    this.allItems$ = combineLatest([this.filteredItems$, this.filteredGroups$]).pipe(
      map(([filteredItems, filteredGroups]) => {
        if (this.groupsSubject.value.length > 0) {
          const items: Array<{
            item: DropdownItem;
            groupIndex: number;
            itemIndex: number;
          }> = [];
          filteredGroups.forEach((group, groupIndex) => {
            group.items.forEach((item, itemIndex) => {
              items.push({ item, groupIndex, itemIndex });
            });
          });
          return items;
        }
        return filteredItems.map((item, index) => ({
          item,
          groupIndex: -1,
          itemIndex: index,
        }));
      })
    );

    this.subscription.add(
      this.isOpen$.subscribe((isOpen) => {
        this._isOpen = isOpen;
        if (isOpen) {
          setTimeout(() => {
            if (this.searchable && this.searchInput) {
              this.searchInput.nativeElement?.focus();
            }
          }, 0);
        } else {
          this.searchQuerySubject.next('');
          this.focusedIndexSubject.next(-1);
        }
      })
    );

    this.subscription.add(
      this.searchQuery$.subscribe((query) => {
        this._searchQuery = query;
      })
    );

    this.subscription.add(
      this.focusedIndex$.subscribe((index) => {
        this._focusedIndex = index;
      })
    );

    this.subscription.add(
      this.filteredItems$.subscribe((items) => {
        this._filteredItems = items;
      })
    );

    this.subscription.add(
      this.filteredGroups$.subscribe((groups) => {
        this._filteredGroups = groups;
      })
    );


    this.subscription.add(
      this.allItems$.subscribe((items) => {
        this._allItems = items;
      })
    );
  }

  // Lifecycle hooks
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.itemsSubject.next(this.items);
    }
    if (changes['groups']) {
      this.groupsSubject.next(this.groups);
    }
    if (changes['selectedValues']) {
      this.selectedValuesSubject.next(this.selectedValues);
    }
    if (changes['mode']) {
      this.modeSubject.next(this.mode);
    }
  }

  ngOnInit(): void {
    this.itemsSubject.next(this.items);
    this.groupsSubject.next(this.groups);
    this.selectedValuesSubject.next(this.selectedValues);
    this.modeSubject.next(this.mode);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Public methods
  toggle(): void {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  close(): void {
    this.isOpenSubject.next(false);
  }

  isSelected(value: any): boolean {
    return this.selectedValuesSubject.value.includes(value);
  }

  selectItem(item: DropdownItem): void {
    if (item.disabled || this.isItemInDisabledGroup(item)) {
      return;
    }

    const currentSelected = [...this.selectedValuesSubject.value];

    if (this.mode === DropdownMode.Single) {
      const newSelected = [item.value];
      this.selectedValuesSubject.next(newSelected);
      this.change.emit(item.value);
      this.selectionChange.emit(newSelected);
      this.close();
    } else {
      const index = currentSelected.indexOf(item.value);
      let newSelected: any[];
      if (index > -1) {
        newSelected = currentSelected.filter((v) => v !== item.value);
      } else {
        newSelected = [...currentSelected, item.value];
      }
      this.selectedValuesSubject.next(newSelected);
      this.selectionChange.emit([...newSelected]);
    }
  }

  selectItemByIndex(index: number): void {
    const allItems = this.allItems;
    if (index >= 0 && index < allItems.length) {
      const { item } = allItems[index];
      this.selectItem(item);
    }
  }

  onSearchChange(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuerySubject.next(query);
    this.focusedIndexSubject.next(-1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpenSubject.value && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const isOpen = this.isOpenSubject.value;
    if (!isOpen) {
      if (
        event.key === KeyboardKey.Enter ||
        event.key === KeyboardKey.Space ||
        event.key === KeyboardKey.ArrowDown
      ) {
        event.preventDefault();
        this.toggle();
      }
      return;
    }

    const allItems = this.allItems;

    switch (event.key) {
      case KeyboardKey.Escape:
        event.preventDefault();
        this.close();
        break;
      case KeyboardKey.ArrowDown:
        event.preventDefault();
        const currentIndex = this.focusedIndexSubject.value;
        const newIndex = currentIndex < allItems.length - 1 ? currentIndex + 1 : 0;
        this.focusedIndexSubject.next(newIndex);
        void this.scrollToFocused();
        break;
      case KeyboardKey.ArrowUp:
        event.preventDefault();
        const currentIdx = this.focusedIndexSubject.value;
        const newIdx = currentIdx > 0 ? currentIdx - 1 : allItems.length - 1;
        this.focusedIndexSubject.next(newIdx);
        void this.scrollToFocused();
        break;
      case KeyboardKey.Enter:
      case KeyboardKey.Space:
        event.preventDefault();
        const focusedIdx = this.focusedIndexSubject.value;
        if (focusedIdx >= 0 && focusedIdx < allItems.length) {
          this.selectItemByIndex(focusedIdx);
        }
        break;
      case KeyboardKey.Home:
        event.preventDefault();
        this.focusedIndexSubject.next(0);
        void this.scrollToFocused();
        break;
      case KeyboardKey.End:
        event.preventDefault();
        this.focusedIndexSubject.next(allItems.length - 1);
        void this.scrollToFocused();
        break;
    }
  }

  getItemIndex(groupIndex: number, itemIndex: number): number {
    const groups = this.groupsSubject.value;
    if (groups.length === 0) {
      return itemIndex;
    }
    let index = 0;
    const filteredGroups = this.filteredGroups;
    for (let i = 0; i < groupIndex; i++) {
      index += filteredGroups[i]?.items.length || 0;
    }
    return index + itemIndex;
  }

  // Private methods
  private findItemByValueInData(
    value: any,
    items: DropdownItem[],
    groups: DropdownGroup[]
  ): DropdownItem | undefined {
    return [...items, ...groups.flatMap(group => group.items)].find(item => item.value === value);
  }

  private isItemInDisabledGroup(item: DropdownItem): boolean {
    const groups = this.groupsSubject.value;
    if (groups.length === 0) {
      return false;
    }
    for (const group of groups) {
      if (group.disabled && group.items.some((i) => i.value === item.value)) {
        return true;
      }
    }
    return false;
  }

  private scrollToFocused(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const focusedIndex = this.focusedIndexSubject.value;
        const focusedElement = this.dropdownPanel?.nativeElement?.querySelector(
          `[data-index="${focusedIndex}"]`
        ) as HTMLElement;
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        resolve();
      }, 0);
    });
  }
}
