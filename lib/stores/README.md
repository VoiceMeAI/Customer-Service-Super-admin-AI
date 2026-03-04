# Auth Store Usage Guide

## How to Use the Auth Store

### Basic Usage in Components

```typescript
'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

export function MyComponent() {
  // Get state and actions from store
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  // Access state
  console.log(user?.email);
  console.log(isAuthenticated);

  // Update state
  const handleLogin = async () => {
    // After API call succeeds:
    setAuth(userData, tokenString);
  };

  const handleLogout = () => {
    clearAuth();
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### Initialize on App Load

In your root layout or app component:

```typescript
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function RootLayout({ children }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Sync token with axios on app load
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
```

### Select Specific State (Performance Optimization)

```typescript
// Only re-render when user changes (not when token changes)
const user = useAuthStore((state) => state.user);

// Only re-render when isAuthenticated changes
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
```
