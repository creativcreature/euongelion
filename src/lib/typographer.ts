/**
 * Typographer — transforms raw text to typographically correct text.
 *
 * - Straight quotes → curly quotes (smart quotes)
 * - Double hyphens → em-dashes
 * - Triple dots → ellipsis character
 * - Single hyphens between spaces → en-dashes
 *
 * Applied in ModuleRenderer before passing text to components.
 */

export function typographer(text: string): string {
  if (!text) return text

  let result = text

  // Em-dashes: -- or --- → —
  result = result.replace(/---?/g, '\u2014')

  // En-dashes: space-hyphen-space → space–space
  result = result.replace(/ - /g, ' \u2013 ')

  // Ellipsis: ... → …
  result = result.replace(/\.\.\./g, '\u2026')

  // Double quotes: opening and closing
  // Opening: after whitespace, start of string, or after ([{
  result = result.replace(/(^|[\s(\[{])"(?=\S)/g, '$1\u201C')
  // Closing: before whitespace, end of string, or before )]}.,;:!?
  result = result.replace(/"(?=[\s)\]}.,:;!?]|$)/g, '\u201D')
  // Catch remaining straight double quotes (closing)
  result = result.replace(/"/g, '\u201D')

  // Single quotes / apostrophes
  // Apostrophes within words (don't, it's, you're)
  result = result.replace(/(\w)'(\w)/g, '$1\u2019$2')
  // Opening single quote: after whitespace or start
  result = result.replace(/(^|[\s(\[{])'(?=\S)/g, '$1\u2018')
  // Closing single quote
  result = result.replace(/'(?=[\s)\]}.,:;!?]|$)/g, '\u2019')
  // Catch remaining straight single quotes (closing)
  result = result.replace(/'/g, '\u2019')

  return result
}
