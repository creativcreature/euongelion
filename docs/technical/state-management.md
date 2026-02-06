# State Management

EUONGELION uses Zustand for client-side state management with TypeScript.

## Overview

State is organized into domain-specific stores:

| Store             | Purpose                              |
| ----------------- | ------------------------------------ |
| `AuthStore`       | Authentication and session           |
| `UserStore`       | Profile and preferences              |
| `DevotionalStore` | Current devotional and reading state |
| `ProgressStore`   | Streaks and statistics               |
| `BookmarkStore`   | Saved items                          |
| `UIStore`         | Modals, toasts, navigation           |
| `OfflineStore`    | Cached content and sync              |
| `SoulAuditStore`  | Assessment state                     |

## Store Architecture

```
stores/
├── index.ts          # Export all stores
├── types.ts          # Type definitions
└── middleware.ts     # Store middleware
```

## Type Definitions

All store types are defined in `stores/types.ts`:

### Auth Types

```typescript
type AuthProvider = 'email' | 'google' | 'apple' | 'anonymous'
type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error'

interface UserSession {
  id: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
  provider: AuthProvider
  emailVerified: boolean
  accessToken: string
  expiresAt: number
  createdAt: number
}
```

### User Types

```typescript
interface UserProfile {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
  bio?: string
  createdAt: Date
  lastLoginAt: Date
  isPremium: boolean
  premiumExpiresAt?: Date
  churchAffiliation?: string
  timezone: string
  locale: string
}

interface UserPreferences {
  preferredTranslation: BibleTranslation
  defaultImmersionLevel: ImmersionLevel
  dailyReminderEnabled: boolean
  dailyReminderTime: string
  pushNotificationsEnabled: boolean
  emailNotificationsEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  showOriginalLanguage: boolean
  autoPlayAudio: boolean
  offlineModeEnabled: boolean
  privacy: PrivacySettings
}
```

### Progress Types

```typescript
interface StreakInfo {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  streakStartDate: string
  streakDates: string[]
}

interface ReadingStats {
  totalDevotionalsCompleted: number
  totalSeriesCompleted: number
  totalTimeSpentMinutes: number
  totalWordStudies: number
  totalReflectionsAnswered: number
  immersionLevelStats: {
    '1-minute': number
    '5-minute': number
    '15-minute': number
  }
  weeklyTrend: DailyReadingCount[]
  monthlyTrend: DailyReadingCount[]
}
```

### Reading State

```typescript
interface ReadingState {
  devotionalId: string
  currentImmersionLevel: ImmersionLevel
  scrollPosition: number
  timeSpent: number
  startedAt: number
  lastReadAt: number
  completedSections: string[]
  isComplete: boolean
}
```

### UI State

```typescript
interface ModalState {
  isOpen: boolean
  type: string | null
  data?: Record<string, unknown>
  onCloseAction?: string
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration: number
  action?: {
    label: string
    onClick: string
  }
  createdAt: number
}
```

### Soul Audit Types

```typescript
type SoulAuditCategory =
  | 'spiritual-disciplines'
  | 'relationships'
  | 'purpose'
  | 'emotional-health'
  | 'physical-stewardship'
  | 'intellectual-growth'
  | 'service'
  | 'worship'

interface SoulAuditQuestion {
  id: string
  category: SoulAuditCategory
  question: string
  type: 'scale' | 'multiple-choice' | 'text' | 'yes-no'
  options?: string[]
  scaleRange?: { min: number; max: number }
  scriptureReference?: ScriptureReference
  order: number
}

interface SoulAuditResults {
  overallScore: number
  categoryScores: Record<SoulAuditCategory, number>
  strengths: SoulAuditCategory[]
  growthAreas: SoulAuditCategory[]
  recommendedSeriesIds: string[]
  insights: string[]
  calculatedAt: number
}
```

## Store Interfaces

### AuthStore

```typescript
interface AuthStoreState {
  // State
  session: UserSession | null
  status: AuthStatus
  error: string | null
  isInitialized: boolean

  // Actions
  setSession: (session: UserSession | null) => void
  setStatus: (status: AuthStatus) => void
  setError: (error: string | null) => void
  initialize: () => Promise<void>
  signIn: (
    provider: AuthProvider,
    credentials?: { email: string; password: string },
  ) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  refreshToken: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
}
```

### UserStore

```typescript
interface UserStoreState {
  // State
  profile: UserProfile | null
  preferences: UserPreferences
  isLoading: boolean
  error: string | null

  // Actions
  setProfile: (profile: UserProfile | null) => void
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  setPreferences: (preferences: Partial<UserPreferences>) => void
  loadProfile: (userId: string) => Promise<void>
  savePreferences: () => Promise<void>
  resetPreferences: () => void
  clearError: () => void
}
```

### DevotionalStore

```typescript
interface DevotionalStoreState {
  // State
  currentDevotional: Devotional | null
  readingState: ReadingState | null
  readingHistory: ReadingHistoryEntry[]
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentDevotional: (devotional: Devotional | null) => void
  loadDevotional: (id: string) => Promise<void>
  startReading: (devotionalId: string, immersionLevel: ImmersionLevel) => void
  updateReadingProgress: (updates: Partial<ReadingState>) => void
  completeReading: () => void
  addToHistory: (entry: ReadingHistoryEntry) => void
  clearCurrentDevotional: () => void
  clearError: () => void
}
```

### ProgressStore

