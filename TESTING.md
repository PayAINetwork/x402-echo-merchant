# Testing

This project uses [Vitest](https://vitest.dev/) for testing.

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Test Structure

### Facilitator Routes (`src/app/api/facilitator/`)

- **verify** - Tests for payment verification endpoint
- **settle** - Tests for payment settlement endpoint
- **refund** - Tests for refund processing endpoint

### Paid Content Routes (`src/app/api/*/paid-content/`)

Tests are organized by network (base, polygon, avalanche, solana, etc.) and cover:

- Payment verification
- Content delivery
- HTML vs JSON responses
- Browser vs API client detection

### Library Tests (`src/lib/`)

- **paidContentHandler.test.ts** - Core handler logic for paid content delivery

## Test Coverage

The test suite covers:

- ✅ Successful payment flows
- ✅ Error handling
- ✅ Network failures
- ✅ Missing parameters
- ✅ Invalid input validation
- ✅ Content type negotiation (JSON vs HTML)
- ✅ User agent detection
- ✅ Refund flows

## Writing New Tests

When adding new routes or features:

1. Create a test file alongside the route: `route.test.ts`
2. Mock external dependencies (fetch, database, etc.)
3. Test both success and failure cases
4. Verify error handling and validation

Example:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

describe("/api/your-route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle successful requests", async () => {
    // Your test here
  });
});
```

## Mocking

The test suite uses Vitest's mocking capabilities:

- `vi.fn()` - Create mock functions
- `vi.mock()` - Mock entire modules
- `global.fetch` - Mocked globally for HTTP requests

## Environment Variables

Tests use mock environment variables. Update `vitest.setup.ts` if you need to configure default env vars for tests.
