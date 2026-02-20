export type TextScalePreference = 'default' | 'large' | 'xlarge'

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
