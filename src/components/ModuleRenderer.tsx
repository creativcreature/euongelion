import type { Module } from '@/types'
import ScriptureModule from './modules/ScriptureModule'
import VocabModule from './modules/VocabModule'
import TeachingModule from './modules/TeachingModule'
import InsightModule from './modules/InsightModule'
import StoryModule from './modules/StoryModule'
import ReflectionModule from './modules/ReflectionModule'
import PrayerModule from './modules/PrayerModule'
import TakeawayModule from './modules/TakeawayModule'
import BridgeModule from './modules/BridgeModule'
import ComprehensionModule from './modules/ComprehensionModule'
import ProfileModule from './modules/ProfileModule'
import ResourceModule from './modules/ResourceModule'

export default function ModuleRenderer({ module }: { module: Module }) {
  switch (module.type) {
    case 'scripture':
      return <ScriptureModule module={module} />
    case 'vocab':
      return <VocabModule module={module} />
    case 'teaching':
      return <TeachingModule module={module} />
    case 'insight':
      return <InsightModule module={module} />
    case 'story':
      return <StoryModule module={module} />
    case 'reflection':
      return <ReflectionModule module={module} />
    case 'prayer':
      return <PrayerModule module={module} />
    case 'takeaway':
      return <TakeawayModule module={module} />
    case 'bridge':
      return <BridgeModule module={module} />
    case 'comprehension':
      return <ComprehensionModule module={module} />
    case 'profile':
      return <ProfileModule module={module} />
    case 'resource':
      return <ResourceModule module={module} />
    default:
      return null
  }
}
