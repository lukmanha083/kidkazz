#!/usr/bin/env npx tsx
/**
 * Service Graph Generator
 *
 * Generates SERVICE_GRAPH.yaml by parsing the codebase to extract:
 * - Service relationships and dependencies
 * - API endpoints (REST and tRPC)
 * - Entity definitions
 * - Documentation links
 * - Cross-service business flows
 *
 * Run: pnpm generate:service-graph
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const SERVICES_DIR = path.join(ROOT_DIR, 'services');
const APPS_DIR = path.join(ROOT_DIR, 'apps');

// ============================================================================
// TYPES
// ============================================================================

interface RestEndpoint {
  method: string;
  path: string;
  handler: string;
}

interface ServiceDependency {
  service: string;
  reason: string;
  docRef?: string;
}

interface EntityDef {
  name: string;
  file: string;
  schemaFile?: string;
}

interface BoundedContext {
  docs: Record<string, string>;
  service?: string;
  path?: string;
  status?: 'implemented' | 'planned';
  infrastructure?: {
    database?: string;
    storage?: string[];
  };
  entities?: EntityDef[];
  endpoints?: {
    rest?: RestEndpoint[];
    trpc?: string[];
  };
  consumes?: ServiceDependency[];
  // For frontend
  app?: string;
  framework?: string;
  apiClient?: string;
  pages?: Record<string, string>;
}

interface BusinessFlow {
  doc?: string;
  description: string;
  services: string[];
}

interface ServiceGraph {
  generated: string;
  generator: string;
  boundedContexts: Record<string, BoundedContext>;
  flows: Record<string, BusinessFlow>;
  docIndex: {
    byTopic: Record<string, string[]>;
    total: number;
  };
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Find all markdown docs in a directory
 */
function findDocs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const docs: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      docs.push(...findDocs(fullPath));
    } else if (item.name.endsWith('.md')) {
      docs.push(fullPath);
    }
  }

  return docs;
}

/**
 * Parse Hono routes to extract REST endpoints
 */
function parseHonoRoutes(serviceDir: string): RestEndpoint[] {
  const routesDir = path.join(serviceDir, 'src', 'routes');
  if (!fs.existsSync(routesDir)) {
    // Try alternative location
    const altRoutesDir = path.join(serviceDir, 'src', 'infrastructure', 'http', 'routes');
    if (!fs.existsSync(altRoutesDir)) return [];
    return parseRoutesDir(altRoutesDir);
  }
  return parseRoutesDir(routesDir);
}

function parseRoutesDir(routesDir: string): RestEndpoint[] {
  const endpoints: RestEndpoint[] = [];
  const routePattern = /\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(ROOT_DIR, filePath);

    let match: RegExpExecArray | null;
    while ((match = routePattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        handler: relativePath,
      });
    }
  }

  return endpoints;
}

/**
 * Parse tRPC routers to extract procedures
 */
