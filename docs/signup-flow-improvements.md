# Sign-up Flow Improvements

## Current Issues Identified

### 1. Password Validation ("Rubbish password prompt thing")

**Issue**: Basic password field without proper validation or feedback
**Location**: `app/signup/page.tsx:134-145`

### 2. Authentication Token Issues ("NoValidAuthTokens: No federated jwt")

**Issue**: User gets stuck in limbo after sign-up confirmation with auth token problems
**Root Cause**: Missing proper auth state management and token handling after confirmation

### 3. Data Sync Problems ("Data not syncing")

**Issue**: New users can't access app functionality due to sync failures
**Root Cause**: Auth context not properly initialized before sync attempts

## Proposed Improvements

### 1. Enhanced Password Validation

**Implementation:**

- Add real-time password strength indicator
- Implement proper validation rules
- Show clear requirements and feedback

**Code Changes:**

```typescript
// In app/signup/page.tsx
const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
const [passwordRequirements, setPasswordRequirements] = useState({
  minLength: false,
  hasUpperCase: false,
  hasLowerCase: false,
  hasNumbers: false,
  hasSpecialChar: false,
});

const validatePassword = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  setPasswordRequirements(requirements);

  const score = Object.values(requirements).filter(Boolean).length;
  if (score < 3) setPasswordStrength('weak');
  else if (score < 5) setPasswordStrength('medium');
  else setPasswordStrength('strong');
};
```

### 2. Authentication State Management

**Problem**: The current flow doesn't properly handle the auth state transition after email confirmation.

**Solution**: Implement proper auth state management with loading states and error handling.

**Key Files to Modify:**

- `app/signup/page.tsx` - Add auth state handling
- `app/home/clients/Dexie.ts:75-109` - Fix auth initialization timing

**Implementation Strategy:**

```typescript
// Enhanced auth state management
const [authState, setAuthState] = useState<{
  isSigningUp: boolean;
  isConfirming: boolean;
  isSignedIn: boolean;
  hasValidTokens: boolean;
  error: string | null;
}>({
  isSigningUp: false,
  isConfirming: false,
  isSignedIn: false,
  hasValidTokens: false,
  error: null,
});

// After successful confirmation
const handleConfirmSignUp = async (e: React.FormEvent) => {
  try {
    await confirmSignUp({ username: email, confirmationCode });

    // Wait for auth tokens to be available
    await waitForAuthTokens();

    // Initialize tenant context before redirect
    await initializeTenantContext();

    router.push('/home/surveys');
  } catch (err) {
    // Handle specific auth errors
  }
};
```

### 3. Sync Engine Initialization

**Problem**: The sync engine tries to initialize before auth tokens are properly set.

**Location**: `app/home/clients/Dexie.ts:84-106`

**Current Issue:**

```typescript
const initialize = async () => {
  try {
    await getCurrentUser(); // This can fail with NoValidAuthTokens
    // ... rest of initialization
  } catch (error) {
    // Auth failure handling is too generic
  }
};
```

**Proposed Fix:**

```typescript
const initialize = async () => {
  try {
    // Add retry logic with exponential backoff
    const user = await retryWithBackoff(() => getCurrentUser(), 3);

    if (mounted) {
      setAuthReady(true);
      setAuthSuccess(true);

      // Ensure tenant ID is available before proceeding
      const tid = await getCurrentTenantId();
      if (!tid) {
        throw new Error('No tenant ID available after auth');
      }
      setTenantId(tid);
    }
  } catch (error) {
    console.error('Auth initialization failed:', error);
    if (mounted) {
      setAuthReady(true);
      setAuthSuccess(false);
      // Add specific error handling for different auth failure types
    }
  }
};
```

### 4. User Experience Improvements

**Loading States:**

- Add skeleton loaders during auth transitions
- Show progress indicators during sign-up process
- Clear messaging about what's happening at each step

**Error Handling:**

- Specific error messages for different failure types
- Recovery actions (resend code, try again, etc.)
- Better validation feedback

**Post Sign-up Flow:**

- Welcome wizard for new users
- Tenant selection if multiple tenants available
- Initial data sync with progress feedback

## Implementation Plan

### Phase 1: Password Validation (Low Risk)

1. Add password strength component
2. Implement validation rules
3. Add visual feedback
4. Test with various password inputs

### Phase 2: Auth State Management (Medium Risk)

1. Enhance auth state tracking in signup page
2. Add proper error boundaries
3. Implement retry logic for token acquisition
4. Add loading states and user feedback

### Phase 3: Sync Engine Fixes (High Risk)

1. Add retry logic to auth initialization
2. Implement proper error handling for different auth states
3. Add fallback mechanisms for sync failures
4. Test offline/online scenarios

### Phase 4: UX Polish (Low Risk)

1. Add skeleton loaders and progress indicators
2. Implement welcome flow for new users
3. Add error recovery mechanisms
4. Improve messaging throughout flow

## Key Files to Modify

1. **`app/signup/page.tsx`** - Main sign-up component

   - Add password validation
   - Enhance auth state management
   - Improve error handling

2. **`app/home/clients/Dexie.ts`** - Sync engine

   - Fix auth initialization timing
   - Add retry logic
   - Better error handling

3. **`amplify/auth/resource.ts`** - Auth configuration

   - Review password policy settings
   - Consider MFA settings
   - Validate user attributes

4. **New files to create:**
   - `components/ui/password-strength.tsx` - Password validation component
   - `app/welcome/page.tsx` - Welcome flow for new users
   - `hooks/useAuth.ts` - Centralized auth state management

## Testing Strategy

1. **Unit Tests:**

   - Password validation logic
   - Auth state transitions
   - Error handling scenarios

2. **Integration Tests:**

   - Complete sign-up flow
   - Auth token acquisition
   - Sync initialization

3. **E2E Tests:**
   - Full user journey from sign-up to first login
   - Network failure scenarios
   - Multiple browser/device testing

## Success Metrics

- Reduced sign-up abandonment rate
- Faster time to first successful login
- Fewer auth-related support tickets
- Improved user satisfaction scores

## Risks and Mitigation

**High Risk Areas:**

1. Changes to sync engine could affect existing users
2. Auth flow changes might break existing sessions

**Mitigation:**

1. Feature flags for gradual rollout
2. Comprehensive testing across different auth states
3. Rollback plan for each phase
4. Monitor error rates closely after deployment
