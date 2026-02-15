/**
 * Slot Engine Unit Tests
 *
 * Tests the core slot allocation/replacement/switch logic for the
 * Daily Bread devotional system. Max 3 concurrent active devotionals:
 * 1 current + up to 2 queued.
 *
 * Covers: PLAN-V3 Phase 6, euan-PLAN-v2 Slot Model (decisions 5.1-5.16)
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Portable slot-engine types and pure helpers.
// These will live in src/lib/daily-bread/slot-engine.ts once implemented.
// Tests are written against the contract so they compile now and validate later.
// ---------------------------------------------------------------------------

type SlotStatus = 'current' | 'queued' | 'completed' | 'archived'
type ArchiveReason = 'completed' | 'replaced' | 'week_end'

interface ActiveSlot {
  id: string
  seriesSlug: string
  status: SlotStatus
  currentDay: number
  totalDays: number
  activatedAt: number
  archivedAt?: number
  archiveReason?: ArchiveReason
}

interface SlotEngine {
  slots: ActiveSlot[]
  switchCount: number
  maxSlots: number
}

// ---------------------------------------------------------------------------
// Pure slot-engine helpers (contract stubs — replace with real imports)
// ---------------------------------------------------------------------------

function createEngine(): SlotEngine {
  return { slots: [], switchCount: 0, maxSlots: 3 }
}

function canActivate(engine: SlotEngine): boolean {
  return (
    engine.slots.filter((s) => s.status !== 'archived').length < engine.maxSlots
  )
}

function activateSlot(
  engine: SlotEngine,
  seriesSlug: string,
  makeCurrent = true,
): SlotEngine {
  if (
    engine.slots.some(
      (s) => s.seriesSlug === seriesSlug && s.status !== 'archived',
    )
  ) {
    throw new Error('Duplicate active series')
  }
  const activeCount = engine.slots.filter((s) => s.status !== 'archived').length
  if (activeCount >= engine.maxSlots) {
    throw new Error('All slots full — replace required')
  }

  const slot: ActiveSlot = {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    seriesSlug,
    status: makeCurrent ? 'current' : 'queued',
    currentDay: 1,
    totalDays: 7,
    activatedAt: Date.now(),
  }

  const updated = engine.slots.map((s) =>
    makeCurrent && s.status === 'current'
      ? { ...s, status: 'queued' as SlotStatus }
      : s,
  )

  return { ...engine, slots: [...updated, slot] }
}

function replaceSlot(
  engine: SlotEngine,
  replaceId: string,
  newSeriesSlug: string,
): SlotEngine {
  const target = engine.slots.find((s) => s.id === replaceId)
  if (!target) throw new Error('Slot not found')
  if (target.status === 'archived')
    throw new Error('Cannot replace archived slot')

  const wasCurrent = target.status === 'current'
  const archived: ActiveSlot = {
    ...target,
    status: 'archived',
    archivedAt: Date.now(),
    archiveReason: 'replaced',
  }

  const newSlot: ActiveSlot = {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    seriesSlug: newSeriesSlug,
    status: wasCurrent ? 'current' : 'queued',
    currentDay: 1,
    totalDays: 7,
    activatedAt: Date.now(),
  }

  const updated = engine.slots.map((s) => (s.id === replaceId ? archived : s))

  return {
    ...engine,
    slots: [...updated, newSlot],
    switchCount: engine.switchCount + 1,
  }
}

function switchCurrent(engine: SlotEngine, slotId: string): SlotEngine {
  const target = engine.slots.find((s) => s.id === slotId)
  if (!target || target.status === 'archived') throw new Error('Invalid slot')

  const updated = engine.slots.map((s) => {
    if (s.id === slotId) return { ...s, status: 'current' as SlotStatus }
    if (s.status === 'current') return { ...s, status: 'queued' as SlotStatus }
    return s
  })

  return { ...engine, slots: updated, switchCount: engine.switchCount + 1 }
}

function archiveSlot(
  engine: SlotEngine,
  slotId: string,
  reason: ArchiveReason,
): SlotEngine {
  const updated = engine.slots.map((s) =>
    s.id === slotId
      ? {
          ...s,
          status: 'archived' as SlotStatus,
          archivedAt: Date.now(),
          archiveReason: reason,
        }
      : s,
  )
  return { ...engine, slots: updated }
}

function restoreSlot(engine: SlotEngine, slotId: string): SlotEngine {
  const target = engine.slots.find((s) => s.id === slotId)
  if (!target || target.status !== 'archived') throw new Error('Not archived')

  const activeCount = engine.slots.filter((s) => s.status !== 'archived').length
  if (activeCount >= engine.maxSlots) {
    throw new Error('All slots full — replace required to restore')
  }

  const updated = engine.slots.map((s) =>
    s.id === slotId
      ? {
          ...s,
          status: 'queued' as SlotStatus,
          archivedAt: undefined,
          archiveReason: undefined,
        }
      : s,
  )
  return { ...engine, slots: updated }
}

function getActiveSlots(engine: SlotEngine): ActiveSlot[] {
  return engine.slots.filter((s) => s.status !== 'archived')
}

function getCurrentSlot(engine: SlotEngine): ActiveSlot | undefined {
  return engine.slots.find((s) => s.status === 'current')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Slot Engine', () => {
  let engine: SlotEngine

  beforeEach(() => {
    engine = createEngine()
  })

  // ---- Allocation ----

  describe('allocation', () => {
    it('starts with zero active slots', () => {
      expect(getActiveSlots(engine)).toHaveLength(0)
      expect(getCurrentSlot(engine)).toBeUndefined()
    })

    it('activates first slot as current', () => {
      engine = activateSlot(engine, 'identity')
      const active = getActiveSlots(engine)
      expect(active).toHaveLength(1)
      expect(active[0].status).toBe('current')
      expect(active[0].seriesSlug).toBe('identity')
    })

    it('allows up to 3 concurrent active slots', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace')
      engine = activateSlot(engine, 'community')
      expect(getActiveSlots(engine)).toHaveLength(3)
    })

    it('rejects 4th activation when all slots full', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace')
      engine = activateSlot(engine, 'community')
      expect(() => activateSlot(engine, 'kingdom')).toThrow('All slots full')
    })

    it('prevents duplicate active series', () => {
      engine = activateSlot(engine, 'identity')
      expect(() => activateSlot(engine, 'identity')).toThrow(
        'Duplicate active series',
      )
    })

    it('allows re-activation of an archived series', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      engine = activateSlot(engine, 'identity')
      expect(getActiveSlots(engine)).toHaveLength(1)
    })

    it('new activation demotes current slot to queued', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace', true)
      const current = getCurrentSlot(engine)
      expect(current?.seriesSlug).toBe('peace')
      const queued = getActiveSlots(engine).filter((s) => s.status === 'queued')
      expect(queued).toHaveLength(1)
      expect(queued[0].seriesSlug).toBe('identity')
    })

    it('canActivate returns false when full', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace')
      engine = activateSlot(engine, 'community')
      expect(canActivate(engine)).toBe(false)
    })

    it('canActivate returns true after archiving', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace')
      engine = activateSlot(engine, 'community')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'replaced')
      expect(canActivate(engine)).toBe(true)
    })
  })

  // ---- Replacement ----

  describe('replacement', () => {
    it('replaces a slot and archives the old one', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = replaceSlot(engine, slotId, 'peace')

      const active = getActiveSlots(engine)
      expect(active).toHaveLength(1)
      expect(active[0].seriesSlug).toBe('peace')

      const archived = engine.slots.filter((s) => s.status === 'archived')
      expect(archived).toHaveLength(1)
      expect(archived[0].archiveReason).toBe('replaced')
    })

    it('replacing current slot makes replacement current', () => {
      engine = activateSlot(engine, 'identity')
      const currentId = getCurrentSlot(engine)!.id
      engine = replaceSlot(engine, currentId, 'peace')
      expect(getCurrentSlot(engine)?.seriesSlug).toBe('peace')
    })

    it('replacing queued slot keeps replacement queued', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace', false)
      const queued = getActiveSlots(engine).find((s) => s.status === 'queued')!
      engine = replaceSlot(engine, queued.id, 'community')
      const newQueued = getActiveSlots(engine).find(
        (s) => s.seriesSlug === 'community',
      )
      expect(newQueued?.status).toBe('queued')
    })

    it('increments switch count on replacement', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = replaceSlot(engine, slotId, 'peace')
      expect(engine.switchCount).toBe(1)
    })

    it('allows unlimited replacements', () => {
      engine = activateSlot(engine, 'identity')
      for (let i = 0; i < 10; i++) {
        const slotId = getCurrentSlot(engine)!.id
        engine = replaceSlot(engine, slotId, `series-${i}`)
      }
      expect(engine.switchCount).toBe(10)
      expect(getActiveSlots(engine)).toHaveLength(1)
    })

    it('cannot replace an already-archived slot', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      expect(() => replaceSlot(engine, slotId, 'peace')).toThrow(
        'Cannot replace archived',
      )
    })
  })

  // ---- Switching ----

  describe('switching current', () => {
    it('switches current between active slots', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace', false)
      const queued = getActiveSlots(engine).find((s) => s.status === 'queued')!
      engine = switchCurrent(engine, queued.id)
      expect(getCurrentSlot(engine)?.seriesSlug).toBe('peace')
    })

    it('previous current becomes queued', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace', false)
      const queued = getActiveSlots(engine).find((s) => s.status === 'queued')!
      engine = switchCurrent(engine, queued.id)
      const newQueued = getActiveSlots(engine).find(
        (s) => s.status === 'queued',
      )
      expect(newQueued?.seriesSlug).toBe('identity')
    })

    it('increments switch count', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace', false)
      const queued = getActiveSlots(engine).find((s) => s.status === 'queued')!
      engine = switchCurrent(engine, queued.id)
      expect(engine.switchCount).toBe(1)
    })

    it('cannot switch to archived slot', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      expect(() => switchCurrent(engine, slotId)).toThrow('Invalid slot')
    })
  })

  // ---- Archive ----

  describe('archive', () => {
    it('archives with completed reason', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      const archived = engine.slots.find((s) => s.id === slotId)!
      expect(archived.status).toBe('archived')
      expect(archived.archiveReason).toBe('completed')
      expect(archived.archivedAt).toBeDefined()
    })

    it('archives with replaced reason', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'replaced')
      expect(engine.slots.find((s) => s.id === slotId)!.archiveReason).toBe(
        'replaced',
      )
    })

    it('archives with week_end reason', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'week_end')
      expect(engine.slots.find((s) => s.id === slotId)!.archiveReason).toBe(
        'week_end',
      )
    })

    it('archiving frees a slot', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace')
      engine = activateSlot(engine, 'community')
      expect(canActivate(engine)).toBe(false)
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      expect(canActivate(engine)).toBe(true)
    })
  })

  // ---- Restore ----

  describe('restore', () => {
    it('restores archived slot as queued', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      engine = restoreSlot(engine, slotId)
      const restored = engine.slots.find((s) => s.id === slotId)!
      expect(restored.status).toBe('queued')
      expect(restored.archivedAt).toBeUndefined()
      expect(restored.archiveReason).toBeUndefined()
    })

    it('preserves progress on restore', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      // Simulate progress
      engine = {
        ...engine,
        slots: engine.slots.map((s) =>
          s.id === slotId ? { ...s, currentDay: 3 } : s,
        ),
      }
      engine = archiveSlot(engine, slotId, 'week_end')
      engine = restoreSlot(engine, slotId)
      expect(engine.slots.find((s) => s.id === slotId)!.currentDay).toBe(3)
    })

    it('rejects restore when slots full', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      engine = activateSlot(engine, 'peace')
      engine = activateSlot(engine, 'community')
      engine = activateSlot(engine, 'kingdom')
      expect(() => restoreSlot(engine, slotId)).toThrow('All slots full')
    })

    it('rejects restore of non-archived slot', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      expect(() => restoreSlot(engine, slotId)).toThrow('Not archived')
    })
  })

  // ---- Counters ----

  describe('counters', () => {
    it('tracks active slot count accurately', () => {
      expect(getActiveSlots(engine)).toHaveLength(0)
      engine = activateSlot(engine, 'identity')
      expect(getActiveSlots(engine)).toHaveLength(1)
      engine = activateSlot(engine, 'peace')
      expect(getActiveSlots(engine)).toHaveLength(2)
      const slotId = getActiveSlots(engine)[0].id
      engine = archiveSlot(engine, slotId, 'completed')
      expect(getActiveSlots(engine)).toHaveLength(1)
    })

    it('tracks switch count across operations', () => {
      engine = activateSlot(engine, 'identity')
      engine = activateSlot(engine, 'peace', false)
      const queued = getActiveSlots(engine).find((s) => s.status === 'queued')!
      engine = switchCurrent(engine, queued.id)
      const currentId = getCurrentSlot(engine)!.id
      engine = replaceSlot(engine, currentId, 'community')
      expect(engine.switchCount).toBe(2)
    })
  })

  // ---- Completed slot behavior ----

  describe('completed slot stays occupied until sabbath', () => {
    it('completed slot still occupies active count', () => {
      engine = activateSlot(engine, 'identity')
      const slotId = getActiveSlots(engine)[0].id
      // Mark as completed but not archived yet (stays until sabbath)
      engine = {
        ...engine,
        slots: engine.slots.map((s) =>
          s.id === slotId ? { ...s, status: 'completed' as SlotStatus } : s,
        ),
      }
      // completed is not archived, so still counts
      expect(getActiveSlots(engine)).toHaveLength(1)
    })
  })
})