function parseTrpcRouters(serviceDir: string): string[] {
  const trpcDir = path.join(serviceDir, 'src', 'infrastructure', 'trpc');
  if (!fs.existsSync(trpcDir)) return [];

  const procedures: string[] = [];
  const procedurePattern = /(\w+):\s*(?:publicProcedure|protectedProcedure)/g;

  const files = fs.readdirSync(trpcDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const filePath = path.join(trpcDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const routerName = file.replace('Router.ts', '').replace('.ts', '');

    let match: RegExpExecArray | null;
    while ((match = procedurePattern.exec(content)) !== null) {
      procedures.push(`${routerName}.${match[1]}`);
    }
  }

  return procedures;
}

/**
 * Parse entity files from domain layer
 */
function parseEntities(serviceDir: string): EntityDef[] {
  const entitiesDir = path.join(serviceDir, 'src', 'domain', 'entities');
  if (!fs.existsSync(entitiesDir)) return [];

  const entities: EntityDef[] = [];
  const files = fs.readdirSync(entitiesDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const name = file.replace('.ts', '').replace('.entity', '');
    // Convert to PascalCase
    const entityName = name
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    entities.push({
      name: entityName,
      file: `src/domain/entities/${file}`,
    });
  }

  return entities;
}

/**
 * Parse wrangler.jsonc for infrastructure config
 */
function parseWranglerConfig(serviceDir: string): { database?: string; storage?: string[] } {
  const wranglerPath = path.join(serviceDir, 'wrangler.jsonc');
  if (!fs.existsSync(wranglerPath)) return {};

  try {
    const content = fs.readFileSync(wranglerPath, 'utf-8');
    // Remove comments for JSON parsing
    const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const config = JSON.parse(jsonContent);

    const result: { database?: string; storage?: string[] } = {};

    if (config.d1_databases?.[0]) {
      result.database = `D1 (${config.d1_databases[0].database_name})`;
    }

    const storage: string[] = [];
    if (config.r2_buckets) {
      for (const bucket of config.r2_buckets) {
        storage.push(`R2 (${bucket.bucket_name})`);
      }
    }
    if (config.kv_namespaces) {
      for (const kv of config.kv_namespaces) {
        storage.push(`KV (${kv.binding})`);
      }
    }
    if (storage.length > 0) {
      result.storage = storage;
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Parse service dependencies from fetch calls and imports
 */
function parseServiceDependencies(serviceDir: string, serviceName: string): ServiceDependency[] {
  const deps: ServiceDependency[] = [];
  const srcDir = path.join(serviceDir, 'src');
  if (!fs.existsSync(srcDir)) return deps;

  // Known service mappings
  const servicePatterns: Record<string, { pattern: RegExp; reason: string }> = {
    'product-service': {
      pattern: /\/api\/products|product-service|PRODUCT_SERVICE/i,
      reason: 'Product data integration',
    },
    'inventory-service': {
      pattern: /\/api\/inventory|inventory-service|INVENTORY_SERVICE/i,
      reason: 'Stock management integration',
    },
    'business-partner-service': {
      pattern: /\/api\/(customers|suppliers|employees)|business-partner-service/i,
      reason: 'Business partner data integration',
    },
    'accounting-service': {
      pattern: /\/api\/accounting|accounting-service|ACCOUNTING_SERVICE/i,
      reason: 'Accounting integration',
    },
    'order-service': {
      pattern: /\/api\/orders|order-service|ORDER_SERVICE/i,
      reason: 'Order management integration',
    },
  };

  // Read all TS files and look for patterns
  const tsFiles = execSync(`find ${srcDir} -name "*.ts" 2>/dev/null || true`, { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  for (const file of tsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      for (const [targetService, { pattern, reason }] of Object.entries(servicePatterns)) {
        if (targetService !== serviceName && pattern.test(content)) {
          // Check if already added
          if (!deps.find((d) => d.service === targetService)) {
            deps.push({ service: targetService, reason });
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return deps;
}

/**
 * Get docs for a bounded context
 */
function getContextDocs(contextName: string): Record<string, string> {
  const contextDir = path.join(DOCS_DIR, 'bounded-contexts', contextName);
  if (!fs.existsSync(contextDir)) return {};

  const docs: Record<string, string> = {};
  const files = fs.readdirSync(contextDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const key = file
      .replace('.md', '')
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(`${contextName}-`, '')
      .replace(`${contextName.toUpperCase()}_`, '');

    docs[key] = `docs/bounded-contexts/${contextName}/${file}`;
  }

  return docs;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

function generateServiceGraph(): ServiceGraph {
  const graph: ServiceGraph = {
    generated: 'auto', // Use fixed value to prevent merge conflicts
    generator: 'scripts/generate-service-graph.ts',
    boundedContexts: {},
    flows: {},
    docIndex: {
      byTopic: {
        'business-rules': [],
        architecture: [],
        implementation: [],
        guides: [],
        testing: [],
      },
      total: 0,
    },
  };

  // ============================================================================
  // PARSE SERVICES
  // ============================================================================

  const serviceMap: Record<string, string> = {
    'business-partner-service': 'business-partner',
    'product-service': 'product',
    'inventory-service': 'inventory',
    'accounting-service': 'accounting',
    'order-service': 'order',
    'payment-service': 'payment',
    'shipping-service': 'shipping',
    'api-gateway': 'api-gateway',
  };

  if (fs.existsSync(SERVICES_DIR)) {
    const services = fs
      .readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const service of services) {
      const serviceName = service.name;
      const serviceDir = path.join(SERVICES_DIR, serviceName);
      const contextName = serviceMap[serviceName] || serviceName.replace('-service', '');

      const context: BoundedContext = {
        docs: getContextDocs(contextName),
        service: serviceName,
        path: `services/${serviceName}`,
        status: 'implemented',
        infrastructure: parseWranglerConfig(serviceDir),
        entities: parseEntities(serviceDir),
        endpoints: {
          rest: parseHonoRoutes(serviceDir),
          trpc: parseTrpcRouters(serviceDir),
        },
        consumes: parseServiceDependencies(serviceDir, serviceName),
      };

      // Clean up empty arrays
      if (context.endpoints?.rest?.length === 0) delete context.endpoints.rest;
      if (context.endpoints?.trpc?.length === 0) delete context.endpoints.trpc;
      if (Object.keys(context.endpoints || {}).length === 0) delete context.endpoints;
      if (context.entities?.length === 0) delete context.entities;
      if (context.consumes?.length === 0) delete context.consumes;

      graph.boundedContexts[contextName] = context;
    }
  }

  // ============================================================================
  // PARSE FRONTEND APPS
  // ============================================================================

  if (fs.existsSync(APPS_DIR)) {
    const apps = fs.readdirSync(APPS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

    for (const app of apps) {
      const appName = app.name;
      const appDir = path.join(APPS_DIR, appName);

      // Parse pages/routes
      const routesDir = path.join(appDir, 'src', 'routes');
      const pages: Record<string, string> = {};

      if (fs.existsSync(routesDir)) {
        const pageFiles = execSync(`find ${routesDir} -name "*.tsx" 2>/dev/null || true`, {
          encoding: 'utf-8',
        })
          .split('\n')
          .filter(Boolean);

        for (const pageFile of pageFiles) {
          const relativePath = path.relative(appDir, pageFile);
          const pageName = path
            .basename(pageFile, '.tsx')
            .replace(/\$.*/, '')
            .replace(/[_-]/g, ' ')
            .trim();
          if (pageName && pageName !== 'index' && !pageName.startsWith('_')) {
            pages[pageName] = relativePath;
          }
        }
      }

      // Check for API client
      const apiClientPath = path.join(appDir, 'src', 'lib', 'api.ts');
      const hasApiClient = fs.existsSync(apiClientPath);

      const context: BoundedContext = {
        docs: getContextDocs(appName),
        app: appName,
        path: `apps/${appName}`,
        framework: 'React + TanStack Router + TanStack Query',
        ...(hasApiClient && { apiClient: 'src/lib/api.ts' }),
        ...(Object.keys(pages).length > 0 && { pages }),
      };

      graph.boundedContexts[appName] = context;
    }
  }

  // ============================================================================
  // ADD PLANNED SERVICES (from docs)
  // ============================================================================

  const plannedContexts = [
    'sales',
    'procurement',
    'notification',
    'reporting',
    'hrm',
    'chatbot',
    'pos',
  ];

  for (const contextName of plannedContexts) {
    if (!graph.boundedContexts[contextName]) {
      const docs = getContextDocs(contextName);
      if (Object.keys(docs).length > 0) {
        graph.boundedContexts[contextName] = {
          docs,
          service: `${contextName}-service`,
          status: 'planned',
        };
      }
    }
  }

  // ============================================================================
  // BUSINESS FLOWS
  // ============================================================================

  graph.flows = {
    'create-sales-order': {
      doc: 'docs/bounded-contexts/sales/BUSINESS_RULES.md',
      description: 'Customer places order through any sales channel',
      services: [
        'erp-dashboard',
        'sales',
        'business-partner',
        'product',
        'inventory',
        'accounting',
      ],
    },
    'purchase-to-pay': {
      doc: 'docs/bounded-contexts/procurement/BUSINESS_RULES.md',
      description: 'Purchase order through to supplier payment',
      services: [
        'procurement',
        'business-partner',
        'product',
        'inventory',
        'accounting',
        'payment',
      ],
    },
    'stock-adjustment': {
      doc: 'docs/bounded-contexts/inventory/BUSINESS_RULES.md',
      description: 'Manual stock adjustment with journal entry',
      services: ['erp-dashboard', 'inventory', 'accounting'],
    },
    'product-deletion': {
      doc: 'docs/bounded-contexts/product/BUSINESS_RULES.md',
      description: 'Soft/hard delete product based on stock',
      services: ['erp-dashboard', 'product', 'inventory'],
    },
    'employee-onboarding': {
      doc: 'docs/bounded-contexts/business-partner/BUSINESS_RULES.md',
      description: 'Create employee with KTP upload',
      services: ['erp-dashboard', 'business-partner'],
    },
  };

  // ============================================================================
  // DOC INDEX
  // ============================================================================

  const allDocs = findDocs(DOCS_DIR);
  graph.docIndex.total = allDocs.length;

  for (const doc of allDocs) {
    const relativePath = path.relative(ROOT_DIR, doc);
    const fileName = path.basename(doc).toUpperCase();

    if (fileName.includes('BUSINESS_RULES')) {
      graph.docIndex.byTopic['business-rules'].push(relativePath);
    } else if (fileName.includes('ARCHITECTURE')) {
      graph.docIndex.byTopic.architecture.push(relativePath);
    } else if (fileName.includes('IMPLEMENTATION') || fileName.includes('PLAN')) {
      graph.docIndex.byTopic.implementation.push(relativePath);
    } else if (fileName.includes('GUIDE') || fileName.includes('TUTORIAL')) {
      graph.docIndex.byTopic.guides.push(relativePath);
    } else if (fileName.includes('TEST')) {
      graph.docIndex.byTopic.testing.push(relativePath);
    }
  }

  return graph;
}

/**
 * Convert graph to YAML format
 */
function toYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    // Quote strings with special characters
    if (obj.includes(':') || obj.includes('#') || obj.includes('\n') || obj.startsWith(' ')) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    // Check if simple array (strings/numbers)
    if (obj.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return `[${obj.map((item) => (typeof item === 'string' && item.includes(' ') ? `"${item}"` : item)).join(', ')}]`;
    }

    return obj.map((item) => `\n${spaces}- ${toYaml(item, indent + 1).trimStart()}`).join('');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    return entries
      .map(([key, value]) => {
        const yamlValue = toYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `\n${spaces}${key}:${yamlValue}`;
        }
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          return `\n${spaces}${key}:${yamlValue}`;
        }
        return `\n${spaces}${key}: ${yamlValue}`;
      })
      .join('');
  }

  return String(obj);
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const outputPath = path.join(ROOT_DIR, 'SERVICE_GRAPH.yaml');

  console.log('Generating SERVICE_GRAPH.yaml...\n');

  const graph = generateServiceGraph();

  // Generate YAML header (no timestamp to prevent merge conflicts)
  const header = `# SERVICE_GRAPH.yaml
# Auto-generated codebase knowledge graph
#
# This file maps:
# - Service relationships and dependencies
# - API endpoints (REST and tRPC)
# - Entity definitions
# - Documentation links
# - Cross-service business flows
#
# Generator: ${graph.generator}
#
# DO NOT EDIT MANUALLY - Run: pnpm generate:service-graph
`;

  const yaml = header + toYaml(graph);

  // Check for --validate flag
  if (args.includes('--validate')) {
    if (fs.existsSync(outputPath)) {
      const existing = fs.readFileSync(outputPath, 'utf-8');
      if (existing !== yaml) {
        console.error('SERVICE_GRAPH.yaml is out of date!');
        console.error('Run: pnpm generate:service-graph');
        process.exit(1);
      }
      console.log('SERVICE_GRAPH.yaml is up to date.');
      return;
    }
    console.error('SERVICE_GRAPH.yaml does not exist!');
    process.exit(1);
  }

  // Check for --diff flag
  if (args.includes('--diff')) {
    if (fs.existsSync(outputPath)) {
      const existing = fs.readFileSync(outputPath, 'utf-8');
      if (existing !== yaml) {
        console.log('Changes detected in SERVICE_GRAPH.yaml:');
        // Simple diff - show line counts
        const oldLines = existing.split('\n').length;
        const newLines = yaml.split('\n').length;
        console.log(
          `  Lines: ${oldLines} -> ${newLines} (${newLines - oldLines >= 0 ? '+' : ''}${newLines - oldLines})`
        );
      } else {
        console.log('No changes detected.');
      }
    }
    return;
  }

  // Write output
  fs.writeFileSync(outputPath, yaml);

  // Summary
  const contextCount = Object.keys(graph.boundedContexts).length;
  const flowCount = Object.keys(graph.flows).length;
  const docCount = graph.docIndex.total;

  console.log(`Generated SERVICE_GRAPH.yaml:`);
  console.log(`  - ${contextCount} bounded contexts`);
  console.log(`  - ${flowCount} business flows`);
  console.log(`  - ${docCount} documentation files indexed`);
  console.log(`\nOutput: ${outputPath}`);
}

main();
