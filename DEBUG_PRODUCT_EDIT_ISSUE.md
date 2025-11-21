# 🔍 Debug Guide: Frontend Product Edit Not Persisting

## Issue Description
When editing a product from the admin dashboard frontend, changes don't persist to the database.

---

## ✅ What We Know

1. **Backend E2E test passes** - Product service is working correctly
2. **Frontend API client is configured correctly** - Points to `http://localhost:8788`
3. **Physical attributes added to schema** - Backend accepts weight, length, width, height
4. **Product update endpoint exists** - `PUT /api/products/:id` is implemented

---

## 🔧 Debugging Steps

### Step 1: Verify Product Service is Running

```bash
# Check if product service is running
curl http://localhost:8788/health

# Expected: {"status":"ok"}
```

If not running:
```bash
cd services/product-service
pnpm dev
```

### Step 2: Check Browser Console

Open admin dashboard and try to edit a product. Check browser console (F12) for:
- ❌ Network errors (CORS, 404, 500)
- ❌ JavaScript errors
- ⚠️ Request/response logs

### Step 3: Test Product Update API Directly

```bash
# Create a test product first
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-DEBUG-001",
    "name": "Test Product",
    "sku": "SKU-DEBUG-001",
    "price": 10000,
    "stock": 100
  }'

# Copy the product ID from response, then update it
curl -X PUT http://localhost:8788/api/products/PRODUCT_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "price": 15000
  }'

# Verify the update persisted
curl http://localhost:8788/api/products/PRODUCT_ID_HERE
```

**Expected**: Product should show updated values.

### Step 4: Check CORS Configuration

The product service must allow requests from the frontend origin.

Check `services/product-service/src/index.ts` for CORS middleware:

```typescript
import { cors } from 'hono/cors';

app.use('/*', cors({
  origin: '*', // Or specific frontend URL
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type'],
}));
```

### Step 5: Inspect Network Request

In browser DevTools (F12):
1. Go to **Network** tab
2. Try editing a product
3. Look for the `PUT /api/products/:id` request
4. Check:
   - ✅ Request URL (should be `http://localhost:8788/api/products/...`)
   - ✅ Request Method (should be `PUT`)
   - ✅ Request Payload (check if data is correct)
   - ✅ Response Status (200 = success, 4xx/5xx = error)
   - ✅ Response Body (should return updated product)

### Step 6: Check Frontend API Call

Find where the edit happens in the frontend:

```bash
# Search for product edit/update code
grep -r "productApi.update" apps/admin-dashboard/
```

Verify it's calling the correct endpoint:
```typescript
// Should look like this (from api.ts line 293-297)
update: async (id: string, data: Partial<CreateProductInput>): Promise<Product> => {
  return apiRequest(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
},
```

---

## 🔎 Common Issues & Solutions

### Issue 1: CORS Error

**Symptom**: Browser console shows:
```
Access to fetch at 'http://localhost:8788/api/products/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution**: Add CORS middleware to product service:
```bash
cd services/product-service
# Check if cors is imported in src/index.ts
# If not, add it
```

### Issue 2: Frontend Not Reloading Product Data

**Symptom**: API call succeeds but UI doesn't update

**Solution**: Frontend might be caching old data. After successful update:
- Fetch the product again
- Or update local state with response data

### Issue 3: Validation Error

**Symptom**: Response status 400 with validation error

**Solution**: Check request payload matches schema requirements
- Required fields: `barcode`, `name`, `sku`, `price`
- Optional fields must match expected types

### Issue 4: Service Not Restarted

**Symptom**: Changes to backend code don't take effect

**Solution**: Restart product service:
```bash
# Stop (Ctrl+C) and restart
cd services/product-service
pnpm dev
```

### Issue 5: Wrong Environment Variable

**Symptom**: Frontend calls wrong API endpoint

**Solution**: Check frontend `.env` file:
```bash
cd apps/admin-dashboard
cat .env

# Should have:
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
```

---

## 🧪 Quick Test Script

Create a file `test-product-update.js`:

```javascript
const PRODUCT_ID = 'YOUR_PRODUCT_ID_HERE'; // Replace with actual ID

async function testProductUpdate() {
  const API_URL = 'http://localhost:8788';

  // 1. Get current product
  console.log('1. Fetching product...');
  const getResponse = await fetch(`${API_URL}/api/products/${PRODUCT_ID}`);
  const currentProduct = await getResponse.json();
  console.log('Current product:', currentProduct);

  // 2. Update product
  console.log('\n2. Updating product...');
  const updateData = {
    name: currentProduct.name + ' (Updated)',
    price: currentProduct.price + 1000,
  };

  const updateResponse = await fetch(`${API_URL}/api/products/${PRODUCT_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  const updatedProduct = await updateResponse.json();
  console.log('Updated product:', updatedProduct);

  // 3. Verify update persisted
  console.log('\n3. Verifying update...');
  const verifyResponse = await fetch(`${API_URL}/api/products/${PRODUCT_ID}`);
  const verifiedProduct = await verifyResponse.json();
  console.log('Verified product:', verifiedProduct);

  // 4. Check if update worked
  if (verifiedProduct.name === updateData.name && verifiedProduct.price === updateData.price) {
    console.log('\n✅ UPDATE SUCCESSFUL! Product edit is persisting correctly.');
  } else {
    console.log('\n❌ UPDATE FAILED! Product edit did not persist.');
    console.log('Expected:', updateData);
    console.log('Got:', verifiedProduct);
  }
}

testProductUpdate().catch(console.error);
```

Run it:
```bash
node test-product-update.js
```

---

## 📊 Diagnosis Checklist

- [ ] Product service is running on port 8788
- [ ] Frontend is running and accessible
- [ ] Browser console shows no errors
- [ ] Network tab shows PUT request to correct URL
- [ ] Request payload is correctly formatted
- [ ] Response status is 200
- [ ] Response body contains updated product
- [ ] CORS headers are present
- [ ] Environment variables are correct
- [ ] Service has been restarted after schema changes

---

## 🆘 If Still Not Working

1. **Share the error**: Copy the exact error from browser console
2. **Check network request**: Screenshot the request/response in DevTools
3. **Test API directly**: Use the curl commands above
4. **Check database**: Verify if data is in the database:

```bash
cd services/product-service
npx wrangler d1 execute product-db --local \
  --command "SELECT * FROM products WHERE id = 'YOUR_PRODUCT_ID'"
```

---

## 💡 Most Likely Cause

Based on the symptoms, the most likely issues are:

1. **Service not restarted** - Product service needs restart to pick up schema changes
2. **CORS misconfiguration** - Frontend can't call backend API
3. **Frontend caching** - UI not refreshing after successful update

**Recommended First Step**: Restart both services and try again.
