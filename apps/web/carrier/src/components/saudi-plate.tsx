'use client';
import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * The 17 officially-allowed Saudi plate letters with their Latin equivalents.
 *   ا=A ب=B ح=J د=D ر=R س=S ص=X ط=T ع=E ق=G ك=K ل=L م=Z ن=N هـ=H و=U ى=V
 * Letters NOT allowed: ت ث ج ذ ز ش ض ظ غ ف خ ة ء
 */
export const SAUDI_PLATE_LETTERS = [
  { ar: 'ا',  en: 'A' },
  { ar: 'ب',  en: 'B' },
  { ar: 'ح',  en: 'J' },
  { ar: 'د',  en: 'D' },
  { ar: 'ر',  en: 'R' },
  { ar: 'س',  en: 'S' },
  { ar: 'ص',  en: 'X' },
  { ar: 'ط',  en: 'T' },
  { ar: 'ع',  en: 'E' },
  { ar: 'ق',  en: 'G' },
  { ar: 'ك',  en: 'K' },
  { ar: 'ل',  en: 'L' },
  { ar: 'م',  en: 'Z' },
  { ar: 'ن',  en: 'N' },
  { ar: 'هـ', en: 'H' },
  { ar: 'و',  en: 'U' },
  { ar: 'ى',  en: 'V' },
] as const;

/** Alternate Arabic spellings seen in data, resolved to the same Latin letter. */
const LETTER_ALIASES: Record<string, string> = {
  'أ': 'A', 'إ': 'A', 'آ': 'A', 'ا': 'A',
  'ي': 'V', 'ى': 'V',
  'ه': 'H', 'هـ': 'H', 'ة': 'H',
};

export type SaudiLetter = (typeof SAUDI_PLATE_LETTERS)[number];

/** Legacy type kept for backward compatibility with existing call sites. */
export type PlateType = 'light' | 'public';

/** New plate taxonomy. Only `standard` / `transport` are implemented. */
export type PlateFormat = 'standard';
export type PlateKind = 'transport' | 'private';

export type PlateSize = 'thumbnail' | 'card' | 'stage' | 'fullscreen' | 'fill';

function latinFor(arLetter?: string | null): string {
  if (!arLetter) return '';
  const l = arLetter.trim();
  const direct = SAUDI_PLATE_LETTERS.find((x) => x.ar === l);
  if (direct) return direct.en;
  return LETTER_ALIASES[l] ?? '';
}

function inferEnglish(arLetters?: (string | null | undefined)[]): string[] {
  return (arLetters ?? []).map((l) => latinFor(l));
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => AR_DIGITS[parseInt(d, 10)] ?? d);

/** Pixel width per size preset; height derives from the viewBox ratio. */
const SIZE_WIDTH: Record<Exclude<PlateSize, 'fill'>, number> = {
  thumbnail: 160,
  card: 200,
  stage: 310,
  fullscreen: 480,
};

/** Official palm-and-swords national emblem (flattened to black), served from
 *  each app's public/ folder. */
const EMBLEM_SRC = '/saudi-emblem.svg';

export interface SaudiLicensePlateProps {
  /** Up to 3 Arabic letters, e.g. ['ب','د','ر']. */
  letters?: (string | undefined | null)[];
  /** Up to 3 Latin equivalents; inferred from `letters` when omitted. */
  lettersEn?: (string | undefined | null)[];
  /** Plate digits, Western (e.g. "1010"), 1-4 chars. */
  numbers?: string;
  plateFormat?: PlateFormat;
  plateType?: PlateKind;
  size?: PlateSize;
  className?: string;
  /** Accessible label; defaults to a readable plate string. */
  title?: string;
}

/**
 * Saudi vehicle license plate (STANDARD geometry) rendered as a single
 * self-contained SVG, matching the official layout exactly:
 *
 *   ┌──────────┬────────┬───┐
 *   │  ١ ٠ ١ ٠ │ ب د ر  │ 🌴 │
 *   ├──────────┼────────┤السعودية
 *   │   1010   │  BDR   │K S A│  ← side strip
 *   └──────────┴────────┴───┘
 *
 * Separate rounded white cells: a two-row NUMBERS box (Arabic-Indic over
 * Western) on the left, a two-row LETTERS box (Arabic over Latin) in the
 * middle, and a tall side strip on the right carrying the palm-and-swords
 * emblem, "السعودية", and a vertically stacked "K S A". The strip background
 * is YELLOW for transport plates. Every gradient/filter id is namespaced with
 * `useId()` so multiple plates on one page never clash.
 */
