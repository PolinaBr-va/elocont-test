import { Component, signal, computed } from '@angular/core';
import { Dropdown, DropdownGroup } from './dropdown/dropdown';
import { JsonPipe } from '@angular/common';
import { districts, areas } from './data';

@Component({
  selector: 'app-root',
  imports: [Dropdown, JsonPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly districts = districts;
  readonly areas = areas;

  // Selected districts - all selected by default
  selectedDistricts = signal<string[]>(
    districts.map((d) => d.value)
  );

  // Selected areas
  selectedAreas = signal<string[]>([]);

  // Computed groups for areas dropdown
  areaGroups = computed<DropdownGroup[]>(() => {
    const selectedDistrictValues = this.selectedDistricts();
    
    return districts.map((district) => {
      const groupAreas = areas
        .filter((area) => area.district === district.value)
        .map((area) => ({
          label: area.label,
          value: area.value,
          disabled: false,
        }));

      // Group is disabled if district is not selected
      const isDisabled = !selectedDistrictValues.includes(district.value);

      return {
        label: district.label,
        items: groupAreas,
        disabled: isDisabled,
      };
    });
  });

  onDistrictsChange(selected: string[]): void {
    this.selectedDistricts.set(selected);
    
    // Remove selected areas that belong to unselected districts
    const currentSelected = this.selectedAreas();
    const validAreas = currentSelected.filter((areaValue) => {
      const area = areas.find((a) => a.value === areaValue);
      if (!area) return false;
      return selected.includes(area.district);
    });
    
    if (validAreas.length !== currentSelected.length) {
      this.selectedAreas.set(validAreas);
    }
  }

  onAreasChange(selected: string[]): void {
    this.selectedAreas.set(selected);
  }
}
