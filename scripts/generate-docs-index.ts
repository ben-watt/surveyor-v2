/**
 * Documentation Index Generator
 *
 * Scans all .md files in docs/, parses YAML frontmatter, and generates
 * FEATURE_STATUS.md with tables grouped by category.
 *
 * Usage: npm run docs:index
 */

import * as fs from 'fs';
import * as path from 'path';

interface DocFrontmatter {
  title: string;
  status: 'implemented' | 'partial' | 'planned' | 'archived';
  category: string;
  created?: string;
  updated?: string;
  tags?: string[];
  related?: string[];
  priority?: 'high' | 'medium' | 'low';
}

interface DocEntry {
  filePath: string;
  relativePath: string;
  frontmatter: DocFrontmatter;
}

const DOCS_DIR = path.join(process.cwd(), 'docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'FEATURE_STATUS.md');

const CATEGORY_LABELS: Record<string, string> = {
  editor: 'Editor Features',
  configuration: 'Configuration Features',
  'images-media': 'Images & Media Features',
  reports: 'Reports Features',
  templates: 'Templates Features',
  'forms-survey': 'Forms & Survey Features',
  'data-validation': 'Data Validation Features',
  autosave: 'Autosave Features',
  auth: 'Auth Features',
  architecture: 'Architectural Plans',
};

const CATEGORY_EMOJI: Record<string, string> = {
  editor: '📝',
  configuration: '⚙️',
  'images-media': '🖼️',
  reports: '📊',
  templates: '📋',
  'forms-survey': '📝',
  'data-validation': '✅',
  autosave: '💾',
  auth: '🔐',
  architecture: '📐',
};

const STATUS_EMOJI: Record<string, string> = {
  implemented: '✅',
  partial: '🚧',
  planned: '📋',
  archived: '🗄️',
};

/**
 * Parses YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): DocFrontmatter | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatterText = frontmatterMatch[1];
  const frontmatter: Partial<DocFrontmatter> = {};

  // Parse YAML manually to avoid adding dependencies
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Handle arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      const items = arrayContent.split(',').map(item => {
        item = item.trim();
        if ((item.startsWith('"') && item.endsWith('"')) ||
            (item.startsWith("'") && item.endsWith("'"))) {
          item = item.slice(1, -1);
        }
        return item;
      }).filter(Boolean);
      (frontmatter as Record<string, unknown>)[key] = items;
    } else {
      (frontmatter as Record<string, unknown>)[key] = value;
    }
  }

  // Validate required fields
  if (!frontmatter.title || !frontmatter.status || !frontmatter.category) {
    return null;
  }

  return frontmatter as DocFrontmatter;
}

/**
 * Recursively finds all .md files in a directory
 */
function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Skip README files and the output file itself
      if (entry.name === 'README.md' || entry.name === 'FEATURE_STATUS.md') {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Generates the markdown content for FEATURE_STATUS.md
 */
function generateStatusMarkdown(docs: DocEntry[]): string {
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group by category
  const byCategory = new Map<string, DocEntry[]>();
  for (const doc of docs) {
    const category = doc.frontmatter.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(doc);
  }

  // Calculate stats
  const stats = {
    total: docs.length,
    implemented: docs.filter(d => d.frontmatter.status === 'implemented').length,
    partial: docs.filter(d => d.frontmatter.status === 'partial').length,
    planned: docs.filter(d => d.frontmatter.status === 'planned').length,
    archived: docs.filter(d => d.frontmatter.status === 'archived').length,
  };

  // Get priority items
  const highPriority = docs.filter(
    d => d.frontmatter.priority === 'high' &&
         (d.frontmatter.status === 'partial' || d.frontmatter.status === 'planned')
  );
  const mediumPriority = docs.filter(
    d => d.frontmatter.priority === 'medium' &&
         (d.frontmatter.status === 'partial' || d.frontmatter.status === 'planned')
  );

  let md = `# Feature Status Dashboard

**Last Updated**: ${now}
**Auto-generated** - Run \`npm run docs:index\` to refresh

This document tracks the implementation status of all features documented in the \`/docs\` folder.

---

## Status Legend

- ✅ **Implemented** - Feature is fully implemented and production-ready
- 🚧 **Partial** - Feature is partially implemented or in progress
- 📋 **Planned** - Feature is documented but not yet implemented
- 🗄️ **Archived** - Feature plan is obsolete or superseded

---

## Quick Stats

- **Total Features**: ${stats.total}
- **Implemented**: ${stats.implemented} (${Math.round((stats.implemented / stats.total) * 100)}%)
- **Partial**: ${stats.partial} (${Math.round((stats.partial / stats.total) * 100)}%)
- **Planned**: ${stats.planned} (${Math.round((stats.planned / stats.total) * 100)}%)
- **Archived**: ${stats.archived} (${Math.round((stats.archived / stats.total) * 100)}%)

---

## Feature Status by Category

`;

  // Sort categories by order of CATEGORY_LABELS
  const categoryOrder = Object.keys(CATEGORY_LABELS);
  const sortedCategories = Array.from(byCategory.keys()).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  for (const category of sortedCategories) {
    const categoryDocs = byCategory.get(category)!;
    const emoji = CATEGORY_EMOJI[category] || '📄';
    const label = CATEGORY_LABELS[category] || category;

    md += `### ${emoji} ${label}

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
`;

    // Sort by status (implemented first, then partial, then planned, archived last)
    const statusOrder = ['implemented', 'partial', 'planned', 'archived'];
    categoryDocs.sort((a, b) => {
      return statusOrder.indexOf(a.frontmatter.status) - statusOrder.indexOf(b.frontmatter.status);
    });

    for (const doc of categoryDocs) {
      const statusEmoji = STATUS_EMOJI[doc.frontmatter.status] || '';
      const statusLabel = doc.frontmatter.status.charAt(0).toUpperCase() + doc.frontmatter.status.slice(1);
      const priority = doc.frontmatter.priority || '-';
      const tags = doc.frontmatter.tags?.join(', ') || '-';

      md += `| ${doc.frontmatter.title} | ${statusEmoji} ${statusLabel} | [${path.basename(doc.relativePath)}](${doc.relativePath}) | ${priority} | ${tags} |\n`;
    }

    md += '\n';
  }

  // Priority sections
  if (highPriority.length > 0 || mediumPriority.length > 0) {
    md += `---

## Outstanding Work by Priority

`;

    if (highPriority.length > 0) {
      md += `### High Priority

`;
      for (const doc of highPriority) {
        const statusEmoji = STATUS_EMOJI[doc.frontmatter.status];
        md += `1. **${doc.frontmatter.title}** (${statusEmoji} ${doc.frontmatter.status})
   - [${path.basename(doc.relativePath)}](${doc.relativePath})
`;
      }
      md += '\n';
    }

    if (mediumPriority.length > 0) {
      md += `### Medium Priority

`;
      for (const doc of mediumPriority) {
        const statusEmoji = STATUS_EMOJI[doc.frontmatter.status];
        md += `1. **${doc.frontmatter.title}** (${statusEmoji} ${doc.frontmatter.status})
   - [${path.basename(doc.relativePath)}](${doc.relativePath})
`;
      }
      md += '\n';
    }
  }

  md += `---

## Notes

- This file is auto-generated from frontmatter in documentation files
- Run \`npm run docs:index\` to regenerate after adding or updating docs
- See [README.md](./README.md) for frontmatter schema and contribution guidelines
`;

  return md;
}

/**
 * Main function
 */
function main(): void {
  console.log('Scanning documentation files...');

  const files = findMarkdownFiles(DOCS_DIR);
  console.log(`Found ${files.length} markdown files`);

  const docs: DocEntry[] = [];
  const warnings: string[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const relativePath = './' + path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');

    if (!frontmatter) {
      warnings.push(`Missing or invalid frontmatter: ${relativePath}`);
      continue;
    }

    docs.push({
      filePath,
      relativePath,
      frontmatter,
    });
  }

  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const warning of warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  console.log(`\nProcessed ${docs.length} docs with valid frontmatter`);

  const markdown = generateStatusMarkdown(docs);
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

  console.log(`\nGenerated ${OUTPUT_FILE}`);
}

main();

