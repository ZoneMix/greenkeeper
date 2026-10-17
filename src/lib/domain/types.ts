import type {
  PRODUCT_CATEGORIES,
  SHOPPING_SOURCES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  TOOL_TYPES,
  ZONES,
} from './constants';

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Zone = (typeof ZONES)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ToolType = (typeof TOOL_TYPES)[number];
export type ShoppingSource = (typeof SHOPPING_SOURCES)[number];

/** Display state of a task: pending tasks in the past are overdue. */
export type TaskDisplayStatus = TaskStatus | 'overdue';

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly brand: string;
  readonly category: ProductCategory;
  /** Square feet one retail unit (bag, bottle) covers at label rate. */
  readonly coverage_sqft: number | null;
  readonly kid_safe: boolean;
  readonly organic: boolean;
  readonly notes: string | null;
  readonly url: string | null;
  readonly tool_type: ToolType | null;
}

export interface ScheduleTask {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly category: TaskCategory;
  readonly scheduled_date: string;
  readonly completed_date: string | null;
  readonly status: TaskStatus;
  readonly notes: string | null;
  readonly product_id: number | null;
  readonly zone: Zone;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ScheduleTaskWithProduct extends ScheduleTask {
  readonly product: Product | null;
}

export interface InventoryItem {
  readonly id: number;
  readonly product_id: number;
  readonly quantity: number;
  readonly unit: string;
  readonly purchased_date: string | null;
  readonly notes: string | null;
  readonly product: Product;
}

export interface ShoppingItem {
  readonly id: number;
  readonly product_id: number | null;
  readonly custom_name: string | null;
  readonly quantity_needed: number;
  readonly unit: string;
  readonly purchased: boolean;
  readonly notes: string | null;
  readonly source: ShoppingSource;
  /** Inventory row created when this item was marked bought. */
  readonly inventory_id: number | null;
  readonly product: Product | null;
}

export interface LawnSettings {
  readonly id: number;
  readonly total_sqft: number;
  readonly front_sqft: number;
  readonly back_sqft: number;
  readonly shade_percentage: number;
  readonly spreader_model: string | null;
  readonly city: string;
  readonly state: string;
  readonly usda_zone: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly mower_brand: string | null;
  readonly mower_model: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SeasonStatus {
  readonly year: number;
  readonly phase: 'before' | 'in-season' | 'after';
  readonly progress: number;
  readonly start: string;
  readonly end: string;
  readonly days_remaining: number;
}

export type ScheduleWarningKind = 'pre-emergent-before-overseeding' | 'out-of-season';

export interface ScheduleWarning {
  readonly kind: ScheduleWarningKind;
  readonly task_ids: ReadonlyArray<number>;
  readonly message: string;
}

export interface DashboardSummary {
  readonly today: string;
  readonly season: SeasonStatus;
  readonly next_task: ScheduleTask | null;
  readonly tasks_this_month: number;
  readonly completed_this_month: number;
  readonly overdue_tasks: ReadonlyArray<ScheduleTask>;
  readonly upcoming_tasks: ReadonlyArray<ScheduleTask>;
  readonly inventory_count: number;
  readonly shopping_count: number;
  /** Products in use that break the organic + kid/pet-safe rule (legacy data). */
  readonly unsafe_products: ReadonlyArray<Pick<Product, 'id' | 'name' | 'brand' | 'organic' | 'kid_safe'>>;
  readonly schedule_warnings: ReadonlyArray<ScheduleWarning>;
  /** Next season's year when it has no tasks yet, so the UI can offer to plan it. */
  readonly unplanned_year: number | null;
}

export interface ShoppingPlanTaskRef {
  readonly id: number;
  readonly title: string;
  readonly scheduled_date: string;
}

export interface ShoppingPlanItem {
  /** `product:<id>` or `custom:<name>`; stable across runs. */
  readonly key: string;
  readonly product_id: number | null;
  readonly custom_name: string | null;
  readonly name: string;
  readonly unit: string;
  /** Units the upcoming tasks call for. */
  readonly required: number;
  readonly on_hand: number;
  /** Already on the list as unpurchased manual items. */
  readonly already_listed: number;
  /** What the generator adds: required minus on hand minus already listed, never negative. */
  readonly quantity_needed: number;
  readonly tasks: ReadonlyArray<ShoppingPlanTaskRef>;
  readonly reason: string;
}

export interface ShoppingPlan {
  readonly from: string;
  readonly to: string;
  readonly items: ReadonlyArray<ShoppingPlanItem>;
  readonly warnings: ReadonlyArray<string>;
}

export interface ShoppingGenerateResult extends ShoppingPlan {
  readonly dry_run: boolean;
  readonly created: number;
  readonly updated: number;
  readonly removed: number;
  readonly message: string;
}

export interface WeatherCurrent {
  readonly time: string;
  readonly temperature_f: number;
  readonly weather_code: number;
  readonly condition: string;
  readonly wind_mph: number;
  readonly precip_in: number;
}

export interface WeatherDay {
  readonly date: string;
  readonly weather_code: number;
  readonly condition: string;
  readonly high_f: number;
  readonly low_f: number;
  readonly precip_in: number;
  readonly precip_chance: number | null;
  readonly wind_max_mph: number;
  /** Mean soil temperature at 6 cm for the day, from hourly model data. */
  readonly soil_temp_f: number | null;
}

export interface WeatherReport {
  readonly source: 'open-meteo';
  readonly latitude: number;
  readonly longitude: number;
  readonly current: WeatherCurrent;
  readonly days: ReadonlyArray<WeatherDay>;
  /** When the data was fetched from the provider (ISO timestamp). */
  readonly fetched_at: string;
  /** True when the provider could not be reached and cached data is shown. */
  readonly stale: boolean;
}

export type AdviceLevel = 'good' | 'caution' | 'hold';

export interface TaskWeatherAdvice {
  readonly task_id: number;
  readonly task_title: string;
  readonly scheduled_date: string;
  readonly level: AdviceLevel;
  readonly headline: string;
  readonly reasons: ReadonlyArray<string>;
}

export interface WeatherResponse {
  readonly report: WeatherReport;
  readonly advice: ReadonlyArray<TaskWeatherAdvice>;
}

export interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: ReadonlyArray<ApiErrorDetail>;
  };
}

export interface ApiSuccessBody<T> {
  readonly data: T;
  readonly meta?: { readonly total: number };
}
