# Mobile App Development Guide - Expo + Cloudflare Workers

## Overview

This guide covers building native mobile apps (Android & iOS) using **Expo** (React Native) that integrate with the existing Cloudflare Workers backend.

---

## Why Expo?

✅ **Cross-Platform**: Write once, deploy to iOS and Android
✅ **Developer Experience**: Hot reload, easy debugging, fast iteration
✅ **Native Features**: Camera, location, push notifications out-of-the-box
✅ **No Native Code**: No need for Android Studio or Xcode for development
✅ **EAS Build**: Cloud build service for easy app store deployment
✅ **API Integration**: Works seamlessly with REST APIs (Cloudflare Workers)
✅ **TypeScript Support**: Full type safety from backend to mobile

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Mobile Applications                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌───────────────┐      ┌───────────────┐      │
│  │ Retail App    │      │ Wholesale App │      │
│  │ (Android/iOS) │      │ (Android/iOS) │      │
│  │    📱         │      │     📱        │      │
│  └───────┬───────┘      └───────┬───────┘      │
│          │                      │               │
│          └──────────┬───────────┘               │
│                     │                           │
│                     │ HTTPS/REST                │
│                     │                           │
│              ┌──────▼──────┐                    │
│              │ Cloudflare  │                    │
│              │  Workers    │                    │
│              │  (Hono API) │                    │
│              └──────┬──────┘                    │
│                     │                           │
│       ┌─────────────┼─────────────┐            │
│       │             │             │            │
│   ┌───▼───┐    ┌───▼──┐     ┌───▼──┐         │
│   │  D1   │    │  KV  │     │  R2  │         │
│   └───────┘    └──────┘     └──────┘         │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Technology Stack

### Mobile Apps
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **State Management**: Zustand or React Context
- **Data Fetching**: TanStack Query (React Query)
- **Navigation**: Expo Router
- **UI Components**: React Native Paper or NativeBase
- **Authentication**: JWT stored in expo-secure-store
- **Payment**: Xendit mobile SDK (for QRIS, VA)

### Backend (Already Built)
- Cloudflare Workers with Hono
- RESTful API endpoints
- JWT authentication
- Xendit payment integration

---

## Project Setup

### 1. Install Expo CLI

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Or use npx (recommended)
npx create-expo-app@latest
```

### 2. Create Mobile Apps

```bash
# Retail App
npx create-expo-app@latest retail-mobile-app --template tabs
cd retail-mobile-app

# Install dependencies
npx expo install expo-router expo-secure-store @tanstack/react-query

# Wholesale App
npx create-expo-app@latest wholesale-mobile-app --template tabs
cd wholesale-mobile-app
npx expo install expo-router expo-secure-store @tanstack/react-query
```

### 3. Project Structure

```
apps/
├── retail-mobile-app/          # Retail mobile app
│   ├── app/                    # Expo Router app directory
│   │   ├── (tabs)/            # Tab-based navigation
│   │   │   ├── index.tsx      # Home/Products
│   │   │   ├── cart.tsx       # Shopping cart
│   │   │   └── profile.tsx    # User profile
│   │   ├── product/[id].tsx   # Product details
│   │   ├── login.tsx          # Login screen
│   │   └── _layout.tsx        # Root layout
│   ├── components/            # Reusable components
│   ├── lib/                   # API client, utils
│   ├── app.json               # Expo config
│   └── package.json
│
├── wholesale-mobile-app/       # Wholesale mobile app
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # Catalog
│   │   │   ├── cart.tsx       # Cart with MOQ validation
│   │   │   ├── quotes.tsx     # RFQ management
│   │   │   └── profile.tsx    # Company profile
│   │   └── ...
│   └── ...
│
├── admin-dashboard/            # Web admin (already built)
├── backend/                    # Cloudflare Workers (already built)
└── ...
```

---

## API Integration

### 1. Create API Client

**`lib/api.ts`**
```typescript
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8787/api'  // Local development
  : 'https://api.yourdomain.com/api';  // Production