export function SaudiLicensePlate({
  letters = [],
  lettersEn,
  numbers = '',
  plateFormat = 'standard',
  plateType = 'transport',
  size = 'card',
  className,
  title,
}: SaudiLicensePlateProps) {
  void plateFormat; // only STANDARD geometry is implemented
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${n}-${uid}`;

  const ar = [0, 1, 2].map((i) => letters[i] ?? '').filter(Boolean) as string[];
  const en = (lettersEn ?? inferEnglish([0, 1, 2].map((i) => letters[i] ?? '')))
    .map((x) => (x ?? '').toUpperCase())
    .filter(Boolean);

  const westNums = (numbers || '').replace(/\D/g, '').slice(0, 4);

  const stripFill = plateType === 'transport' ? '#F5C518' : '#1C3D74';
  const ink = '#0b0c0d';
  // Black body shows through as the frame and the gaps between cells.
  const line = '#0b0c0d';
  const fontArabic = 'Arial, "Arial Unicode MS", sans-serif';
  const fontLatin = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

  const w = size === 'fill' ? '100%' : SIZE_WIDTH[size];
  const readable = title ?? `لوحة سعودية ${ar.join(' ')} ${westNums}`.trim();

  // Geometry (viewBox 0 0 480 230). Thin 4px black frame + 4px black gaps.
  const P = 4, GAP = 4, STRIP_W = 70, ROW_H = 109;
  const numX = P, numW = 214;
  const letX = numX + numW + GAP, letW = 180;
  const stripX = letX + letW + GAP;
  const topY = P, botY = P + ROW_H + GAP;
  const numCx = numX + numW / 2;
  const letCx = letX + letW / 2;
  const stripCx = stripX + STRIP_W / 2;
  const row1Cy = topY + ROW_H / 2;
  const row2Cy = botY + ROW_H / 2;

  // Explicit per-glyph x keeps Arabic letters in array order (no bidi flip).
  const spread = (n: number, i: number, step: number) => letCx + (i - (n - 1) / 2) * step;

  const Cell = ({ x, y }: { x: number; y: number }) => {
    const cw = x === numX ? numW : letW;
    return (
      <g>
        <rect
          x={x} y={y} width={cw} height={ROW_H} rx={6}
          fill={`url(#${id('cell')})`}
          filter={`url(#${id('inset')})`}
        />
        <rect x={x + 2} y={y + 2} width={cw - 4} height={ROW_H / 2} rx={5} fill={`url(#${id('gloss')})`} />
      </g>
    );
  };

  return (
    <div
      dir="ltr"
      className={cn('inline-block select-none', size === 'fill' && 'block w-full', className)}
      style={size === 'fill' ? undefined : { width: w }}
    >
      <svg
        viewBox="0 0 480 230"
        width={size === 'fill' ? '100%' : w}
        role="img"
        aria-label={readable}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <defs>
          {/* White panel behind the cells (gaps read white, like the real plate) */}
          <linearGradient id={id('panel')} x1="0" y1="0" x2="0" y2="230" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f6f7f8" />
          </linearGradient>
          {/* Glossy white cell face */}
          <linearGradient id={id('cell')} x1="0" y1="0" x2="0" y2="230" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#fdfdfe" />
            <stop offset="1" stopColor="#f0f2f3" />
          </linearGradient>
          {/* Yellow side strip */}
          <linearGradient id={id('strip')} x1="0" y1="0" x2="0" y2="230" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={stripFill} />
            <stop offset="0.5" stopColor={stripFill} />
            <stop offset="1" stopColor={stripFill} stopOpacity="0.9" />
          </linearGradient>
          {/* Top gloss highlight */}
          <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* Inner shadow — carves each cell for depth */}
          <filter id={id('inset')} x="-12%" y="-12%" width="124%" height="124%">
            <feOffset dx="0" dy="1.5" />
            <feGaussianBlur stdDeviation="2.4" result="off" />
            <feComposite operator="out" in="SourceGraphic" in2="off" result="inv" />
            <feFlood floodColor="#000000" floodOpacity="0.26" />
            <feComposite operator="in" in2="inv" result="shd" />
            <feComposite operator="over" in="shd" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* Black plate body — the frame and all gaps between cells read black
            (no white outer margin). */}
        <rect x="0.5" y="0.5" width="479" height="229" rx="12" fill={line} />

        {/* ===== Cells ===== */}
        <Cell x={numX} y={topY} />
        <Cell x={numX} y={botY} />
        <Cell x={letX} y={topY} />
        <Cell x={letX} y={botY} />

        {/* ===== Side strip (yellow) ===== */}
        <rect x={stripX} y={topY} width={STRIP_W} height={ROW_H * 2 + GAP} rx={10} fill={`url(#${id('strip')})`} filter={`url(#${id('inset')})`} />
        <rect x={stripX + 2} y={topY + 2} width={STRIP_W - 4} height={(ROW_H * 2 + GAP) / 2} rx={8} fill={`url(#${id('gloss')})`} />
        {/* Official palm-and-swords emblem — sits below a small top margin */}
        <image href={EMBLEM_SRC} x={stripCx - 21} y={topY + 10} width={42} height={46} preserveAspectRatio="xMidYMid meet" />
        <text x={stripCx} y={topY + 76} textAnchor="middle" style={{ fontFamily: fontArabic }} fontWeight="700" fontSize="11" fill={ink} textLength={STRIP_W - 18} lengthAdjust="spacingAndGlyphs">
          السعودية
        </text>
        {['K', 'S', 'A'].map((ch, i) => (
          <text key={ch} x={stripCx} y={topY + 112 + i * 34} textAnchor="middle" style={{ fontFamily: fontLatin }} fontWeight="800" fontSize="24" fill={ink}>
            {ch}
          </text>
        ))}

        {/* ===== Characters ===== */}
        {/* Characters — a hairline same-color stroke adds a touch of extra weight
            (Arial has no face heavier than Bold/700). */}
        <g stroke={ink} strokeWidth={0.55} paintOrder="stroke">
        {/* Numbers — each Arabic-Indic digit sits in the SAME column x as its
            Western counterpart, so ١ is exactly above 1, etc. */}
        {westNums
          ? westNums.split('').map((d, i) => {
              const x = numCx + (i - (westNums.length - 1) / 2) * 44;
              return (
                <g key={`num-${i}`}>
                  <text x={x} y={row1Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontArabic }} fontWeight="700" fontSize="50" fill={ink}>{toArabicDigits(d)}</text>
                  <text x={x} y={row2Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontLatin }} fontWeight="700" fontSize="44" fill={ink}>{d}</text>
                </g>
              );
            })
          : (
            <>
              <text x={numCx} y={row1Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontArabic }} fontWeight="700" fontSize="50" fill={ink} opacity="0.16">٠٠٠٠</text>
              <text x={numCx} y={row2Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontLatin }} fontWeight="700" fontSize="44" fill={ink} opacity="0.16">0000</text>
            </>
          )}
        {/* Letters — Arabic (top). Each glyph is its own <text> at an explicit x
            so the order stays left→right (ب above B), matching the real plate
            without any bidi reordering. */}
        {ar.length
          ? ar.map((ch, i) => (
              <text key={`ar-${i}`} x={spread(ar.length, i, 46)} y={row1Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontArabic }} fontWeight="700" fontSize="46" fill={ink}>{ch}</text>
            ))
          : <text x={letCx} y={row1Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontArabic }} fontWeight="700" fontSize="46" fill={ink} opacity="0.16">— — —</text>}
        {/* Letters — Latin (bottom) */}
        {en.length
          ? en.map((ch, i) => (
              <text key={`en-${i}`} x={spread(en.length, i, 46)} y={row2Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontLatin }} fontWeight="700" fontSize="36" fill={ink}>{ch}</text>
            ))
          : <text x={letCx} y={row2Cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: fontLatin }} fontWeight="700" fontSize="36" fill={ink} opacity="0.16">— — —</text>}
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Backward-compatible wrapper + helpers (keep existing call sites)    */
/* ------------------------------------------------------------------ */

