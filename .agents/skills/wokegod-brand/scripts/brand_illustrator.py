#!/usr/bin/env python3
"""
wokeGod Brand Illustrator
Generates brand-consistent images based on content themes

Usage:
  python brand_illustrator.py "Blog post about recognizing God in daily life"
  python brand_illustrator.py --content-file devotional.md
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

# Configuration
BRAND_REFERENCES = Path(__file__).parent.parent
OUTPUTS_DIR = Path("/mnt/user-data/outputs")
PROJECTS_DIR = OUTPUTS_DIR / "brand-projects"

class BrandIllustrator:
    def __init__(self):
        self.load_brand_guidelines()
        
    def load_brand_guidelines(self):
        """Load all brand reference documents"""
        refs = BRAND_REFERENCES
        
        self.guidelines = {
            'colors': self._read_file(refs / 'colors.md'),
            'typography': self._read_file(refs / 'typography.md'),
            'photography': self._read_file(refs / 'photography.md'),
            'visual_world': self._read_file(refs / 'visual-world.md'),
            'style': self._read_file(refs / 'style.md'),
            'idea_mapping': self._read_file(refs / 'idea-mapping.md'),
        }
        
    def _read_file(self, filepath):
        """Read a reference file, return content or empty string"""
        try:
            return filepath.read_text()
        except:
            return ""
    
    def analyze_content(self, content_description):
        """
        Analyze content to determine what should be illustrated
        Returns: theme category and suggested objects/scenes
        """
        print(f"\n🔍 Analyzing content: {content_description[:100]}...")
        
        # This is where Claude's intelligence comes in
        # In practice, you'd use Claude API here to analyze based on idea-mapping.md
        # For now, return structure
        
        analysis = {
            'theme': self._detect_theme(content_description),
            'objects': self._suggest_objects(content_description),
            'mood': self._determine_mood(content_description),
            'style': self._select_style(content_description)
        }
        
        return analysis
    
    def _detect_theme(self, content):
        """Detect primary theme from content"""
        # Themes from idea-mapping.md
        themes = {
            'recognition': ['recognize', 'see', 'notice', 'aware', 'attention'],
            'rest': ['sabbath', 'rest', 'peace', 'stillness', 'quiet'],
            'busyness': ['busy', 'distracted', 'hurried', 'overwhelmed'],
            'faith': ['believe', 'trust', 'faith', 'confidence'],
            'prayer': ['pray', 'prayer', 'conversation', 'talk with God']
        }
        
        content_lower = content.lower()
        for theme, keywords in themes.items():
            if any(kw in content_lower for kw in keywords):
                return theme
        
        return 'general'
    
    def _suggest_objects(self, content):
        """Suggest specific objects/scenes based on theme"""
        # From visual-world.md
        object_library = {
            'recognition': ['open eyes', 'light breaking', 'doorway'],
            'rest': ['bed', 'hammock', 'quiet room', 'sunset'],
            'busyness': ['clock', 'calendar', 'desk chaos', 'running figure'],
            'faith': ['rock', 'anchor', 'foundation', 'hands reaching'],
            'prayer': ['hands folded', 'quiet corner', 'morning light'],
            'general': ['lamp', 'book', 'cup', 'window']
        }
        
        theme = self._detect_theme(content)
        return object_library.get(theme, object_library['general'])
    
    def _determine_mood(self, content):
        """Determine emotional mood"""
        moods = ['contemplative', 'hopeful', 'urgent', 'peaceful', 'dramatic']
        # Simple keyword matching - in real use, Claude API would analyze
        if any(word in content.lower() for word in ['urgent', 'wake up', 'now']):
            return 'urgent'
        if any(word in content.lower() for word in ['peace', 'rest', 'quiet']):
            return 'peaceful'
        return 'contemplative'
    
    def _select_style(self, content):
        """Select appropriate visual style"""
        # From style.md reference
        styles = {
            'caravaggio': 'Single-source lighting, dramatic shadows, timeless objects',
            'minimal': 'Clean, simple, generous white space',
            'textured': 'Paper grain, fabric, tactile quality'
        }
        return 'caravaggio'  # Default for wokeGod
    
    def generate_concepts(self, content_description, count=3):
        """
        Generate multiple concept options
        Returns: List of concept descriptions
        """
        print(f"\n💡 Generating {count} concept options...")
        
        analysis = self.analyze_content(content_description)
        
        concepts = []
        for i in range(count):
            concept = {
                'number': i + 1,
                'description': self._build_concept_description(analysis, i),
                'objects': analysis['objects'][i % len(analysis['objects'])],
                'mood': analysis['mood'],
                'style': analysis['style']
            }
            concepts.append(concept)
            
            print(f"\n   Option {i+1}: {concept['description']}")
        
        return concepts
    
    def _build_concept_description(self, analysis, variant):
        """Build human-readable concept description"""
        obj = analysis['objects'][variant % len(analysis['objects'])]
        mood = analysis['mood']
        style = analysis['style']
        
        return f"A {mood} scene featuring {obj}, in {style} style with dramatic lighting"
    
    def craft_image_prompt(self, concept, analysis):
        """
        Craft detailed image generation prompt
        Incorporates all brand guidelines
        """
        print(f"\n✍️  Crafting detailed prompt for concept...")
        
        # This builds the actual prompt sent to image generation API
        prompt_parts = []
        
        # Style foundation (from photography.md)
        prompt_parts.append("A photograph in the style of Caravaggio")
        prompt_parts.append("single-source lighting, dramatic chiaroscuro")
        prompt_parts.append("deep shadows, subject emerging from darkness")
        
        # Subject (from concept)
        prompt_parts.append(f"featuring {concept['objects']}")
        
        # Mood/tone
        prompt_parts.append(f"{concept['mood']} atmosphere")
        
        # Color treatment (from colors.md)
        prompt_parts.append("muted earth tones, desaturated")
        prompt_parts.append("blacks and warm grays, subtle amber highlights")
        
        # Composition
        prompt_parts.append("generous negative space, intentional framing")
        prompt_parts.append("film grain texture, museum-quality lighting")
        
        # What to avoid
        prompt_parts.append("Avoid: modern objects, bright colors, multiple light sources, flat lighting")
        
        full_prompt = ", ".join(prompt_parts)
        
        print(f"\n📝 Prompt preview: {full_prompt[:150]}...")
        
        return full_prompt
    
    def generate_image(self, prompt):
        """
        Call image generation API
        For MVP: Returns placeholder info
        For production: Calls Anthropic, Google Gemini, or other API
        """
        print(f"\n🎨 Generating image...")
        print(f"    (In production, this calls image generation API)")
        print(f"    (For now, returning placeholder)")
        
        # Placeholder - in real implementation:
        # response = anthropic_api.images.generate(prompt=prompt)
        # return response.image_url
        
        return {
            'url': 'placeholder-image-url.jpg',
            'prompt': prompt,
            'timestamp': datetime.now().isoformat()
        }
    
    def create_project_folder(self):
        """Create dated project folder for outputs"""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        project_name = f"illustration-{timestamp}"
        project_path = PROJECTS_DIR / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        return project_path
    
    def save_outputs(self, project_path, concept, prompt, image_result):
        """Save all outputs to project folder"""
        # Save concept description
        (project_path / "concept.json").write_text(json.dumps({
            'concept': concept,
            'analysis': prompt,
            'generated': image_result
        }, indent=2))
        
        # Save prompt
        (project_path / "prompt.txt").write_text(prompt)
        
        # In production: Download and save actual image
        print(f"\n💾 Outputs saved to: {project_path}")
        
        return project_path
    
    def run_interactive(self, content_description):
        """Main interactive workflow"""
        print("\n" + "="*60)
        print("wokeGod Brand Illustrator")
        print("="*60)
        
        # Step 1: Generate concepts
        concepts = self.generate_concepts(content_description)
        
        # Step 2: User selects concept
        print(f"\n🎯 Select a concept (1-{len(concepts)}) or 'q' to quit:")
        
        # In production, wait for user input
        # For now, auto-select first concept
        selected_idx = 0
        selected_concept = concepts[selected_idx]
        print(f"   → Selected: Option {selected_concept['number']}")
        
        # Step 3: Craft detailed prompt
        analysis = self.analyze_content(content_description)
        prompt = self.craft_image_prompt(selected_concept, analysis)
        
        # Step 4: Generate image
        image_result = self.generate_image(prompt)
        
        # Step 5: Save outputs
        project_path = self.create_project_folder()
        self.save_outputs(project_path, selected_concept, prompt, image_result)
        
        print("\n✅ Complete! Review outputs in project folder.")
        print(f"   {project_path}")
        
        return project_path

def main():
    if len(sys.argv) < 2:
        print("Usage: python brand_illustrator.py <content_description>")
        print('Example: python brand_illustrator.py "Blog about recognizing God daily"')
        sys.exit(1)
    
    content_description = " ".join(sys.argv[1:])
    
    illustrator = BrandIllustrator()
    project_path = illustrator.run_interactive(content_description)
    
    print(f"\nProject created: {project_path}")

if __name__ == "__main__":
    main()
