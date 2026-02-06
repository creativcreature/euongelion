# Contributing to EUONGELION

Thank you for your interest in contributing to EUONGELION. This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Honor the mission of the platform

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- Supabase account (for database features)
- Anthropic API key (for Soul Audit features)

### Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/euongelion.git
   cd euongelion
   ```

2. **Install dependencies**

   ```bash
   cd app
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials in `.env.local`

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/soul-audit-improvements`
- `fix/day-gating-timezone`
- `docs/api-documentation`
- `refactor/module-system`

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:

```
feat(soul-audit): add timezone detection
fix(daily-bread): correct day unlock calculation
docs(api): document progress endpoint
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Run linting and tests
5. Submit PR with clear description

PR Template:

```markdown
## Summary

Brief description of changes

## Changes

- Change 1
- Change 2

## Testing

How to test these changes

## Screenshots (if applicable)
```

## Code Standards

### TypeScript

- Use strict mode
- Define types for all props and state
- Avoid `any` - use `unknown` if needed
- Export types alongside components

```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary'
  onClick: () => void
  children: React.ReactNode
}

export function Button({ variant, onClick, children }: ButtonProps) {
  // ...
}

// Avoid
export function Button(props: any) {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use server components when possible

```typescript
// Prefer server components
async function SeriesList() {
  const series = await fetchSeries();
  return <SeriesGrid series={series} />;
}

// Use client components only when needed
'use client';
function InteractiveModule({ data }: ModuleProps) {
  const [state, setState] = useState();
  // ...
}
```

### Styling

- Use Tailwind CSS utilities
- Follow design token system
- Ensure accessibility (contrast, focus states)

```tsx
// Good - using design tokens
<button className="bg-gold text-tehom h-12 px-6 rounded-md hover:opacity-90">
  Submit
</button>

// Avoid - arbitrary values
<button className="bg-[#C19A6B] text-[#1A1612] h-[48px]">
  Submit
</button>
```

### File Organization

```
components/
├── ComponentName/
│   ├── index.ts          # Export
│   ├── ComponentName.tsx # Main component
│   ├── ComponentName.test.tsx # Tests
│   └── types.ts          # Types (if complex)
```

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Writing Tests

- Test behavior, not implementation
- Use descriptive test names
- Mock external dependencies

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Coverage Thresholds

Maintain minimum 70% coverage:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Content Contribution

### Creating Devotional Content

1. Follow the module system (21 types)
2. Use chiastic structure (A-B-C-B'-A')
3. Apply PaRDeS framework
4. Include all required metadata

See [Content Structure](./technical/api-routes.md) for module specifications.

### Content Review Process

1. Draft content in `content/drafts/`
2. Submit for review to `content/in-review/`
3. After approval, move to `content/approved/`
4. Final content goes to `content/final/`

## Documentation

- Update docs when changing features
- Use clear, concise language
- Include code examples
- Keep README files current

## Design System

When modifying UI:

1. Use existing design tokens
2. Follow spacing system (8px grid)
3. Maintain WCAG AA contrast
4. Test on mobile and desktop

See `design-system/tokens.json` for all available tokens.

## Getting Help

- Check existing issues and discussions
- Ask in the project Discord/Slack
- Reference documentation
- Tag maintainers for review

## Recognition

Contributors are recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to EUONGELION!
