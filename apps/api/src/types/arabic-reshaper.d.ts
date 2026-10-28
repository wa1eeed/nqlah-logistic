declare module 'arabic-reshaper' {
  export function convertArabic(text: string): string;
  export function convertArabicBack(text: string): string;
  const reshaper: {
    convertArabic(text: string): string;
    convertArabicBack(text: string): string;
  };
  export default reshaper;
}