export interface SaudiPlateProps {
  letters?: (string | undefined | null)[];
  lettersEn?: (string | undefined | null)[];
  numbers?: string;
  /** Legacy registration type; mapped to the new taxonomy. */
  type?: PlateType;
  /** Legacy size keywords, mapped onto the new presets. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LEGACY_SIZE: Record<NonNullable<SaudiPlateProps['size']>, PlateSize> = {
  sm: 'card',
  md: 'stage',
  lg: 'fullscreen',
};

/**
 * Legacy entry point. All freight plates render as transport (yellow strip);
 * props are forwarded to {@link SaudiLicensePlate}.
 */
export function SaudiPlate({ letters, lettersEn, numbers, type, size = 'md', className }: SaudiPlateProps) {
  void type;
  return (
    <SaudiLicensePlate
      letters={letters}
      lettersEn={lettersEn}
      numbers={numbers}
      plateType="transport"
      plateFormat="standard"
      size={LEGACY_SIZE[size]}
      className={className}
    />
  );
}

/** Parse a stored plate string like "ب د ر 1010" into structured form. */
export function parsePlateString(input: string): { letters: string[]; numbers: string } {
  const match = (input ?? '').trim().match(/^([^\d]+?)\s*(\d{1,4})\s*$/);
  if (!match) return { letters: [], numbers: '' };
  const letters = (match[1] ?? '').trim().split(/\s+/).slice(0, 3);
  return { letters, numbers: match[2] ?? '' };
}