// Secure token storage
export const TokenStorage = {
  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('jwt_token');
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('jwt_token', token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync('jwt_token');
  },
};

// API client
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = await TokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async get<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: await this.getHeaders(includeAuth),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, logout user
        await TokenStorage.removeToken();
        throw new Error('Unauthorized');
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  }

  async post<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: await this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await TokenStorage.removeToken();
        throw new Error('Unauthorized');
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }
}

export const api = new ApiClient();
```

### 2. Use TanStack Query for Data Fetching

**`hooks/useProducts.ts`**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  retailPrice: number;  // For retail app
  // OR basePrice for wholesale app
  stockQuantity: number;
  images: Array<{ url: string; alt: string }>;
}

// Retail App
export function useRetailProducts() {
  return useQuery({
    queryKey: ['retail-products'],
    queryFn: () => api.get<{ products: Product[] }>('/retail/products'),
  });
}

// Wholesale App
export function useWholesaleProducts() {
  return useQuery({
    queryKey: ['wholesale-products'],
    queryFn: () => api.get<{ products: Product[] }>('/wholesale/products'),
  });
}

export function useProduct(id: string, isWholesale: boolean = false) {
  const endpoint = isWholesale
    ? `/wholesale/products/${id}`
    : `/retail/products/${id}`;

  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(endpoint),
  });
}
```

---

## Authentication

### 1. Login Screen

**`app/login.tsx`**
```typescript
import { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api, TokenStorage } from '@/lib/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post<{
        token: string;
        user: { role: string };
      }>('/auth/login', { email, password }, false);

      // Store JWT token
      await TokenStorage.setToken(response.token);

      // Check user role matches app type
      if (response.user.role === 'retail_buyer') {
        // Navigate to retail home
        router.replace('/(tabs)');
      } else if (response.user.role === 'wholesale_buyer') {
        // Navigate to wholesale home
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Invalid user type for this app');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}
```

### 2. Protected Routes

**`app/_layout.tsx`**
```typescript
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { TokenStorage } from '@/lib/api';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await TokenStorage.getToken();
    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      // Redirect to login
      router.replace('/login');
    } else if (token && inAuthGroup) {
      // Already logged in, redirect to home
      router.replace('/(tabs)');
    }
  };

  return <Slot />;
}
```

---

## Payment Integration (Xendit)

### 1. QRIS Payment

**`screens/CheckoutScreen.tsx`**
```typescript
import { useState } from 'react';
import { View, Button, Image } from 'react-native';
import { api } from '@/lib/api';

export function CheckoutScreen({ orderId, amount }) {
  const [qrCode, setQrCode] = useState<string | null>(null);

  const createQRISPayment = async () => {
    const response = await api.post('/payments/qris/create', {
      orderId,
      amount,
      currency: 'IDR',
    });

    // Display QR code
    setQrCode(response.payment.qr_string);
  };

  return (
    <View>
      <Button title="Pay with QRIS" onPress={createQRISPayment} />
      {qrCode && (
        <QRCode value={qrCode} size={250} />
      )}
    </View>
  );
}
```

### 2. Virtual Account Payment

```typescript
const createVAPayment = async (bankCode: string) => {
  const response = await api.post('/payments/virtual-account/create', {
    orderId,
    amount,
    currency: 'IDR',
    bankCode,  // 'BCA', 'MANDIRI', etc.
    customerName: user.name,
  });

  // Display VA number and bank details
  Alert.alert(
    'Virtual Account Created',
    `Bank: ${response.payment.bank_code}\nVA Number: ${response.payment.account_number}\nAmount: Rp ${response.payment.amount}`
  );
};
```

---

## Building and Deployment

### 1. Configure app.json

**`app.json`**
```json
{
  "expo": {
    "name": "Retail Store",
    "slug": "retail-store",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "package": "com.yourcompany.retail",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "CAMERA",
        "INTERNET"
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.retail",
      "buildNumber": "1.0.0",
      "supportsTablet": true
    },
    "extra": {
      "apiUrl": "https://api.yourdomain.com"
    }
  }
}
```

