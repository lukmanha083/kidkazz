#!/usr/bin/env npx tsx
/**
 * Frontend Graph Generator (Hybrid Approach)
 *
 * Generates:
 * 1. FRONTEND_GRAPH.yaml - Index file with all apps and shared service connections
 * 2. apps/{app}/APP_GRAPH.yaml - Per-app detailed graphs
 *
 * Run: pnpm generate:frontend-graph
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

// ============================================================================
// TYPES
// ============================================================================

interface ServiceConnection {
  envVar: string;
  basePath: string;
  features: string[];
  realtime?: {
    protocol: string;
    events: string[];
  };
}

interface AppSummary {
  path: string;
  status: 'implemented' | 'planned';
  framework?: string;
  description: string;
  services: string[];
  graphFile?: string;
}

interface FrontendGraphIndex {
  generated: string;
  generator: string;
  description: string;
  apps: Record<string, AppSummary>;
  serviceConnections: Record<string, ServiceConnection>;
  sharedPatterns: {
    stateManagement: string;
    apiClient: string;
    realtime: string;
    formValidation: string;
    uiLibrary: string;
  };
  crossAppFlows: Record<string, {
    description: string;
    apps: string[];
    services: string[];
  }>;
  environmentVariables: Record<string, {
    description: string;
    required: boolean;
    example: string;
  }>;
}

interface RouteDefinition {
  path: string;
  file: string;
  layout?: boolean;
  services?: string[];
  queries?: string[];
  mutations?: string[];
  realtime?: boolean;
  components?: string[];
  description?: string;
}

interface QueryHook {
  file: string;
  service?: string;
  services?: string[];
  endpoint?: string;
  queryKey: string[];
  realtime?: boolean;
  description?: string;
}

interface MutationHook {
  file: string;
  service: string;
  endpoint: string;
  invalidates: string[][];
  optimisticUpdate?: boolean;
  triggerEvent?: string;
}

interface ComponentDef {
  file: string;
  services?: string[];
  features?: string[];
  dependencies?: string[];
  useCase?: string;
}

interface DataFlow {
  description: string;
  flow: Array<Record<string, unknown>>;
}

interface AppGraph {
  generated: string;
  generator: string;
  app: string;
  path: string;
  framework: {
    core: string;
    router: string;
    stateManagement: string;
    formLibrary: string;
    uiLibrary: string;
    styling: string;
    buildTool: string;
    testFramework: string;
  };
  docs: Record<string, string>;
  entryPoints: {
    main: string;
    apiClient: string;
    queryClient: string;
    routes: string;
  };
  services: {
    consumed: string[];
    connections: Record<string, { envVar: string; endpoints: string[] }>;
  };
  routes: Record<string, RouteDefinition>;
  queryHooks: Record<string, QueryHook>;
  mutationHooks: Record<string, MutationHook>;
  websocket?: {
    hook: string;
    config: Record<string, unknown>;
    messageHandlers: Record<string, { action: string; queryKeys: string[][] }>;
  };
  components: {
    layout: Record<string, ComponentDef>;
    dataTable: Record<string, ComponentDef>;
    columnDefinitions: Record<string, ComponentDef>;
    forms: Record<string, ComponentDef>;
    media: Record<string, ComponentDef>;
  };
  dataFlows: Record<string, DataFlow>;
  validation: {
    schemas: { file: string; library: string; list: string[] };
    asyncValidation: { file: string; validators: string[] };
  };
  testing: {
    framework: string;
    files: string[];
    scripts: Record<string, string>;
  };
  build: {
    tool: string;
    output: string;
    scripts: Record<string, string>;
  };
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Parse API client to extract service connections
 */
