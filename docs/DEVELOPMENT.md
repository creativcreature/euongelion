# Development Guide

This document covers setting up a local development environment for EUONGELION.

## Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** 10+ or **yarn**
- **Git**
- Code editor (VS Code recommended)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EUONGELION-STARTUP
```

### 2. Install Dependencies

```bash
cd app
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the `app/` directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Anthropic (for Soul Audit)
ANTHROPIC_API_KEY=your-api-key

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=EUONGELION Dev
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── __tests__/           # Test files
├── api/                 # API routes
├── components/          # React components
│   ├── analytics/
│   ├── animated/
│   ├── devotional/
│   ├── forms/
│   ├── icons/
│   ├── interactive/
│   ├── layout/
│   ├── loading/
│   ├── notifications/
│   ├── offline/
│   ├── reading-animations/
│   ├── series/
│   ├── transitions/
│   └── ui/
├── e2e/                 # End-to-end tests
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
│   ├── analytics/
│   ├── animations/
│   ├── content/
│   ├── notifications/
│   ├── offline/
│   ├── theme/
│   ├── validation/
│   └── date.ts
├── providers/           # React context providers
├── public/              # Static assets
├── scripts/             # Build/utility scripts
├── src/                 # Source modules
│   └── app/            # Next.js App Router pages
├── stores/              # Zustand state stores
├── types/               # TypeScript definitions
├── globals.css          # Global styles
├── layout.tsx           # Root layout
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript config
└── vitest.config.ts     # Test configuration
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server

# Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript check

# Testing
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Development Workflow

### Creating Components

1. Create component directory:

   ```
   components/MyComponent/
   ├── index.ts
   ├── MyComponent.tsx
   └── MyComponent.test.tsx
   ```

2. Export from index:

   ```typescript
   export { MyComponent } from './MyComponent'
   ```

3. Use design tokens:
   ```tsx
   export function MyComponent() {
     return <div className="bg-scroll text-tehom p-6">Content</div>
   }
   ```

### Using Zustand Stores

```typescript
import { useDevotionalStore } from '@/stores';

function MyComponent() {
  const { currentDevotional, loadDevotional } = useDevotionalStore();

  useEffect(() => {
    loadDevotional('devotional-id');
  }, []);

  return <div>{currentDevotional?.title}</div>;
}
```

### Working with Types

Types are defined in `app/types/`:

```typescript
import type { Devotional, Series, UserProgress } from '@/types'

interface Props {
  devotional: Devotional
  series: Series
  progress: UserProgress[]
}
```

## Database Development

### Local Supabase (Optional)

For offline development:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local instance
supabase start

# Apply migrations
supabase db push
```

### Running Migrations

```bash
# Check migration status
supabase migration list

# Create new migration
supabase migration new my_migration

# Apply migrations
supabase db push
```

## Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Single file
npm run test -- MyComponent.test.tsx
```

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

### Coverage

```bash
npm run test:coverage
```

Target: 70% minimum across branches, functions, lines, statements.

## Styling

### Tailwind CSS

Use Tailwind utilities with design tokens:

```tsx
// Design token colors
<div className="bg-tehom text-scroll">Dark mode</div>
<div className="bg-scroll text-tehom">Light mode</div>
<div className="text-gold">Accent</div>

// Spacing (8px base)
<div className="p-2">8px padding</div>
<div className="p-4">16px padding</div>
<div className="p-6">24px padding</div>
```

### CSS Custom Properties

Available in `design-system/tokens.css`:

```css
.my-class {
  background: var(--color-tehom-black);
  color: var(--color-scroll-white);
  font-family: var(--font-display);
}
```

### Dark Mode

```tsx
<div className="bg-scroll dark:bg-tehom">Responds to theme</div>
```

## API Development

### Creating API Routes

```typescript
// app/api/my-route/route.ts
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // Handle GET
  return Response.json({ data: 'value' })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Handle POST
  return Response.json({ success: true })
}
```

### Testing API Routes

```bash
# Using curl
curl http://localhost:3000/api/my-route

# With data
curl -X POST http://localhost:3000/api/my-route \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

## Debugging

### VS Code Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    }
  ]
}
```

### React DevTools

Install React DevTools browser extension for component inspection.

### Network Debugging

Use browser DevTools Network tab or:

```bash
# Log all requests
DEBUG=* npm run dev
```

## Common Tasks

### Adding a New Module Type

1. Define type in `types/content.ts`
2. Create component in `components/modules/`
3. Register in `ModuleRenderer`
4. Add tests

### Adding a New Store

1. Define types in `stores/types.ts`
2. Create store file
3. Add middleware if needed
4. Export from stores index

### Adding Environment Variables

1. Add to `.env.local`
2. Add to `.env.example`
3. Update `DEPLOYMENT.md`
4. If public, prefix with `NEXT_PUBLIC_`

## Troubleshooting

### "Module not found"

- Check import paths
- Verify tsconfig paths
- Run `npm install`

### TypeScript Errors

```bash
npm run type-check
```

### Styling Issues

- Check Tailwind config
- Verify class names
- Inspect with DevTools

### Build Failures

```bash
# Clear cache
rm -rf .next
npm run build
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase](https://supabase.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [Vitest](https://vitest.dev/)
