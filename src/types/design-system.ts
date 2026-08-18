export type TextScalePreference = 'default' | 'large' | 'xlarge'

/**
 * Leading and measure (backlog #15).
 *
 * Matter's reader exposes Spacing and Width beside Font and Size; for long-form
 * scripture those two do more for legibility than typeface choice. Named steps
 * rather than raw sliders, matching how this reader already handles theme and
 * text size — a reader picks a feel, not a number.
 */
export type ReadingLeadingPreference = 'tight' | 'default' | 'loose'
export type ReadingMeasurePreference = 'narrow' | 'default' | 'wide'

export interface DesignTokenSet {
  color: Record<string, unknown>
  type: Record<string, unknown>
  space: Record<string, number>
  radius: Record<string, number>
  shadow: Record<string, string>
  motion: Record<string, unknown>
  layout: Record<string, unknown>
  component: Record<string, unknown>
}

export interface AccessibilityPreferences {
  textScale: TextScalePreference
  reduceMotion: boolean
  highContrast: boolean
  readingComfort: boolean
}

export interface ComponentSpec {
  id: string
  name: string
  anatomy: string[]
  states: Array<
    'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading' | 'error'
  >
  usage: {
    whenToUse: string[]
    whenNotToUse: string[]
  }
  a11y: {
    aria: string[]
    keyboard: string[]
    focus: string[]
  }
  metrics: {
    padding: string
    margin: string
    radius: string
    shadow: string
  }
  platformNotes: {
    web: string[]
    ios: string[]
    macos: string[]
  }
}
