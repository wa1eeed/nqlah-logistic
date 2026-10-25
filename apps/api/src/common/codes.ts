import { customAlphabet } from 'nanoid';

// Unambiguous uppercase alphabet (no 0/O/1/I) for readable public codes.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const gen = customAlphabet(alphabet, 6);

/** A short, human-friendly public company reference, e.g. "NQ-7K4F2P". */
export const companyCode = (): string => `NQ-${gen()}`;
