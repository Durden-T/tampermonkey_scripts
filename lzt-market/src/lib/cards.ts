import { formatRatio } from './format';

export const CARD_SELECTOR = '.marketIndexItem';
export const LIST_CONTAINER_SELECTOR = '.marketIndex--itemsContainer form.InlineModForm';

const CHAMP_RE = /(\d+)\s+(characters?|champions?|чемпион|персонаж)/i;

const CURRENCY_MAP: Record<string, string> = {
  rub: '₽',
  uah: '₴',
  kzt: '₸',
  pln: 'zł',
  usd: '$',
  eur: '€',
  gbp: '£',
  cny: '¥',
  try: '₺',
  jpy: '¥',
  byn: 'Br',
  brl: 'R$',
};

const CURRENCY_FALLBACK = '$';

export interface CardData {
  el: HTMLElement;
  id: string;
  price: number | null;
  champCount: number;
  ratio: number;
}

function findChampCount(card: HTMLElement): number {
  // A card can carry one .marketIndexItem--Badges block per game (LoL,
  // Valorant, ...). Skip groups without .badgeIc-lol; inside the LoL group
  // pick the first badge whose label matches the multilingual champ regex.
  for (const group of card.querySelectorAll<HTMLElement>('.marketIndexItem--Badges')) {
    if (!group.querySelector('.badgeIc-lol')) continue;
    for (const badge of group.querySelectorAll<HTMLElement>('.marketIndexItem-Badge')) {
      const m = badge.textContent?.trim().match(CHAMP_RE);
      if (m) return Number(m[1]);
    }
    return 0;
  }
  return 0;
}

function parsePrice(card: HTMLElement): number | null {
  const priceEl = card.querySelector<HTMLElement>('.marketIndexItem--Price .Value');
  if (!priceEl) return null;
  const raw = priceEl.getAttribute('data-value');
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractCardData(card: HTMLElement): CardData {
  const price = parsePrice(card);
  const champCount = findChampCount(card);
  const ratio =
    price !== null && champCount > 0 ? price / champCount : Number.POSITIVE_INFINITY;
  return { el: card, id: card.id, price, champCount, ratio };
}

export function detectCurrencySymbol(scope: ParentNode = document): string {
  const icon = scope.querySelector<HTMLElement>(
    '.marketIndexItem--Price [class*="svgIcon--"]',
  );
  if (!icon) return CURRENCY_FALLBACK;
  const cls = Array.from(icon.classList).find((c) => c.startsWith('svgIcon--'));
  const code = cls?.replace('svgIcon--', '').toLowerCase() ?? '';
  if (!code) return CURRENCY_FALLBACK;
  return CURRENCY_MAP[code] ?? code.toUpperCase();
}

const RATIO_BADGE_CLASS = 'lzt-cps-ratio-badge';

export function decorateCard(card: HTMLElement, data: CardData, symbol: string): void {
  card.querySelector(`.${RATIO_BADGE_CLASS}`)?.remove();

  const badge = document.createElement('div');
  badge.className = RATIO_BADGE_CLASS;

  const hasData = data.champCount > 0 && Number.isFinite(data.ratio);

  const key = document.createElement('span');
  key.className = `${RATIO_BADGE_CLASS}-key`;
  key.textContent = 'CPC';

  const value = document.createElement('span');
  value.className = `${RATIO_BADGE_CLASS}-value`;
  value.textContent = hasData ? formatRatio(data.ratio, symbol) : 'N/A';

  const meta = document.createElement('span');
  meta.className = `${RATIO_BADGE_CLASS}-meta`;
  meta.textContent = hasData
    ? `· ${data.champCount} champ${data.champCount === 1 ? '' : 's'}`
    : '· no champion data';

  badge.append(key, value, meta);
  if (!hasData) badge.dataset.empty = 'true';

  card.appendChild(badge);
}

export function stripDecoration(card: HTMLElement): void {
  card.querySelector(`.${RATIO_BADGE_CLASS}`)?.remove();
}