function parseServiceConnections(appDir: string): Record<string, { envVar: string; endpoints: string[] }> {
  const apiClientPath = path.join(appDir, 'src', 'lib', 'api.ts');
  if (!fs.existsSync(apiClientPath)) return {};

  const content = fs.readFileSync(apiClientPath, 'utf-8');
  const connections: Record<string, { envVar: string; endpoints: string[] }> = {};

  const servicePatterns = [
    { name: 'product-service', envVar: 'VITE_PRODUCT_SERVICE_URL', pattern: /PRODUCT_SERVICE_URL/ },
    { name: 'inventory-service', envVar: 'VITE_INVENTORY_SERVICE_URL', pattern: /INVENTORY_SERVICE_URL/ },
    { name: 'accounting-service', envVar: 'VITE_ACCOUNTING_SERVICE_URL', pattern: /ACCOUNTING_SERVICE_URL/ },
    { name: 'business-partner-service', envVar: 'VITE_BUSINESS_PARTNER_SERVICE_URL', pattern: /BUSINESS_PARTNER_SERVICE_URL/ },
  ];

  // Extract API endpoints
  const endpointPattern = /['"`](\/api\/[^'"`]+)['"`]/g;
  const endpoints: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = endpointPattern.exec(content)) !== null) {
    endpoints.push(match[1]);
  }

  for (const svc of servicePatterns) {
    if (svc.pattern.test(content)) {
      const svcEndpoints = endpoints.filter(ep => {
        if (svc.name === 'product-service') return ep.includes('/products') || ep.includes('/categories') || ep.includes('/variants') || ep.includes('/bundles') || ep.includes('/uoms') || ep.includes('/images') || ep.includes('/videos');
        if (svc.name === 'inventory-service') return ep.includes('/inventory') || ep.includes('/warehouses') || ep.includes('/batches');
        if (svc.name === 'accounting-service') return ep.includes('/accounts') || ep.includes('/journal') || ep.includes('/reports') || ep.includes('/fiscal');
        if (svc.name === 'business-partner-service') return ep.includes('/customers') || ep.includes('/suppliers') || ep.includes('/employees') || ep.includes('/addresses');
        return false;
      });

      connections[svc.name] = {
        envVar: svc.envVar,
        endpoints: [...new Set(svcEndpoints)].slice(0, 10), // Limit to 10 most common
      };
    }
  }

  return connections;
}

/**
 * Parse routes from TanStack Router file-based routing
 */
function parseRoutes(appDir: string): Record<string, RouteDefinition> {
  const routesDir = path.join(appDir, 'src', 'routes');
  if (!fs.existsSync(routesDir)) return {};

  const routes: Record<string, RouteDefinition> = {};

  function parseRouteFile(filePath: string): Partial<RouteDefinition> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: Partial<RouteDefinition> = {};

    // Detect layout
    if (content.includes('<Outlet') || content.includes('Outlet />')) {
      result.layout = true;
    }

    // Extract services
    const services: string[] = [];
    if (/useProduct|categoryApi|bundleApi|variantApi|uomApi/i.test(content)) services.push('product-service');
    if (/useInventory|useWarehouse|useBatch|warehouseApi|inventoryApi/i.test(content)) services.push('inventory-service');
    if (/useAccount|useJournal|accountApi|journalApi/i.test(content)) services.push('accounting-service');
    if (/useCustomer|useSupplier|useEmployee|customerApi|supplierApi/i.test(content)) services.push('business-partner-service');
    if (services.length > 0) result.services = [...new Set(services)];

    // Extract query hooks
    const queryPattern = /use(Products?|Inventory|Warehouses?|Batch|Categories?|Customers?|Suppliers?|Employees?|Accounts?|JournalEntr)/g;
    const queries: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = queryPattern.exec(content)) !== null) {
      queries.push(`use${match[1]}`);
    }
    if (queries.length > 0) result.queries = [...new Set(queries)];

    // Detect realtime
    if (content.includes('useWebSocket') || content.includes('realtime')) {
      result.realtime = true;
    }

    return result;
  }

  function scanRoutesDir(dir: string, basePath: string): void {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isFile() && item.name.endsWith('.tsx')) {
        const routeName = item.name.replace('.tsx', '');
        const relativePath = path.relative(appDir, fullPath);

        // Determine route path
        let routePath = basePath;
        if (routeName === 'index') {
          // Keep basePath
        } else if (routeName === '__root') {
          routePath = '/';
        } else if (routeName.startsWith('$')) {
          routePath = `${basePath}/:${routeName.slice(1)}`;
        } else {
          routePath = `${basePath}/${routeName}`;
        }

        const parsed = parseRouteFile(fullPath);
        const key = routeName === '__root' ? 'root' : relativePath.replace('src/routes/', '').replace('.tsx', '').replace(/\//g, '-');

        routes[key] = {
          path: routePath,
          file: relativePath,
          ...parsed,
        };
      } else if (item.isDirectory() && !item.name.startsWith('_')) {
        scanRoutesDir(fullPath, `${basePath}/${item.name}`);
      }
    }
  }

  scanRoutesDir(routesDir, '');
  return routes;
}

/**
 * Parse query hooks
 */
function parseQueryHooks(appDir: string): Record<string, QueryHook> {
  const hooksDir = path.join(appDir, 'src', 'hooks', 'queries');
  if (!fs.existsSync(hooksDir)) return {};

  const hooks: Record<string, QueryHook> = {};
  const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'));

  const serviceMap: Record<string, string> = {
    Products: 'product-service',
    Categories: 'product-service',
    Variants: 'product-service',
    Bundles: 'product-service',
    UOMs: 'product-service',
    Inventory: 'inventory-service',
    Warehouses: 'inventory-service',
    Batches: 'inventory-service',
    Customers: 'business-partner-service',
    Suppliers: 'business-partner-service',
    Employees: 'business-partner-service',
    Accounts: 'accounting-service',
    JournalEntries: 'accounting-service',
    Reports: 'accounting-service',
  };

  for (const file of files) {
    const content = fs.readFileSync(path.join(hooksDir, file), 'utf-8');
    const relativePath = `src/hooks/queries/${file}`;

    const hookPattern = /export\s+(?:const|function)\s+(use\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = hookPattern.exec(content)) !== null) {
      const hookName = match[1];
      let service: string | undefined;

      for (const [key, svc] of Object.entries(serviceMap)) {
        if (hookName.includes(key)) {
          service = svc;
          break;
        }
      }

      hooks[hookName] = {
        file: relativePath,
        ...(service && { service }),
        queryKey: [hookName.replace('use', '').toLowerCase()],
        ...(content.includes('useWebSocket') && { realtime: true }),
      };
    }
  }

  return hooks;
}

/**
 * Parse mutation hooks (basic extraction)
 */
function parseMutationHooks(appDir: string): Record<string, MutationHook> {
  const hooksDir = path.join(appDir, 'src', 'hooks', 'queries');
  if (!fs.existsSync(hooksDir)) return {};

  const mutations: Record<string, MutationHook> = {};
  const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'));

  const serviceMap: Record<string, string> = {
    Product: 'product-service',
    Category: 'product-service',
    Inventory: 'inventory-service',
    Warehouse: 'inventory-service',
    Batch: 'inventory-service',
    Customer: 'business-partner-service',
    Supplier: 'business-partner-service',
    Employee: 'business-partner-service',
    Account: 'accounting-service',
    JournalEntry: 'accounting-service',
  };

  for (const file of files) {
    const content = fs.readFileSync(path.join(hooksDir, file), 'utf-8');
    const relativePath = `src/hooks/queries/${file}`;

    // Match mutation hooks (useCreate*, useUpdate*, useDelete*)
    const mutationPattern = /export\s+(?:const|function)\s+(use(?:Create|Update|Delete|Adjust|Set|Post|Void|Block|Activate)\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = mutationPattern.exec(content)) !== null) {
      const hookName = match[1];
      let service = 'product-service';

      for (const [key, svc] of Object.entries(serviceMap)) {
        if (hookName.includes(key)) {
          service = svc;
          break;
        }
      }

      // Determine endpoint method
      let method = 'POST';
      if (hookName.includes('Update') || hookName.includes('Set')) method = 'PUT';
      if (hookName.includes('Delete')) method = 'DELETE';
      if (hookName.includes('Adjust')) method = 'PATCH';

      mutations[hookName] = {
        file: relativePath,
        service,
        endpoint: `${method} /api/...`,
        invalidates: [[hookName.replace(/use(Create|Update|Delete|Adjust|Set|Post|Void|Block|Activate)/, '').toLowerCase()]],
        optimisticUpdate: content.includes('onMutate'),
      };
    }
  }

  return mutations;
}

/**
 * Parse components
 */
function parseComponents(appDir: string): AppGraph['components'] {
  const components: AppGraph['components'] = {
    layout: {},
    dataTable: {},
    columnDefinitions: {},
    forms: {},
    media: {},
  };

  const dataTableDir = path.join(appDir, 'src', 'components', 'ui', 'data-table');
  if (fs.existsSync(dataTableDir)) {
    const files = fs.readdirSync(dataTableDir).filter(f => f.endsWith('.tsx') && !f.includes('.test.'));

    for (const file of files) {
      const name = file.replace('.tsx', '');
      const key = name.split('-').map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');

      if (name === 'data-table') {
        components.dataTable.DataTable = {
          file: `src/components/ui/data-table/${file}`,
          features: ['sorting', 'filtering', 'pagination', 'columnVisibility'],
          dependencies: ['@tanstack/react-table'],
        };
      } else if (name.includes('virtualized')) {
        components.dataTable.VirtualizedDataTable = {
          file: `src/components/ui/data-table/${file}`,
          features: ['virtualization', 'large-datasets'],
          dependencies: ['@tanstack/react-table', '@tanstack/react-virtual'],
        };
      } else if (!name.includes('column')) {
        components.dataTable[key.charAt(0).toUpperCase() + key.slice(1)] = {
          file: `src/components/ui/data-table/${file}`,
        };
      }
    }

    // Column definitions
    const columnsDir = path.join(dataTableDir, 'columns');
    if (fs.existsSync(columnsDir)) {
      const columnFiles = fs.readdirSync(columnsDir).filter(f => f.endsWith('.tsx') && !f.includes('.test.'));

      for (const file of columnFiles) {
        const name = file.replace('-columns.tsx', '').replace('.tsx', '');
        components.columnDefinitions[name] = {
          file: `src/components/ui/data-table/columns/${file}`,
        };
      }
    }
  }

  // Media components
  const componentsDir = path.join(appDir, 'src', 'components');
  const mediaFiles = ['ImageUpload.tsx', 'VideoUpload.tsx', 'DocumentUpload.tsx'];

  for (const file of mediaFiles) {
    if (fs.existsSync(path.join(componentsDir, file))) {
      const name = file.replace('.tsx', '');
      components.media[name] = {
        file: `src/components/${file}`,
      };
    }
  }

  return components;
}

/**
 * Find test files
 */
function findTestFiles(appDir: string): string[] {
  const testFiles: string[] = [];

  function findRecursive(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules')) {
        findRecursive(fullPath);
      } else if (item.name.includes('.test.') || item.name.includes('.spec.')) {
        testFiles.push(path.relative(appDir, fullPath));
      }
    }
  }

  findRecursive(path.join(appDir, 'src'));
  return testFiles;
}

/**
 * Get docs for a context
 */
function getContextDocs(contextName: string): Record<string, string> {
  const contextDir = path.join(DOCS_DIR, 'bounded-contexts', contextName);
  if (!fs.existsSync(contextDir)) return {};

  const docs: Record<string, string> = {};
  const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const key = file.replace('.md', '').toLowerCase().replace(/_/g, '-');
    docs[key] = `docs/bounded-contexts/${contextName}/${file}`;
  }

  return docs;
}

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generate the main FRONTEND_GRAPH.yaml index
 */
function generateFrontendIndex(): FrontendGraphIndex {
  const apps: Record<string, AppSummary> = {};

  // Scan apps directory
  if (fs.existsSync(APPS_DIR)) {
    const appDirs = fs.readdirSync(APPS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const dir of appDirs) {
      const appDir = path.join(APPS_DIR, dir.name);
      const packageJsonPath = path.join(appDir, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const services = Object.keys(parseServiceConnections(appDir));

        apps[dir.name] = {
          path: `apps/${dir.name}`,
          status: 'implemented',
          framework: 'React + TanStack Router + TanStack Query',
          description: packageJson.description || `${dir.name} application`,
          services,
          graphFile: `apps/${dir.name}/APP_GRAPH.yaml`,
        };
      }
    }
  }

  // Add planned apps
  const plannedApps: Record<string, { description: string; services: string[] }> = {
    pos: {
      description: 'Point of Sale application for retail transactions',
      services: ['product-service', 'inventory-service', 'business-partner-service', 'payment-service'],
    },
    website: {
      description: 'Customer-facing e-commerce website',
      services: ['product-service', 'inventory-service', 'business-partner-service', 'order-service'],
    },
    'mobile-app': {
      description: 'Mobile application (React Native/Expo)',
      services: ['product-service', 'inventory-service', 'business-partner-service', 'order-service'],
    },
  };

  for (const [name, info] of Object.entries(plannedApps)) {
    if (!apps[name]) {
      apps[name] = {
        path: `apps/${name}`,
        status: 'planned',
        description: info.description,
        services: info.services,
      };
    }
  }

  return {
    generated: 'auto',
    generator: 'scripts/generate-frontend-graph.ts',
    description: 'Frontend applications index and shared service connections',
    apps,
    serviceConnections: {
      'product-service': {
        envVar: 'VITE_PRODUCT_SERVICE_URL',
        basePath: '/api',
        features: ['products', 'categories', 'variants', 'uoms', 'bundles', 'images', 'videos'],
      },
      'inventory-service': {
        envVar: 'VITE_INVENTORY_SERVICE_URL',
        basePath: '/api',
        features: ['inventory', 'warehouses', 'batches', 'stock-movements', 'transfers'],
        realtime: {
          protocol: 'WebSocket',
          events: ['inventory_adjusted', 'inventory_updated', 'stock_low', 'warehouse_created', 'warehouse_updated', 'warehouse_deleted'],
        },
      },
      'accounting-service': {
        envVar: 'VITE_ACCOUNTING_SERVICE_URL',
        basePath: '/api',
        features: ['accounts', 'journal-entries', 'reports', 'fiscal-periods', 'assets', 'depreciation'],
      },
      'business-partner-service': {
        envVar: 'VITE_BUSINESS_PARTNER_SERVICE_URL',
        basePath: '/api',
        features: ['customers', 'suppliers', 'employees', 'addresses', 'documents'],
      },
      'order-service': {
        envVar: 'VITE_ORDER_SERVICE_URL',
        basePath: '/api',
        features: ['orders', 'order-items', 'order-status'],
      },
      'payment-service': {
        envVar: 'VITE_PAYMENT_SERVICE_URL',
        basePath: '/api',
        features: ['payments', 'refunds', 'payment-methods'],
      },
    },
    sharedPatterns: {
      stateManagement: 'TanStack Query (React Query) for server state',
      apiClient: 'Fetch-based API client with service URL switching',
      realtime: 'WebSocket with auto-reconnect and query invalidation',
      formValidation: 'TanStack Form + Zod schemas',
      uiLibrary: 'ShadCN UI (Radix Primitives) + Tailwind CSS',
    },
    crossAppFlows: {
      'product-lookup': {
        description: 'Scan barcode to lookup product across POS and ERP',
        apps: ['pos', 'erp-dashboard'],
        services: ['product-service', 'inventory-service'],
      },
      'inventory-sync': {
        description: 'Real-time inventory updates across all apps',
        apps: ['pos', 'erp-dashboard', 'website'],
        services: ['inventory-service'],
      },
      'customer-orders': {
        description: 'Customer places order, tracked across apps',
        apps: ['website', 'pos', 'erp-dashboard'],
        services: ['order-service', 'business-partner-service', 'inventory-service'],
      },
    },
    environmentVariables: {
      VITE_API_GATEWAY_URL: {
        description: 'API Gateway URL (deployed)',
        required: false,
        example: 'https://api-gateway.tesla-hakim.workers.dev',
      },
      VITE_ACCOUNTING_SERVICE_URL: {
        description: 'Accounting Service API URL (deployed)',
        required: true,
        example: 'https://accounting-service.tesla-hakim.workers.dev',
      },
      VITE_PRODUCT_SERVICE_URL: {
        description: 'Product Service API URL (deployed)',
        required: true,
        example: 'https://product-service.tesla-hakim.workers.dev',
      },
      VITE_INVENTORY_SERVICE_URL: {
        description: 'Inventory Service API URL (deployed)',
        required: true,
        example: 'https://inventory-service.tesla-hakim.workers.dev',
      },
      VITE_BUSINESS_PARTNER_SERVICE_URL: {
        description: 'Business Partner Service API URL (deployed)',
        required: true,
        example: 'https://business-partner-service.tesla-hakim.workers.dev',
      },
      VITE_ORDER_SERVICE_URL: {
        description: 'Order Service API URL (deployed)',
        required: true,
        example: 'https://order-service.tesla-hakim.workers.dev',
      },
      VITE_PAYMENT_SERVICE_URL: {
        description: 'Payment Service API URL (deployed)',
        required: true,
        example: 'https://payment-service.tesla-hakim.workers.dev',
      },
      VITE_SHIPPING_SERVICE_URL: {
        description: 'Shipping Service API URL (deployed)',
        required: false,
        example: 'https://shipping-service.tesla-hakim.workers.dev',
      },
      VITE_WEBSOCKET_URL: {
        description: 'WebSocket server URL for real-time updates (Inventory Service)',
        required: false,
        example: 'wss://inventory-service.tesla-hakim.workers.dev/ws',
      },
    },
  };
}

/**
 * Generate per-app APP_GRAPH.yaml
 */
function generateAppGraph(appName: string): AppGraph | null {
  const appDir = path.join(APPS_DIR, appName);
  if (!fs.existsSync(appDir)) return null;

  const packageJsonPath = path.join(appDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Extract versions
  const getVersion = (pkg: string): string => deps[pkg]?.replace(/[\^~]/, '') || 'unknown';

  const serviceConnections = parseServiceConnections(appDir);

  return {
    generated: 'auto',
    generator: 'scripts/generate-frontend-graph.ts',
    app: appName,
    path: `apps/${appName}`,
    framework: {
      core: `React ${getVersion('react')}`,
      router: `TanStack Router ${getVersion('@tanstack/react-router')}`,
      stateManagement: `TanStack Query ${getVersion('@tanstack/react-query')}`,
      formLibrary: `TanStack Form ${getVersion('@tanstack/react-form')}`,
      uiLibrary: 'ShadCN UI (Radix Primitives)',
      styling: `Tailwind CSS ${getVersion('tailwindcss')}`,
      buildTool: `Vite ${getVersion('vite')}`,
      testFramework: `Vitest ${getVersion('vitest')}`,
    },
    docs: {
      ...getContextDocs(appName),
      ...getContextDocs('frontend'),
      'ui-guidelines': 'docs/guides/UI_DESIGN_GUIDELINE.md',
    },
    entryPoints: {
      main: 'src/main.tsx',
      apiClient: 'src/lib/api.ts',
      queryClient: 'src/lib/query-client.ts',
      routes: 'src/routes/',
    },
    services: {
      consumed: Object.keys(serviceConnections),
      connections: serviceConnections,
    },
    routes: parseRoutes(appDir),
    queryHooks: parseQueryHooks(appDir),
    mutationHooks: parseMutationHooks(appDir),
    websocket: {
      hook: 'src/hooks/useWebSocket.ts',
      config: {
        autoReconnect: true,
        reconnectBackoff: [1000, 2000, 5000, 10000, 30000],
        heartbeat: 30000,
      },
      messageHandlers: {
        inventory_adjusted: { action: 'invalidateQueries', queryKeys: [['inventory'], ['products', 'stock']] },
        inventory_updated: { action: 'invalidateQueries', queryKeys: [['inventory']] },
        stock_low: { action: 'invalidateQueries', queryKeys: [['inventory', 'lowStock']] },
        warehouse_created: { action: 'invalidateQueries', queryKeys: [['warehouses']] },
        warehouse_updated: { action: 'invalidateQueries', queryKeys: [['warehouses']] },
        warehouse_deleted: { action: 'invalidateQueries', queryKeys: [['warehouses'], ['inventory']] },
      },
    },
    components: parseComponents(appDir),
    dataFlows: {
      'product-with-inventory': {
        description: 'Display product with stock from Inventory Service',
        flow: [
          { step: 'Mount ProductsPage' },
          { step: 'Call useProductsWithInventory hook' },
          { step: 'Fetch products from Product Service' },
          { step: 'Batch fetch stock from Inventory Service' },
          { step: 'Merge and render DataTable' },
        ],
      },
      'real-time-inventory': {
        description: 'Real-time inventory updates via WebSocket',
        flow: [
          { step: 'Connect WebSocket on mount' },
          { step: 'Receive inventory_adjusted event' },
          { step: 'Invalidate inventory queries' },
          { step: 'Auto-refetch updated data' },
        ],
      },
    },
    validation: {
      schemas: {
        file: 'src/lib/form-schemas.ts',
        library: `Zod ${getVersion('zod')}`,
        list: ['productFormSchema', 'categoryFormSchema', 'warehouseFormSchema', 'batchFormSchema', 'customerFormSchema', 'supplierFormSchema', 'employeeFormSchema'],
      },
      asyncValidation: {
        file: 'src/hooks/useAsyncValidation.ts',
        validators: ['skuUniqueness', 'codeUniqueness', 'barcodeUniqueness'],
      },
    },
    testing: {
      framework: `Vitest ${getVersion('vitest')}`,
      files: findTestFiles(appDir),
      scripts: {
        test: 'vitest',
        'test:ui': 'vitest --ui',
        'test:coverage': 'vitest --coverage',
      },
    },
    build: {
      tool: `Vite ${getVersion('vite')}`,
      output: 'dist',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
    },
  };
}

// ============================================================================
// YAML CONVERTER
// ============================================================================

function toYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) return 'null';

  if (typeof obj === 'string') {
    if (obj.includes(':') || obj.includes('#') || obj.includes('\n') || obj.startsWith(' ') || obj.includes('"')) {
      return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    if (obj.every(item => typeof item === 'string' || typeof item === 'number')) {
      return `[${obj.map(item => typeof item === 'string' && (item.includes(' ') || item.includes(':')) ? `"${item}"` : item).join(', ')}]`;
    }
    return obj.map(item => `\n${spaces}- ${toYaml(item, indent + 1).trimStart()}`).join('');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    return entries.map(([key, value]) => {
      const yamlValue = toYaml(value, indent + 1);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `\n${spaces}${key}:${yamlValue}`;
      }
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return `\n${spaces}${key}:${yamlValue}`;
      }
      return `\n${spaces}${key}: ${yamlValue}`;
    }).join('');
  }

  return String(obj);
}

// ============================================================================
// CLI
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);

  console.log('Generating Frontend Graphs (Hybrid)...\n');

  // Generate main index
  const indexGraph = generateFrontendIndex();
  const indexHeader = `# FRONTEND_GRAPH.yaml
# Auto-generated frontend applications index
#
# This file provides:
# - Index of all frontend applications
# - Shared service connections and environment variables
# - Cross-app data flows
# - Shared patterns and conventions
#
# For detailed per-app information, see: apps/{app}/APP_GRAPH.yaml
#
# Generator: ${indexGraph.generator}
#
# DO NOT EDIT MANUALLY - Run: pnpm generate:frontend-graph
`;

  const indexYaml = indexHeader + toYaml(indexGraph);
  const indexPath = path.join(ROOT_DIR, 'FRONTEND_GRAPH.yaml');

  // Validation mode
  if (args.includes('--validate')) {
    let hasErrors = false;

    if (fs.existsSync(indexPath)) {
      const existing = fs.readFileSync(indexPath, 'utf-8');
      if (existing !== indexYaml) {
        console.error('FRONTEND_GRAPH.yaml is out of date!');
        hasErrors = true;
      }
    } else {
      console.error('FRONTEND_GRAPH.yaml does not exist!');
      hasErrors = true;
    }

    // Check app graphs
    for (const appName of Object.keys(indexGraph.apps)) {
      const appGraph = generateAppGraph(appName);
      if (appGraph) {
        const appGraphPath = path.join(APPS_DIR, appName, 'APP_GRAPH.yaml');
        if (fs.existsSync(appGraphPath)) {
          const appHeader = `# APP_GRAPH.yaml - ${appName}
# Auto-generated application graph
#
# Generator: ${appGraph.generator}
#
# DO NOT EDIT MANUALLY - Run: pnpm generate:frontend-graph
`;
          const appYaml = appHeader + toYaml(appGraph);
          const existing = fs.readFileSync(appGraphPath, 'utf-8');
          if (existing !== appYaml) {
            console.error(`apps/${appName}/APP_GRAPH.yaml is out of date!`);
            hasErrors = true;
          }
        }
      }
    }

    if (hasErrors) {
      console.error('\nRun: pnpm generate:frontend-graph');
      process.exit(1);
    }

    console.log('All frontend graphs are up to date.');
    return;
  }

  // Generate and write files
  fs.writeFileSync(indexPath, indexYaml);
  console.log(`Generated: FRONTEND_GRAPH.yaml`);

  let appCount = 0;
  for (const appName of Object.keys(indexGraph.apps)) {
    const appGraph = generateAppGraph(appName);
    if (appGraph) {
      const appHeader = `# APP_GRAPH.yaml - ${appName}
# Auto-generated application graph
#
# This file maps:
# - Application framework and dependencies
# - Routes and their service connections
# - Query/mutation hooks
# - Components and data flows
#
# Generator: ${appGraph.generator}
#
# DO NOT EDIT MANUALLY - Run: pnpm generate:frontend-graph
`;
      const appYaml = appHeader + toYaml(appGraph);
      const appGraphPath = path.join(APPS_DIR, appName, 'APP_GRAPH.yaml');
      fs.writeFileSync(appGraphPath, appYaml);
      console.log(`Generated: apps/${appName}/APP_GRAPH.yaml`);
      appCount++;
    }
  }

  // Summary
  console.log(`\nSummary:`);
  console.log(`  - ${Object.keys(indexGraph.apps).length} apps indexed`);
  console.log(`  - ${appCount} APP_GRAPH.yaml files generated`);
  console.log(`  - ${Object.keys(indexGraph.serviceConnections).length} service connections`);
}

main();
