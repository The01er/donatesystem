import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'legal-templates');

export interface SellerData {
  legalStatus: string;
  legalName: string;
  inn: string;
  legalAddress: string;
  shopUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
  individual: 'Физическое лицо',
  self_employed: 'Самозанятый',
  entrepreneur: 'Индивидуальный предприниматель',
};

function readTemplate(slug: string): string {
  return readFileSync(join(TEMPLATES_DIR, `${slug}.html`), 'utf-8');
}

function fillTemplate(template: string, data: SellerData, serverName: string): string {
  return template
    .replace(/\{\{legalStatus\}\}/g, data.legalStatus)
    .replace(/\{\{legalName\}\}/g, data.legalName)
    .replace(/\{\{inn\}\}/g, data.inn)
    .replace(/\{\{legalAddress\}\}/g, data.legalAddress)
    .replace(/\{\{shopUrl\}\}/g, data.shopUrl)
    .replace(/\{\{serverName\}\}/g, serverName);
}

export function getStatusLabel(status?: string | null): string {
  if (!status) return 'Самозанятый';
  return STATUS_LABELS[status] || 'Самозанятый';
}

export interface LegalDocMeta {
  slug: string;
  title: string;
}

export const STORE_DOCS: LegalDocMeta[] = [
  { slug: 'store-offer', title: 'Публичная оферта на продажу товаров' },
  { slug: 'store-privacy', title: 'Политика конфиденциальности' },
  { slug: 'store-terms', title: 'Правила покупки товаров' },
];

export function generateDocument(
  slug: string,
  sellerData: SellerData,
  serverName: string,
): { title: string; content: string } {
  const doc = STORE_DOCS.find((d) => d.slug === slug);
  if (!doc) throw new Error(`Unknown legal document: ${slug}`);

  const template = readTemplate(slug);
  const content = fillTemplate(template, sellerData, serverName);
  return { title: doc.title, content };
}
