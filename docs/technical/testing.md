# Testing Guide

EUONGELION uses Vitest for unit and integration testing with React Testing Library.

## Overview

```
Testing Stack:
- Vitest        → Test runner
- React Testing Library → Component testing
- jsdom         → Browser environment
- v8            → Coverage provider
```

## Configuration

Test configuration is in `app/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: [
      '__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', '.next', 'e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/**/index.ts',
        'src/types/**/*',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
})
```

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Run specific file
npm run test -- Button.test.tsx

# Run with coverage
npm run test:coverage

# Run matching pattern
npm run test -- --grep "should render"
```

## Test Structure

### File Organization

```
app/
├── __tests__/              # Integration tests
│   ├── api/               # API route tests
│   └── pages/             # Page tests
│
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx  # Co-located unit tests
│
└── lib/
    └── utils/
        ├── date.ts
        └── date.test.ts    # Utility tests
```

### Test File Naming

- `*.test.ts` - Unit tests
- `*.test.tsx` - Component tests
- `*.spec.ts` - Specification tests
- `*.e2e.ts` - End-to-end tests (excluded from unit)

## Writing Tests

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gold');
  });
});
```

### Testing with Props

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SeriesCard } from './SeriesCard';

const mockSeries = {
  slug: 'test-series',
  title: 'Test Series',
  subtitle: 'A test subtitle',
  dayCount: 5,
  pathway: 'awake',
};

describe('SeriesCard', () => {
  it('displays series information', () => {
    render(<SeriesCard series={mockSeries} />);

    expect(screen.getByText('Test Series')).toBeInTheDocument();
    expect(screen.getByText('A test subtitle')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('links to series page', () => {
    render(<SeriesCard series={mockSeries} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/series/test-series');
  });
});
```

### Testing Async Operations

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SoulAuditForm } from './SoulAuditForm';

// Mock fetch
global.fetch = vi.fn();

describe('SoulAuditForm', () => {
  it('submits form and shows result', async () => {
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        matched_series: {
          title: 'Matched Series',
          reasoning: 'Because...',
        },
      }),
    });

    render(<SoulAuditForm />);

    await userEvent.type(
      screen.getByRole('textbox'),
      'I feel overwhelmed with life'
    );

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Matched Series')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<SoulAuditForm />);

    await userEvent.type(screen.getByRole('textbox'), 'Test input');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter())

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })

  it('accepts initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })
})
```

### Testing Zustand Stores

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useDevotionalStore } from './devotionalStore'

describe('DevotionalStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDevotionalStore.setState({
      currentDevotional: null,
      isLoading: false,
      error: null,
    })
  })

  it('sets current devotional', () => {
    const devotional = { id: '1', title: 'Test' }

    useDevotionalStore.getState().setCurrentDevotional(devotional)

    expect(useDevotionalStore.getState().currentDevotional).toEqual(devotional)
  })

  it('clears devotional', () => {
    useDevotionalStore.setState({ currentDevotional: { id: '1' } })

    useDevotionalStore.getState().clearCurrentDevotional()

    expect(useDevotionalStore.getState().currentDevotional).toBeNull()
  })
})
```

### Testing API Routes

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

describe('POST /api/soul-audit', () => {
  it('returns 400 for missing input', async () => {
    const request = new Request('http://localhost/api/soul-audit', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns matched series on success', async () => {
    const request = new Request('http://localhost/api/soul-audit', {
      method: 'POST',
      body: JSON.stringify({
        response: 'I feel overwhelmed',
        sabbathPreference: 'sunday',
        timezone: 'America/New_York',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

## Mocking

### Mock Functions

```typescript
import { vi } from 'vitest'

// Basic mock
const mockFn = vi.fn()

// Mock with return value
const mockFn = vi.fn().mockReturnValue('value')

// Mock with implementation
const mockFn = vi.fn((x) => x * 2)

// Mock async function
const mockFn = vi.fn().mockResolvedValue({ data: 'value' })
```

### Mock Modules

```typescript
// Mock entire module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock with factory
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@test.com' },
    isAuthenticated: true,
  }),
}))
```

### Mock Timers

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Timer tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls callback after delay', () => {
    const callback = vi.fn()
    setTimeout(callback, 1000)

    vi.advanceTimersByTime(1000)

    expect(callback).toHaveBeenCalled()
  })
})
```

## Coverage

### Running Coverage

```bash
npm run test:coverage
```

### Coverage Report

Reports are generated in `./coverage/`:

- `text` - Terminal output
- `html` - Browser viewable report
- `lcov` - For CI integration

### Coverage Thresholds

Current thresholds (70% minimum):

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Build will fail if thresholds aren't met.

## Best Practices

### DO

- Test behavior, not implementation
- Use meaningful test descriptions
- Keep tests focused and small
- Mock external dependencies
- Test edge cases and error states
- Use data-testid sparingly

### DON'T

- Test implementation details
- Have tests depend on each other
- Mock too much
- Write tests without assertions
- Ignore flaky tests

### Test Naming

```typescript
// Good - describes behavior
it('shows error message when submission fails', () => {})
it('disables button during loading', () => {})

// Bad - describes implementation
it('calls setState', () => {})
it('renders div', () => {})
```

### Queries Priority

1. `getByRole` - Accessible queries (preferred)
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Inputs
4. `getByText` - Non-interactive elements
5. `getByTestId` - Last resort

```typescript
// Preferred
screen.getByRole('button', { name: /submit/i })

// Avoid
screen.getByTestId('submit-button')
```

## Debugging Tests

### Verbose Output

```bash
npm run test -- --reporter=verbose
```

### Debug Mode

```typescript
import { screen } from '@testing-library/react'

// Print DOM state
screen.debug()

// Print specific element
screen.debug(screen.getByRole('button'))
```

### Async Debugging

```typescript
import { waitFor } from '@testing-library/react'

// Wait with custom timeout
await waitFor(
  () => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  },
  { timeout: 5000 },
)
```

## CI Integration

Tests run in CI pipeline:

```yaml
# GitHub Actions example
- name: Run Tests
  run: npm run test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```