### 2. Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Build both platforms
eas build --platform all
```

### 3. Local Build (Android APK)

```bash
# Create local build
npx expo run:android --variant release

# Or use EAS local build
eas build --platform android --local
```

### 4. Submit to Google Play Store

```bash
# Submit to Play Store
eas submit --platform android

# Or manually upload APK/AAB from EAS dashboard
```

---

## Best Practices

### 1. Environment Variables

**`.env`**
```bash
API_BASE_URL=https://api.yourdomain.com
XENDIT_PUBLIC_KEY=xnd_public_...
```

**`app.config.js`**
```javascript
export default {
  expo: {
    extra: {
      apiUrl: process.env.API_BASE_URL,
      xenditPublicKey: process.env.XENDIT_PUBLIC_KEY,
    },
  },
};
```

### 2. Error Handling

```typescript
// Global error handler
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
    },
  },
});
```

### 3. Offline Support

```typescript
import NetInfo from '@react-native-community/netinfo';

// Check connectivity
const checkConnection = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    Alert.alert('No Internet', 'Please check your connection');
  }
};
```

### 4. Push Notifications

```bash
# Install Expo notifications
npx expo install expo-notifications

# Configure push tokens
import * as Notifications from 'expo-notifications';

const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync();
    // Send token to backend
    await api.post('/users/push-token', { token: token.data });
  }
};
```

---

## Development Workflow

### 1. Local Development

```bash
# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on physical device (scan QR code with Expo Go app)
npx expo start
```

### 2. Testing

```bash
# Install testing libraries
npm install --save-dev @testing-library/react-native jest

# Run tests
npm test
```

### 3. Debugging

```bash
# Open React DevTools
npx expo start --devtools

# View logs
npx expo start --clear
```

---

## App Features Checklist

### Retail App
- [ ] Product catalog with search & filters
- [ ] Product details with image gallery
- [ ] Shopping cart
- [ ] Checkout with QRIS/VA payment
- [ ] Order tracking
- [ ] User profile
- [ ] Push notifications for order updates
- [ ] Offline mode (cached products)

### Wholesale App
- [ ] Product catalog with bulk pricing display
- [ ] MOQ validation in cart
- [ ] Tiered pricing calculator
- [ ] Request for Quote (RFQ) system
- [ ] Company profile management
- [ ] Order history with invoices
- [ ] Payment via VA or Net-30 terms
- [ ] Bulk order management

---

## Performance Optimization

### 1. Image Optimization

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: product.imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

### 2. Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const ProductDetails = lazy(() => import('./screens/ProductDetails'));

<Suspense fallback={<Loading />}>
  <ProductDetails />
</Suspense>
```

### 3. Query Optimization

```typescript
// Prefetch data
queryClient.prefetchQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
});

// Pagination
useInfiniteQuery({
  queryKey: ['products'],
  queryFn: ({ pageParam = 1 }) => fetchProducts(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});
```

---

## Resources

### Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Expo Router](https://expo.github.io/router/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

### Tutorials
- [Expo Tutorial](https://docs.expo.dev/tutorial/introduction/)
- [React Native Tutorial](https://reactnative.dev/docs/tutorial)

### Community
- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://reactnative.dev/community/overview)

---

## Estimated Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup & Config | 1 week | Install Expo, configure projects, API integration |
| Retail App | 4 weeks | UI, product catalog, cart, checkout, payments |
| Wholesale App | 4 weeks | UI, bulk pricing, MOQ, RFQ system |
| Testing | 2 weeks | Unit tests, integration tests, user testing |
| Deployment | 1 week | Build, submit to Play Store/App Store |
| **Total** | **12 weeks** | Full mobile deployment |

---

**Last Updated:** January 2025
**Status:** Ready for Implementation (Final Phase)
**Priority:** Low (After Web Frontends)
