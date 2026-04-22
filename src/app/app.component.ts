import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';

function maxValueValidator(max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').replace(',', '.').trim();
    const val = parseFloat(raw);
    if (!isNaN(val) && val > max) {
      return { maxValue: { max, actual: val } };
    }
    return null;
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  saveTime = '';
  filledCount = 0;
  private autoSaveTimer?: ReturnType<typeof setInterval>;
  private sub = new Subscription();

  readonly meltOptions = ['3112', '1180', '331'];
  readonly grainBatchOptions = ['W32.1, W32.2', 'W33.1', 'W33.2', 'W34.1'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // Block 1
      date: ['19.04.2026'],
      time: ['14:30'],
      batchNo: ['W33'],
      streicher: ['1'],
      productBatch: ['385'],
      operator: ['Елена Попова'],

      // Block 2
      grainBatch: ['W32.1, W32.2'],
      grainBatchManual: [''],
      cagliataType: ['skimmed'],
      grainQty: ['205,00'],
      fatPct: ['1,20'],
      ph: ['5,50'],
      moisture: ['58,00'],

      // Block 3
      returnBatch: [''],
      returnMass: ['0,00'],
      deadIn: ['2,50', [maxValueValidator(5)]],

      // Block 4
      nacl: ['3,00'],
      starch: ['15,00'],
      fatOil: ['0,00'],
      preservativeName: ['K1'],
      preservativeQty: ['0,25'],
      melter1Name: ['3112'],
      melter1Qty: ['1,80'],
      melter2Name: ['1180'],
      melter2Qty: ['0,80'],
      melter3Name: [''],
      melter3Qty: ['0,00'],

      // Block 5
      waterDirect: ['22,00'],
      waterSteam: ['20,00'],
      waterTotal: [{ value: '42,00', disabled: true }],

      // Block 6
      tempAfterLoad: ['30,00'],
      tempMax: ['73,80', [maxValueValidator(74)]],
      tempBeforeDischarge: ['73,50'],

      // Block 7
      massAfterLoad: ['250,00'],
      massBeforeDischarge: ['270,00'],
      massDischarged: ['267,50'],

      // Block 8
      deadOut: ['2,50', [maxValueValidator(5)]],
      extractedFromMold: ['12,00'],
      cookingDuration: ['30'],
      formsCount: ['18'],
      containerLoadTime: ['15:05'],
      containerNo: ['C-33-1'],
      extractTime: ['21:30'],
      actualBlocks: ['18'],

      // Block 9
      notes: [''],
      signature: ['Елена Попова'],
    });

    this.sub.add(
      this.form.get('waterDirect')!.valueChanges.subscribe(() => this.recalcWater())
    );
    this.sub.add(
      this.form.get('waterSteam')!.valueChanges.subscribe(() => this.recalcWater())
    );
    this.sub.add(
      this.form.valueChanges.subscribe(() => this.updateFilled())
    );

    this.updateSaveTime();
    this.updateFilled();
    this.autoSaveTimer = setInterval(() => this.updateSaveTime(), 30000);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
  }

  private parseNum(v: string | null | undefined): number {
    if (!v) return 0;
    return parseFloat(String(v).replace(',', '.').trim()) || 0;
  }

  private fmt(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }

  private recalcWater(): void {
    const a = this.parseNum(this.form.get('waterDirect')!.value);
    const b = this.parseNum(this.form.get('waterSteam')!.value);
    this.form.get('waterTotal')!.setValue(this.fmt(a + b), { emitEvent: false });
  }

  private updateFilled(): void {
    const controls = [
      'date', 'time', 'batchNo', 'streicher', 'productBatch', 'operator',
      'grainBatch', 'cagliataType', 'grainQty', 'fatPct', 'ph', 'moisture',
      'returnBatch', 'returnMass', 'deadIn',
      'nacl', 'starch', 'fatOil', 'preservativeName', 'preservativeQty',
      'melter1Name', 'melter1Qty', 'melter2Name', 'melter2Qty',
      'waterDirect', 'waterSteam',
      'tempAfterLoad', 'tempMax', 'tempBeforeDischarge',
      'massAfterLoad', 'massBeforeDischarge', 'massDischarged',
      'deadOut', 'extractedFromMold', 'cookingDuration', 'formsCount',
      'containerLoadTime', 'containerNo', 'extractTime', 'actualBlocks',
    ];
    this.filledCount = controls.filter(k => {
      const v = this.form.get(k)?.value;
      return v !== null && v !== undefined && String(v).trim() !== '';
    }).length;
  }

  updateSaveTime(): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this.saveTime = `${hh}:${mm}`;
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.errors && c.errors['maxValue']);
  }

  saveDraft(): void {
    this.updateSaveTime();
    alert(`Черновик сохранён локально в ${this.saveTime}`);
  }

  submitForm(): void {
    const invalidFields = ['deadIn', 'deadOut', 'tempMax'].filter(f => this.isInvalid(f));
    if (invalidFields.length > 0) {
      alert('⚠ Есть поля с превышением нормы (красная рамка). Проверьте значения перед отправкой.');
      return;
    }
    this.updateSaveTime();
    alert(`✓ Варка отправлена в базу данных.\nВремя: ${this.saveTime}`);
  }
}
