#!/usr/bin/env npx tsx
/**
 * Auto-update CLAUDE.md based on documentation changes
 *
 * This script scans the docs directory and updates CLAUDE.md with:
 * - Implementation phase status
 * - Key documentation references
 * - Architecture decisions
 *
 * Run: pnpm update:claude-md
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.join(import.meta.dirname, '..');
const CLAUDE_MD_PATH = path.join(ROOT_DIR, 'docs/CLAUDE.md');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

interface PhaseDoc {
  phase: number;
  title: string;
  status: 'Complete' | 'In Progress' | 'Pending';
  path: string;
}

interface BoundedContext {
  name: string;
  path: string;
  docCount: number;
  hasBusinessRules: boolean;
  hasArchitecture: boolean;
}

/**
 * Scan for implementation phase documents
 */
function scanImplementationPhases(): PhaseDoc[] {
  const phases: PhaseDoc[] = [];
  const implementationDir = path.join(DOCS_DIR, 'implementation');

  if (!fs.existsSync(implementationDir)) {
    return phases;
  }

  const files = fs.readdirSync(implementationDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const match = file.match(/PHASE_(\d+)/i);
    if (match) {
      const filePath = path.join(implementationDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract title from first H1
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

      // Determine status from content or file name
      let status: PhaseDoc['status'] = 'Pending';
      if (/\[x\].*complete|status:\s*complete/i.test(content)) {
        status = 'Complete';
      } else if (/\[\s\].*in progress|status:\s*in progress/i.test(content)) {
        status = 'In Progress';
      }

      phases.push({
        phase: parseInt(match[1], 10),
        title: title.replace(/^Phase\s+\d+:?\s*/i, '').trim(),
        status,
        path: `docs/implementation/${file}`,
      });
    }
  }

  return phases.sort((a, b) => a.phase - b.phase);
}

/**
 * Scan bounded contexts for documentation
 */
function scanBoundedContexts(): BoundedContext[] {
  const contexts: BoundedContext[] = [];
  const contextDir = path.join(DOCS_DIR, 'bounded-contexts');

  if (!fs.existsSync(contextDir)) {
    return contexts;
  }

  const dirs = fs.readdirSync(contextDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const dir of dirs) {
    const contextPath = path.join(contextDir, dir.name);
    const files = fs.readdirSync(contextPath).filter((f) => f.endsWith('.md'));

    contexts.push({
      name: dir.name.charAt(0).toUpperCase() + dir.name.slice(1),
      path: `docs/bounded-contexts/${dir.name}`,
      docCount: files.length,
      hasBusinessRules: files.some((f) => f.includes('BUSINESS_RULES')),
      hasArchitecture: files.some((f) => f.includes('ARCHITECTURE')),
    });
  }

  return contexts.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update the Project Status section in CLAUDE.md
 */
function updateProjectStatus(content: string, phases: PhaseDoc[]): string {
  if (phases.length === 0) {
    return content;
  }

  // Find the Project Status section
  const statusRegex = /(## Project Status\n\n\| Phase \| Description \| Status \|\n\|[-]+\|[-]+\|[-]+\|\n)([\s\S]*?)(\n---|\n\n\*\*Last Updated)/;

  const match = content.match(statusRegex);
  if (!match) {
    return content;
  }

  // Generate new table rows
  const tableRows = phases
    .map((p) => `| ${p.phase} | ${p.title} | ${p.status} |`)
    .join('\n');

  return content.replace(statusRegex, `$1${tableRows}$3`);
}

/**
 * Update the Key Documentation Links section
 */
function updateDocLinks(content: string, contexts: BoundedContext[]): string {
  // This could be extended to auto-update documentation links
  // For now, we just ensure the section exists
  return content;
}

/**
 * Update the Last Updated timestamp
 */
function updateTimestamp(content: string): string {
  const date = new Date().toISOString().split('T')[0];
  return content.replace(/\*\*Last Updated\*\*: [\d-]+/, `**Last Updated**: ${date}`);
}

/**
 * Main function
 */
async function main() {
  console.log('📝 Updating CLAUDE.md...');

  if (!fs.existsSync(CLAUDE_MD_PATH)) {
    console.error('❌ CLAUDE.md not found at:', CLAUDE_MD_PATH);
    process.exit(1);
  }

  let content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');

  // Scan documentation
  const phases = scanImplementationPhases();
  const contexts = scanBoundedContexts();

  console.log(`  Found ${phases.length} implementation phases`);
  console.log(`  Found ${contexts.length} bounded contexts`);

  // Update sections
  content = updateProjectStatus(content, phases);
  content = updateDocLinks(content, contexts);
  content = updateTimestamp(content);

  // Write back
  fs.writeFileSync(CLAUDE_MD_PATH, content);

  console.log('✅ CLAUDE.md updated successfully');

  // Print summary
  if (phases.length > 0) {
    console.log('\n📊 Phase Status:');
    for (const p of phases) {
      const icon = p.status === 'Complete' ? '✅' : p.status === 'In Progress' ? '🔄' : '⏳';
      console.log(`  ${icon} Phase ${p.phase}: ${p.title} (${p.status})`);
    }
  }

  if (contexts.length > 0) {
    console.log('\n📂 Bounded Contexts:');
    for (const c of contexts) {
      const rulesIcon = c.hasBusinessRules ? '📋' : '  ';
      const archIcon = c.hasArchitecture ? '🏗️' : '  ';
      console.log(`  ${rulesIcon}${archIcon} ${c.name}: ${c.docCount} docs`);
    }
  }
}

main().catch(console.error);
