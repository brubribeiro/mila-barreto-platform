import {
  catalogLabelMap,
  catalogOrderMap,
  FALLBACK_MESSAGE_CATEGORIES,
  FALLBACK_MESSAGE_TRIGGERS,
  getCatalogItems,
  triggerForCategoryFromCatalog,
} from '../../features/platformCatalog';
import type { MessageTrigger } from '../../types';

/** @deprecated Prefer usePlatformCatalog — alias do fallback. */
export const categoryOptions = [
  { value: '', label: '—' },
  ...FALLBACK_MESSAGE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
] as const;

export function messageCategoryOptions() {
  return [
    { value: '', label: '—' },
    ...getCatalogItems('message_category').map((c) => ({ value: c.value, label: c.label })),
  ];
}

export function messageTriggerOptions(): { value: MessageTrigger; label: string }[] {
  return getCatalogItems('message_trigger').map((t) => ({
    value: t.value as MessageTrigger,
    label: t.label,
  }));
}

/** @deprecated Prefer messageTriggerOptions() */
export const triggerOptions: { value: MessageTrigger; label: string }[] = FALLBACK_MESSAGE_TRIGGERS.map((t) => ({
  value: t.value as MessageTrigger,
  label: t.label,
}));

export function categoryLabelMap(): Record<string, string> {
  return catalogLabelMap(getCatalogItems('message_category'));
}

export function triggerLabelMap(): Record<MessageTrigger, string> {
  return catalogLabelMap(getCatalogItems('message_trigger')) as Record<MessageTrigger, string>;
}

export function triggerOrderMap(): Record<MessageTrigger, number> {
  return catalogOrderMap(getCatalogItems('message_trigger')) as Record<MessageTrigger, number>;
}

/** @deprecated Prefer categoryLabelMap() */
export const categoryLabel: Record<string, string> = catalogLabelMap(FALLBACK_MESSAGE_CATEGORIES);

/** @deprecated Prefer triggerLabelMap() */
export const triggerLabel = catalogLabelMap(FALLBACK_MESSAGE_TRIGGERS) as Record<MessageTrigger, string>;

/** @deprecated Prefer triggerOrderMap() */
export const triggerOrder = catalogOrderMap(FALLBACK_MESSAGE_TRIGGERS) as Record<MessageTrigger, number>;

export function triggerForCategory(category?: string | null): MessageTrigger | undefined {
  return triggerForCategoryFromCatalog(getCatalogItems('message_category'), category);
}

/** @deprecated Prefer triggerForCategory() */
export const triggerForCategoryMap: Record<string, MessageTrigger> = Object.fromEntries(
  FALLBACK_MESSAGE_CATEGORIES.filter((c) => c.meta && typeof c.meta === 'object' && 'defaultTrigger' in c.meta).map(
    (c) => [c.value, (c.meta as { defaultTrigger: MessageTrigger }).defaultTrigger],
  ),
);

export const TEMPLATE_VARIABLES = [
  '{nome}',
  '{procedimento}',
  '{data}',
  '{hora}',
  '{profissional}',
  '{valor}',
] as const;
