import type { ShopTemplate } from '~/types';

export interface TemplateDef {
  slug: ShopTemplate;
  name: string;
  description: string;
  preview?: string;
}

const ALL_TEMPLATES: TemplateDef[] = [
  { slug: 'gaming', name: 'Игровой', description: 'Тёмная тема, крупные карточки, эффекты' },
  { slug: 'cyber', name: 'Кибер', description: 'Светлая тема, неоновые цвета, scan-эффекты' },
];

export function getTemplatesForGame(_gameType: string): TemplateDef[] {
  return ALL_TEMPLATES;
}

export function getTemplateDef(slug: string): TemplateDef | undefined {
  return ALL_TEMPLATES.find((t) => t.slug === slug);
}