```typescript
interface ProgressStoreState {
  // State
  streak: StreakInfo
  stats: ReadingStats
  seriesProgress: Record<string, SeriesProgress>
  dailyProgress: DailyProgress[]
  isLoading: boolean
  error: string | null

  // Actions
  updateStreak: (activityDate: string) => void
  recordProgress: (progress: DailyProgress) => void
  updateSeriesProgress: (
    seriesId: string,
    progress: Partial<SeriesProgress>,
  ) => void
  loadProgress: (userId: string) => Promise<void>
  syncProgress: () => Promise<void>
  calculateStats: () => void
  clearError: () => void
}
```

### UIStore

```typescript
interface UIStoreState {
  // State
  modal: ModalState
  drawer: DrawerState
  bottomSheet: BottomSheetState
  toasts: Toast[]
  isNavigating: boolean
  isSidebarOpen: boolean
  isSearchOpen: boolean

  // Actions
  openModal: (type: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  openDrawer: (
    type: string,
    side?: 'left' | 'right' | 'bottom',
    data?: Record<string, unknown>,
  ) => void
  closeDrawer: () => void
  openBottomSheet: (
    type: string,
    snapPoints?: number[],
    data?: Record<string, unknown>,
  ) => void
  closeBottomSheet: () => void
  showToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void
  dismissToast: (id: string) => void
  clearAllToasts: () => void
  setNavigating: (isNavigating: boolean) => void
  toggleSidebar: () => void
  toggleSearch: () => void
}
```

### OfflineStore

```typescript
interface OfflineStoreState {
  // State
  isOnline: boolean
  cachedDevotionals: Record<string, CachedDevotional>
  cachedSeries: Record<string, CachedSeries>
  syncStatus: SyncStatus
  totalCacheSize: number
  maxCacheSize: number

  // Actions
  setOnlineStatus: (isOnline: boolean) => void
  cacheDevotional: (devotional: Devotional) => void
  removeCachedDevotional: (devotionalId: string) => void
  cacheSeries: (series: Series, devotionalIds: string[]) => void
  removeCachedSeries: (seriesId: string) => void
  addPendingSync: (
    item: Omit<PendingSyncItem, 'createdAt' | 'retryCount'>,
  ) => void
  removePendingSync: (id: string) => void
  syncPendingChanges: () => Promise<void>
  clearCache: () => void
  getCachedDevotional: (devotionalId: string) => Devotional | null
  isCached: (devotionalId: string) => boolean
}
```

## Usage Examples

### Basic Store Usage

```typescript
import { useDevotionalStore } from '@/stores';

function DevotionalReader() {
  const {
    currentDevotional,
    readingState,
    loadDevotional,
    startReading,
    completeReading
  } = useDevotionalStore();

  useEffect(() => {
    loadDevotional('devotional-id');
  }, []);

  const handleStart = () => {
    startReading('devotional-id', '5-minute');
  };

  const handleComplete = () => {
    completeReading();
  };

  return (
    <div>
      <h1>{currentDevotional?.title}</h1>
      <button onClick={handleStart}>Start Reading</button>
      <button onClick={handleComplete}>Mark Complete</button>
    </div>
  );
}
```

### UI Store for Modals

```typescript
import { useUIStore } from '@/stores';

function SomeComponent() {
  const { openModal, showToast } = useUIStore();

  const handleAction = () => {
    openModal('confirmation', {
      title: 'Are you sure?',
      onConfirm: () => {
        // Do something
        showToast({
          type: 'success',
          title: 'Done!',
          duration: 3000
        });
      }
    });
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

### Progress Tracking

```typescript
import { useProgressStore } from '@/stores';

function ProgressDisplay() {
  const { streak, stats } = useProgressStore();

  return (
    <div>
      <p>Current Streak: {streak.currentStreak} days</p>
      <p>Longest Streak: {streak.longestStreak} days</p>
      <p>Total Completed: {stats.totalDevotionalsCompleted}</p>
    </div>
  );
}
```

### Offline Support

```typescript
import { useOfflineStore } from '@/stores';

function OfflineIndicator() {
  const { isOnline, syncStatus, syncPendingChanges } = useOfflineStore();

  return (
    <div>
      {!isOnline && <span>Offline Mode</span>}
      {syncStatus.pendingChanges > 0 && (
        <button onClick={syncPendingChanges}>
          Sync {syncStatus.pendingChanges} changes
        </button>
      )}
    </div>
  );
}
```

## Middleware

Store middleware handles persistence and logging:

```typescript
// stores/middleware.ts
import { StateCreator, StoreMutatorIdentifier } from 'zustand'

// Persist middleware for localStorage
export const persist = <T>(
  config: StateCreator<T>,
  options: { name: string; partialize?: (state: T) => Partial<T> },
) => {
  // Implementation
}

// Logger middleware for development
export const logger = <T>(config: StateCreator<T>, name: string) => {
  return (set, get, api) =>
    config(
      (...args) => {
        console.log(`[${name}] applying`, args)
        set(...args)
        console.log(`[${name}] new state`, get())
      },
      get,
      api,
    )
}
```

## Best Practices

1. **Keep stores focused** - One domain per store
2. **Use selectors** - Avoid subscribing to entire store
3. **Handle loading states** - Always track isLoading
4. **Handle errors** - Include error state and clearError action
5. **Type everything** - Full TypeScript coverage
6. **Persist selectively** - Only persist what's needed offline
