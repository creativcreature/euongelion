import { Module, ScriptureData, VocabData, TeachingData, InsightData, StoryData, ReflectionData, PrayerData, TakeawayData, BridgeData, ComprehensionData, InteractiveData, ResourceData } from '@/lib/types';
import { ScriptureModule } from './ScriptureModule';
import { VocabModule } from './VocabModule';
import { TeachingModule } from './TeachingModule';
import { InsightModule } from './InsightModule';
import { StoryModule } from './StoryModule';
import { ReflectionModule } from './ReflectionModule';
import { PrayerModule } from './PrayerModule';
import { TakeawayModule } from './TakeawayModule';
import { BridgeModule } from './BridgeModule';
import { ComprehensionModule } from './ComprehensionModule';
import { InteractiveModule } from './InteractiveModule';
import { ResourceModule } from './ResourceModule';
import ChronologyModule from './ChronologyModule';
import GeographyModule from './GeographyModule';
import ProfileModule from './ProfileModule';
import VisualModule from './VisualModule';
import ArtModule from './ArtModule';
import VoiceModule from './VoiceModule';
import MatchModule from './MatchModule';
import OrderModule from './OrderModule';
import RevealModule from './RevealModule';

interface Props {
  module: Module;
}

export function ModuleRenderer({ module }: Props) {
  switch (module.type) {
    case 'scripture':
      return <ScriptureModule data={module.data as ScriptureData} />;
    case 'vocab':
      return <VocabModule data={module.data as VocabData} />;
    case 'teaching':
      return <TeachingModule data={module.data as TeachingData} />;
    case 'insight':
      return <InsightModule data={module.data as InsightData} />;
    case 'story':
      return <StoryModule data={module.data as StoryData} />;
    case 'reflection':
      return <ReflectionModule data={module.data as ReflectionData} />;
    case 'prayer':
      return <PrayerModule data={module.data as PrayerData} />;
    case 'takeaway':
      return <TakeawayModule data={module.data as TakeawayData} />;
    case 'bridge':
      return <BridgeModule data={module.data as BridgeData} />;
    case 'comprehension':
      return <ComprehensionModule data={module.data as ComprehensionData} />;
    case 'interactive':
      return <InteractiveModule data={module.data as InteractiveData} />;
    case 'resource':
      return <ResourceModule data={module.data as ResourceData} />;
    // New modules
    case 'chronology':
      return <ChronologyModule data={module.data as any} />;
    case 'geography':
      return <GeographyModule data={module.data as any} />;
    case 'profile':
      return <ProfileModule data={module.data as any} />;
    case 'visual':
      return <VisualModule data={module.data as any} />;
    case 'art':
      return <ArtModule data={module.data as any} />;
    case 'voice':
      return <VoiceModule data={module.data as any} />;
    // Game modules
    case 'match':
      return <MatchModule data={module.data as any} />;
    case 'order':
      return <OrderModule data={module.data as any} />;
    case 'reveal':
      return <RevealModule data={module.data as any} />;
    default:
      return (
        <div className="my-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">
            Unknown module type: {(module as Module).type}
          </p>
        </div>
      );
  }
}
