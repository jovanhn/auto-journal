import { Category } from '@/shared/api/generated/model';

/** The fixed categories (BR-E3) in display order, with their labels. */
export const CATEGORIES: readonly Category[] = [
  Category.FUEL,
  Category.SERVICE,
  Category.REPAIRS,
  Category.INSURANCE,
  Category.REGISTRATION_TAX,
  Category.TIRES,
  Category.PARKING_TOLLS,
  Category.OTHER,
];

export const CATEGORY_LABELS: Record<Category, string> = {
  FUEL: 'Fuel',
  SERVICE: 'Service',
  REPAIRS: 'Repairs',
  INSURANCE: 'Insurance',
  REGISTRATION_TAX: 'Registration & tax',
  TIRES: 'Tires',
  PARKING_TOLLS: 'Parking & tolls',
  OTHER: 'Other',
};

/**
 * Dot color per category (design.md, "Category colors"). Categories the design has not colored yet use the
 * neutral category color (open question in design.md).
 */
export const CATEGORY_DOT_CLASSES: Record<Category, string> = {
  FUEL: 'bg-primary',
  SERVICE: 'bg-foreground',
  REPAIRS: 'bg-category-neutral',
  INSURANCE: 'bg-category-neutral',
  REGISTRATION_TAX: 'bg-category-neutral',
  TIRES: 'bg-category-tires',
  PARKING_TOLLS: 'bg-category-neutral',
  OTHER: 'bg-category-neutral',
};
