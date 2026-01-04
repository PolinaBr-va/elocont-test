import { Component, OnDestroy } from '@angular/core';
import { Dropdown } from './dropdown/dropdown';
import { DropdownGroup } from './types';
import { JsonPipe, AsyncPipe } from '@angular/common';
import { districts, areas } from './data';
import { BehaviorSubject, combineLatest, map, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [Dropdown, JsonPipe, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  readonly districts = districts;
  readonly areas = areas;

  private selectedDistrictsSubject = new BehaviorSubject<string[]>(
    districts.map((d) => d.value)
  );
  selectedDistricts$ = this.selectedDistrictsSubject.asObservable();

  private selectedAreasSubject = new BehaviorSubject<string[]>([]);
  selectedAreas$ = this.selectedAreasSubject.asObservable();

  areaGroups$ = combineLatest([this.selectedDistricts$]).pipe(
    map(([selectedDistrictValues]) => {
      return districts.map((district) => {
        const groupAreas = areas
          .filter((area) => area.district === district.value)
          .map((area) => ({
            label: area.label,
            value: area.value,
            disabled: false,
          }));

        const isDisabled = !selectedDistrictValues.includes(district.value);

        return {
          label: district.label,
          items: groupAreas,
          disabled: isDisabled,
        };
      });
    })
  );

  private subscription = new Subscription();

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onDistrictsChange(selected: string[]): void {
    this.selectedDistrictsSubject.next(selected);
    
    const currentSelected = this.selectedAreasSubject.value;
    const validAreas = currentSelected.filter((areaValue) => {
      const area = areas.find((a) => a.value === areaValue);
      if (!area) return false;
      return selected.includes(area.district);
    });
    
    if (validAreas.length !== currentSelected.length) {
      this.selectedAreasSubject.next(validAreas);
    }
  }

  onAreasChange(selected: string[]): void {
    this.selectedAreasSubject.next(selected);
  }

  get selectedDistricts(): string[] {
    return this.selectedDistrictsSubject.value;
  }

  get selectedAreas(): string[] {
    return this.selectedAreasSubject.value;
  }

  get areaGroups(): DropdownGroup[] {
    const selectedDistrictValues = this.selectedDistrictsSubject.value;
    return districts.map((district) => {
      const groupAreas = areas
        .filter((area) => area.district === district.value)
        .map((area) => ({
          label: area.label,
          value: area.value,
          disabled: false,
        }));

      const isDisabled = !selectedDistrictValues.includes(district.value);

      return {
        label: district.label,
        items: groupAreas,
        disabled: isDisabled,
      };
    });
  }
}
