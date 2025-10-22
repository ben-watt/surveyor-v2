# BlockEditor Enhancement Plan

## Executive Summary

This document outlines a comprehensive plan to transform the `BlockEditor` component from a functional but basic WYSIWYG editor into a robust, quick, and slick editing experience. The editor currently serves as the primary document editing interface for survey reports and other document types.

**Current State**: Functional editor with basic formatting, tables, images, and auto-save.

**Desired State**: Production-grade editor with advanced formatting, collaborative features, improved UX, and performance optimizations.

### 🚨 Critical Issues Identified

1. **Page Overflow Visibility**: No visual indication of page breaks or when content will overflow (A4 landscape format)
2. **Missing Typical House Diagram**: Standard diagram (`/typical-house.webp`) not insertable from editor
3. **Missing Location Plan Placeholder**: Location plan placeholder not available in editor UI

---

## Current Feature Inventory

### ✅ Implemented Features

#### Core Editing
- **Text Formatting**: Bold, italic, strikethrough, inline code
- **Headings**: H1-H6 support with dropdown selector
- **Text Alignment**: Left, center, right, justify (for both text and images)
- **Font Size**: Variable sizing (6-97pt) with increment/decrement controls
- **Lists**: Bullet lists and ordered lists
- **Blockquote & Code Blocks**: Basic support via StarterKit
- **Color**: Text color support (though not exposed in UI prominently)
- **Highlight**: Multi-color text highlighting with color picker (7 preset colors)

#### Advanced Features
- **Tables**: Resizable tables with contextual menu for row/column operations, cell merging/splitting
- **Images**: 
  - Drag & drop and paste support
  - S3 integration with automatic upload
  - Resizable with aspect ratio lock/unlock
  - Alignment controls
  - Loading states with skeleton
  - Custom node view with 4-corner resize handles
- **Table of Contents**: Automatic TOC generation with hierarchical indexing
- **Sections**: Custom section element support
- **File Handler**: Handles multiple image formats (PNG, JPEG, GIF, WebP)

#### Document Management
- **Auto-save**: 3-second debounced auto-save
- **Manual Save**: Explicit save button with loading state
- **Save Status Indicator**: Visual feedback (idle, saving, saved, error, autosaved)
- **Version History**: Hook for opening version history (UI exists elsewhere)
- **Print Preview**: Print functionality with separate preview mode
- **Undo/Redo**: Standard history management

#### Technical Architecture
- TipTap-based with React
- Forward ref for programmatic access
- Extension-based architecture
- Custom S3 image node view
- TOC repository system
- Proper TypeScript typing

---

## 🚀 Quick Wins (Low Effort, High Impact)

### 1. **Page Break Visualization** 🚨 CRITICAL
**Effort**: Medium | **Impact**: Very High | **Priority**: 🔥 URGENT

Add visual page break indicators so users can see when content will overflow to the next page.

**Problem**: 
- Reports use A4 landscape format (`@page { size: A4 landscape; }`)
- Users have no visual feedback about page boundaries while editing
- Content may overflow unexpectedly when printed
- Page component inserts `<hr />` but this doesn't show actual page dimensions

**Solution**:
Implement a page preview overlay system in the editor:

```typescript
// Add CSS to show page boundaries
.editor-page-break {
  position: relative;
  border-bottom: 2px dashed #3b82f6;
  margin: 20px 0;
  page-break-after: always;
}

.editor-page-break::after {
  content: 'Page Break';
  position: absolute;
  right: 0;
  bottom: -12px;
  font-size: 10px;
  color: #3b82f6;
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
}

// A4 Landscape dimensions: 297mm x 210mm (1123px x 794px at 96dpi)
.editor-content {
  min-height: 794px; /* A4 landscape height */
  position: relative;
}

.page-boundary-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 794px;
  border: 1px dashed #94a3b8;
  pointer-events: none;
  z-index: 1;
}
```

**Implementation Steps**:
1. Create a custom `PageBreak` extension for TipTap
2. Add visual indicators at 794px intervals (A4 landscape height)
3. Style `<hr />` elements to show as page breaks
4. Add toolbar button to insert explicit page breaks
5. Add toggle to show/hide page boundaries in editor
6. Calculate content height and show overflow warnings
7. Add page number indicators in margins

**UI Additions**:
- "Insert Page Break" button in toolbar
- Toggle "Show Page Boundaries" in view menu
- Page count indicator in status bar
- Warning when content near page boundary

---

### 2. **Survey-Specific Image Library** 🚨 CRITICAL
**Effort**: Low | **Impact**: High | **Priority**: 🔥 URGENT

Add quick insert for standard report images (typical house diagram, location plan placeholder).

**Problem**:
- Typical house diagram (`/typical-house.webp`, 800px width) is standard in reports but not easily insertable
- Location plan placeholder (600x400 SVG) is required but missing from editor UI
- Users have to manually insert these or edit outside the editor

**Solution**:
Create an "Insert Report Element" dropdown with predefined images:

```typescript
// Add to BlockMenuBar.tsx
const reportElements = [
  {
    label: 'Typical House Diagram',
    type: 'image',
    src: '/typical-house.webp',
    width: '800px',
    alt: 'typical house diagram',
  },
  {
    label: 'Location Plan Placeholder',
    type: 'image',
    src: "data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3Ctext x='300' y='200' font-family='Arial' font-size='24' fill='%23666666' text-anchor='middle' dominant-baseline='middle'%3ELocation Plan Placeholder%3C/text%3E%3C/svg%3E",
    width: '600px',
    height: '400px',
    alt: 'location plan placeholder',
  },
];

// Add toolbar button
{
  icon: <ImageIcon />,
  title: 'Insert Report Element',
  render: () => <ReportElementDropdown editor={editor} elements={reportElements} />,
}
```

**Implementation**:
1. Create `ReportElementDropdown` component
2. Add dropdown menu with standard report images
3. One-click insert for each element
4. Pre-configure proper dimensions and alt text
5. Add to toolbar between "Add Image" and divider

**Additional Elements to Consider**:
- Front elevation placeholder
- Money shot placeholder
- Signature placeholder (400x200)
- RICS logo
- CWBC header/footer images

---

### 3. **Page Layout Ruler/Guide** 🚨
**Effort**: Low | **Impact**: Medium

Add visual guides showing printable area and margins.

**Implementation**:
- Show A4 landscape canvas dimensions (1123px × 794px at 96dpi)
- Gray out non-printable margin areas
- Add subtle ruler marks at edges
- Toggle on/off in view menu

---

### 4. **Keyboard Shortcuts Overlay**
**Effort**: Low | **Impact**: High

Add a keyboard shortcuts helper (Cmd/Ctrl + / or ?) showing all available shortcuts.

**Implementation**:
- Add a modal/popover component
- Document all TipTap default shortcuts
- Add custom shortcuts for table operations, image insertion
- Add shortcut indicator to menu bar

**Benefits**:
- Dramatically improves UX for power users
- Reduces reliance on toolbar
- Industry standard feature

---

### 6. **Link Support**
**Effort**: Low | **Impact**: High

Currently missing entirely - this is a critical feature.

**Implementation**:
```typescript
import Link from '@tiptap/extension-link';

// Add to extensions array
Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    class: 'text-blue-600 underline cursor-pointer',
  },
})
```

**UI Additions**:
- Link button in toolbar (Chain icon)
- Floating bubble menu on link selection with edit/remove/open
- Cmd/Ctrl+K shortcut
- Auto-detection of URLs on paste

---

### 7. **Placeholder Extension**
**Effort**: Low | **Impact**: Medium

Add helpful placeholder text when editor is empty.

**Implementation**:
```typescript
import Placeholder from '@tiptap/extension-placeholder';

Placeholder.configure({
  placeholder: 'Start typing your document...',
  showOnlyWhenEditable: true,
})
```

---

### 8. **Text Color Picker**
**Effort**: Low | **Impact**: Medium

Color extension is loaded but not exposed in UI.

**Implementation**:
- Add color picker button similar to highlight color picker
- Reuse HighlightColorPicker pattern but for text color
- Add "remove color" option

---

### 9. **Floating Bubble Menu**
**Effort**: Low | **Impact**: High

Add contextual formatting menu that appears when text is selected.

**Implementation**:
```typescript
import { BubbleMenu } from '@tiptap/react';

// Add in BlockEditor return:
<BubbleMenu editor={editor}>
  // Bold, Italic, Link, Highlight buttons
</BubbleMenu>
```

**Benefits**:
- Cleaner, more modern UX (Google Docs, Notion-style)
- Reduces toolbar clutter
- Context-aware actions

---

### 10. **Slash Commands**
**Effort**: Medium | **Impact**: Very High

Add "/" command palette for quick block insertion.

**Implementation**:
- Use `@tiptap-pro/extension-slash-commands` or build custom
- Trigger on "/" key
- Show filterable list: "Table", "Image", "Code Block", "Heading 1-6", "Typical House", "Location Plan", etc.
- Navigate with arrow keys, select with Enter

**Benefits**:
- Modern, intuitive UX (Notion, Coda, Linear-style)
- Significantly faster content creation
- Reduces need to reach for toolbar
- Can include report-specific elements

---

### 11. **Focus Mode**
**Effort**: Low | **Impact**: Medium

Add full-screen/distraction-free mode.

**Implementation**:
- Toggle button in toolbar
- Hide toolbar except on hover
- Expand editor to full viewport
- Darken/blur surrounding UI

---

### 12. **Character & Word Count**
**Effort**: Low | **Impact**: Low

Add live character/word count to status bar.

**Implementation**:
```typescript
import { CharacterCount } from '@tiptap/extension-character-count';

// Display in status area next to save status
```

---

### 13. **Improved Table UX**
**Effort**: Low | **Impact**: Medium

Current table controls are functional but could be better.

**Improvements**:
- Add visual hover highlights for rows/columns
- Add + buttons in gutters for quick row/column insertion
- Floating menu for table operations (instead of always-visible context menu)
- Add "Insert row above" option
- Add column width resize handles
- Add table header row toggle
- Add table border style options

---

### 14. **Underline Support**
**Effort**: Very Low | **Impact**: Low

Common formatting option that's missing.

**Implementation**:
```typescript
import Underline from '@tiptap/extension-underline';

// Add to extensions and toolbar
```

---

## 🎯 Medium-Term Improvements (Medium Effort, High Impact)

### 15. **Superscript & Subscript**
**Effort**: Low | **Impact**: Medium

Important for scientific/technical documents.

**Implementation**:
```typescript
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
```

---

### 16. **Image Enhancements**
**Effort**: Medium | **Impact**: Medium

Current image support is good, but could be better.

**Additions**:
- **Caption support**: Add editable caption below images
- **Alt text editor**: Accessibility - edit alt text in UI
- **Image toolbar**: Floating toolbar on image selection with replace/delete/align
- **Multiple image formats**: Support SVG
- **Image gallery**: Insert multiple images at once
- **Image compression**: Auto-compress on upload to reduce file size
- **Crop/rotate**: Basic image editing in-editor

---

### 17. **Smart Paste**
**Effort**: Medium | **Impact**: High

Improve paste behavior from various sources.

**Features**:
- Preserve formatting from Word/Google Docs intelligently
- Clean up excessive styling
- Smart table paste (from Excel/Sheets)
- Markdown paste support
- URL → embedded content (future enhancement)

**Implementation**:
- Use `@tiptap-pro/extension-paste-transformer` or custom
- Add paste options (keep formatting, plain text, match style)

---

### 18. **Collaboration Cursor & Presence**
**Effort**: High | **Impact**: Very High (if collaborative editing is a goal)

Show other users' cursors and selections.

**Implementation**:
- Requires Yjs or similar CRDT library
- Add `@tiptap/extension-collaboration`
- Add `@tiptap/extension-collaboration-cursor`
- Integrate with WebSocket backend

**Note**: This is a significant architectural change - see Long-term section.

---

### 19. **Task Lists**
**Effort**: Low | **Impact**: Medium

Interactive checkboxes for task management.

**Implementation**:
```typescript
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
```

**Use Cases**:
- Inspection checklists
- Document review tasks
- Report approval workflows

---

### 20. **Find & Replace**
**Effort**: Medium | **Impact**: High

Critical for large documents.

**Implementation**:
- Use `@sereneinserenade/tiptap-search-and-replace` or build custom
- Cmd/Ctrl+F to open find panel
- Case sensitive toggle
- Regex support
- Highlight all matches
- Navigate between matches

---

### 21. **Horizontal Rule / Divider**
**Effort**: Very Low | **Impact**: Low

Visual separator between sections.

**Note**: StarterKit includes this - just needs to be added to toolbar.

---

### 22. **Text Indent / Outdent**
**Effort**: Low | **Impact**: Medium

Useful for nested content and paragraphs.

**Implementation**:
```typescript
import { TextIndent } from '@tiptap-pro/extension-text-indent';
```

---

### 23. **Comment System**
**Effort**: High | **Impact**: High

Annotations and feedback on specific text ranges.

**Implementation**:
- Use marks for comment anchors
- Store comments separately in database
- UI for adding/viewing/resolving comments
- Thread support for replies

**Use Cases**:
- Document review
- Feedback from clients
- Internal collaboration

---

### 24. **Template Variables / Mail Merge**
**Effort**: Medium | **Impact**: High (for survey reports)

Insert dynamic placeholders that get replaced with data.

**Implementation**:
- Custom extension for `{{variableName}}` syntax
- Autocomplete suggestions for available variables
- Preview mode showing replaced values
- Integration with survey data

**Examples**:
- `{{clientName}}`
- `{{propertyAddress}}`
- `{{inspectionDate}}`

---

## 🔮 Long-Term / Strategic Changes (High Effort, High Impact)

### 25. **Real-Time Collaborative Editing**
**Effort**: Very High | **Impact**: Very High

Multiple users editing simultaneously.

**Requirements**:
- **Backend**: WebSocket server (AWS AppSync, Pusher, Socket.io, or custom)
- **CRDT Library**: Yjs (recommended) or Automerge
- **Conflict Resolution**: Automatic via CRDT
- **Persistence**: Sync to database periodically
- **Presence**: Show active users
- **Cursor Tracking**: Show where others are typing

**Implementation Path**:
1. Set up Yjs provider (y-websocket or y-webrtc)
2. Add `@tiptap/extension-collaboration`
3. Implement backend synchronization
4. Add user awareness/presence
5. Handle offline/online transitions
6. Version history integration

**Considerations**:
- Significantly changes save model (continuous sync vs. manual/auto-save)
- Requires infrastructure investment
- May conflict with current version history approach

---

### 26. **Block-Based Architecture (Notion-style)**
**Effort**: Very High | **Impact**: Very High

Transform from document-based to block-based editing.

**Features**:
- Each block is independently draggable
- Hover to show block handle
- Drag to reorder
- Convert block types
- Nest blocks
- Block-level comments
- Per-block undo/redo

**Implementation**:
- Use `@tiptap-pro/extension-drag-handle`
- Use `@tiptap-pro/extension-drag-handle-react`
- Restructure data model

**Benefits**:
- More intuitive content manipulation
- Better mobile experience
- Enables block-level permissions/locking

**Drawbacks**:
- Large refactor
- May complicate print layouts
- Changes data model significantly

---

### 27. **AI Writing Assistant**
**Effort**: High | **Impact**: Very High

AI-powered content generation and editing.

**Features**:
- **Autocomplete**: Suggest next sentence/paragraph
- **Rewrite**: Improve selected text
- **Summarize**: Condense sections
- **Expand**: Add detail to brief text
- **Tone adjustment**: Make formal/casual/technical
- **Grammar check**: Real-time corrections
- **Smart templates**: Generate report sections from survey data

**Implementation**:
- Integrate OpenAI API or similar
- Add command palette for AI actions
- Streaming responses for real-time feel
- Context-aware suggestions based on document type

**Use Cases**:
- Speed up report writing
- Standardize language
- Generate boilerplate sections
- Quality improvements

---

### 28. **Version Diffing & Branching**
**Effort**: High | **Impact**: Medium

Enhanced version control features.

**Features**:
- Visual diff view between versions
- Side-by-side comparison
- Merge conflicts resolution
- Branch-like document variants
- Named snapshots

---

### 29. **Advanced Table Features**
**Effort**: Medium-High | **Impact**: Medium

Excel-like table capabilities.

**Features**:
- Cell formulas
- Sorting columns
- Filtering rows
- Cell data validation
- Conditional formatting
- Freeze header rows
- Export to CSV/Excel

---

### 30. **Custom Components / Embeds**
**Effort**: High | **Impact**: High

Embed rich, interactive content blocks.

**Examples**:
- Survey data tables (live-updating)
- Image galleries/carousels
- Charts/graphs
- Maps (for property locations)
- Videos
- PDFs
- 3D models (for construction)
- Embedded forms

**Implementation**:
- Create custom NodeView for each type
- Add insert menu
- Store embed configuration as node attributes

---

### 31. **Offline Mode**
**Effort**: Medium | **Impact**: Medium

Work without internet connection.

**Requirements**:
- Service worker for offline asset caching
- IndexedDB for document storage
- Sync queue for pending saves
- Conflict resolution on reconnect

**Benefits**:
- Essential for field work (surveyors on-site)
- Better UX in unreliable connectivity

---

### 32. **Export Formats**
**Effort**: Medium | **Impact**: Medium

Export documents in multiple formats.

**Formats**:
- **PDF**: High-quality with exact layout (current print approach)
- **Word (.docx)**: Preserve formatting
- **Markdown**: Plain text with formatting syntax
- **HTML**: Standalone HTML file
- **Plain text**: Strip all formatting

**Implementation**:
- PDF: Current approach (print to PDF) works
- Word: Use libraries like `html-docx-js` or backend generation
- Markdown: Custom serializer
- HTML: TipTap's built-in getHTML()

---

## ⚡ Performance & UX Improvements

### 33. **Lazy Loading for Large Documents**
**Effort**: Medium | **Impact**: High

Virtual scrolling for documents with thousands of nodes.

**Problem**: Current editor may slow down with very large documents.

**Solution**:
- Implement virtual scrolling
- Render only visible portions
- Paginate content internally

---

### 34. **Optimistic UI Updates**
**Effort**: Low | **Impact**: Medium

Show changes immediately, sync in background.

**Current**: Some operations may feel laggy waiting for state updates.

**Improvement**:
- Apply changes immediately to editor
- Show subtle indicators for syncing state
- Rollback on errors

---

### 35. **Improved Mobile Experience**
**Effort**: Medium | **Impact**: Medium

Touch-friendly editing.

**Improvements**:
- Larger touch targets for buttons
- Mobile-optimized toolbar (collapsible)
- Touch gestures for selection
- Mobile keyboard shortcuts
- Responsive table editing

---

### 36. **Accessibility (a11y) Enhancements**
**Effort**: Medium | **Impact**: High

Ensure editor is usable by everyone.

**Improvements**:
- Full keyboard navigation
- Screen reader announcements
- ARIA labels on all controls
- Focus indicators
- High contrast mode support
- Configurable font sizes

**Current State**: Some a11y already present (aria-labels on images), but comprehensive audit needed.

---

### 37. **Theming & Customization**
**Effort**: Low-Medium | **Impact**: Low

Allow appearance customization.

**Features**:
- Dark mode support
- Custom color schemes
- Font family selection
- Toolbar customization

---

### 38. **Animation & Transitions**
**Effort**: Low | **Impact**: Low

Polish with subtle animations.

**Examples**:
- Smooth menu transitions
- Fade-in for floating menus
- Highlight new content briefly
- Smooth scroll to selections

---

## 🧹 Technical Debt & Code Quality

### 39. **Extension Organization**
**Effort**: Low | **Impact**: Low

**Current**: Extensions scattered across TipTapExtensions folder.

**Improvement**:
- Consolidate related extensions
- Create index files for easier imports
- Document each custom extension
- Add unit tests for custom extensions

---

### 40. **TypeScript Improvements**
**Effort**: Low | **Impact**: Low

**Issues**:
- Some `any` types (e.g., in S3ImageNodeView props)
- Missing type definitions for custom attributes

**Improvements**:
- Strict typing for all custom extensions
- Type-safe attribute definitions
- Remove all `any` types

---

### 41. **Error Handling**
**Effort**: Medium | **Impact**: Medium

**Current**: Basic error handling for image uploads.

**Improvements**:
- Comprehensive error boundaries
- User-friendly error messages
- Retry logic for failed operations
- Fallback UI for broken nodes
- Logging/telemetry for errors

---

### 42. **Testing**
**Effort**: High | **Impact**: High

**Current**: No tests visible for BlockEditor.

**Add**:
- Unit tests for custom extensions
- Integration tests for editor workflows
- Accessibility tests
- Visual regression tests
- Performance benchmarks

---

### 43. **Documentation**
**Effort**: Low | **Impact**: Medium

**Add**:
- Developer guide for extending editor
- User guide for keyboard shortcuts
- Architecture documentation
- API reference for custom extensions

---

### 44. **Performance Monitoring**
**Effort**: Low | **Impact**: Medium

Add metrics to identify bottlenecks.

**Metrics**:
- Time to first render
- Input latency
- Save operation duration
- Memory usage for large documents
- Extension initialization time

---

## 🗺️ Implementation Roadmap

### Phase 0: Critical Issues (1-2 weeks) 🚨 URGENT
**Goal**: Address blocking usability issues for report generation

- [ ] **Page Break Visualization (#1)** - Visual page boundaries for A4 landscape
- [ ] **Survey Image Library (#2)** - Quick insert typical house diagram & location plan
- [ ] **Page Layout Guides (#3)** - Show printable area margins

**Expected Impact**: Users can confidently edit reports without unexpected overflow issues.

---

### Phase 1: Quick Wins (2-3 weeks)
**Goal**: Immediately improve UX with minimal effort

- [ ] Add Link support (#6)
- [ ] Add Underline support (#14)
- [ ] Add Placeholder (#7)
- [ ] Add Text Color Picker (#8)
- [ ] Expose Horizontal Rule in toolbar (#21)
- [ ] Add Keyboard Shortcuts Overlay (#4)
- [ ] Add Character/Word Count (#12)
- [ ] Add Floating Bubble Menu (#9)

**Expected Impact**: Editor feels significantly more complete and professional.

---

### Phase 2: Core Features (4-6 weeks)
**Goal**: Add essential missing features

- [ ] Slash Commands (#10)
- [ ] Find & Replace (#20)
- [ ] Focus Mode (#11)
- [ ] Superscript/Subscript (#15)
- [ ] Task Lists (#19)
- [ ] Smart Paste improvements (#17)
- [ ] Improved Table UX (#13)
- [ ] Text Indent/Outdent (#22)

**Expected Impact**: Editor matches feature parity with industry-standard editors.

---

### Phase 3: Advanced Features (6-8 weeks)
**Goal**: Differentiate with powerful features

- [ ] Image Enhancements (#16)
- [ ] Template Variables (#24)
- [ ] Comment System (#23)
- [ ] Export Formats (#32)
- [ ] Offline Mode (#31)
- [ ] Mobile Experience improvements (#35)
- [ ] Accessibility audit and fixes (#36)

**Expected Impact**: Editor becomes a competitive advantage.

---

### Phase 4: Strategic (Long-term)
**Goal**: Transform editor into best-in-class tool

- [ ] Real-Time Collaboration (#25) - **Major project**
- [ ] AI Writing Assistant (#27) - **High value**
- [ ] Block-Based Architecture (#26) - **Large refactor**
- [ ] Advanced Table Features (#29)
- [ ] Custom Components/Embeds (#30)
- [ ] Version Diffing (#28)

**Expected Impact**: Editor becomes a key product differentiator.

---

## 📊 Priority Matrix

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| **Page Break Visualization** | **Medium** | **Very High** | 🚨 **URGENT** |
| **Survey Image Library** | **Low** | **High** | 🚨 **URGENT** |
| **Page Layout Guides** | **Low** | **Medium** | 🚨 **URGENT** |
| Link Support | Low | High | 🔥 **Critical** |
| Slash Commands | Medium | Very High | 🔥 **Critical** |
| Floating Bubble Menu | Low | High | ⭐ High |
| Find & Replace | Medium | High | ⭐ High |
| Keyboard Shortcuts | Low | High | ⭐ High |
| Smart Paste | Medium | High | ⭐ High |
| Comment System | High | High | ⭐ High |
| Template Variables | Medium | High | ⭐ High |
| Real-Time Collaboration | Very High | Very High | 💎 Strategic |
| AI Writing Assistant | High | Very High | 💎 Strategic |
| Block-Based Architecture | Very High | Very High | 💎 Strategic |
| Image Enhancements | Medium | Medium | ✓ Medium |
| Offline Mode | Medium | Medium | ✓ Medium |
| Task Lists | Low | Medium | ✓ Medium |
| Export Formats | Medium | Medium | ✓ Medium |

---

## 🎨 UI/UX Recommendations

### Toolbar Organization

**Current**: Single row with all tools, can feel crowded.

**Recommendations**:
1. **Group related tools**: Use subtle dividers or spacing
2. **Collapsible sections**: For less-used features
3. **Customizable toolbar**: Let users show/hide buttons
4. **Responsive design**: Collapse to dropdown on smaller screens
5. **Icon tooltips**: Show on hover with keyboard shortcut

### Editor Canvas

**Current**: Fixed 962px width, adequate for print documents.

**Recommendations**:
1. **Responsive width**: Adapt to viewport size (with max-width)
2. **Zoom controls**: Let users zoom in/out (75%, 100%, 125%, fit)
3. **Margins indicator**: Visual guides for print margins
4. **Grid/ruler**: Optional guides for precision
5. **Page break indicators**: Visual lines showing page boundaries

### Menu Behavior

**Current**: Static toolbar at top.

**Recommendations**:
1. **Sticky toolbar**: Always visible when scrolling (already implemented)
2. **Context menus**: Right-click for common actions
3. **Floating menus**: Bubble menu for selection, floating toolbar for nodes
4. **Smart menu**: Show table controls only when in table

### Save Status

**Current**: Text indicator in corner.

**Recommendations**:
1. **Visual indicator**: Subtle icon that changes color
2. **Last saved time**: "Saved 2 minutes ago"
3. **Unsaved changes warning**: Prompt before navigating away
4. **Save history**: Quick access to recent saves
5. **Conflict resolution**: UI for handling save conflicts

---

## 🔧 Technical Recommendations

### Extension Architecture

**Recommendation**: Create a plugin system for easier customization.

```typescript
// Example:
const editorConfig = {
  extensions: [
    ...defaultExtensions,
    ...surveyExtensions, // Survey-specific
    ...conditionalExtensions(features), // Feature-flagged
  ],
  toolbar: customToolbarConfig,
}
```

### State Management

**Current**: Local state with callbacks to parent.

**Consideration**: For collaboration, may need to adopt Zustand or Jotai for shared state.

### Styling

**Current**: Mixture of Tailwind and inline styles.

**Recommendation**:
- Consolidate on Tailwind utility classes
- Use CSS variables for themable values
- Create reusable component classes
- Separate editor styles into dedicated stylesheet

### Performance

**Monitoring**: Add React DevTools Profiler or similar to measure:
- Re-render frequency
- Extension initialization time
- Large document performance

**Optimization**:
- Memoize toolbar components
- Debounce expensive operations
- Virtualize large lists/tables
- Lazy load extensions

---

## 📚 Resources & References

### TipTap Documentation
- Official Docs: https://tiptap.dev/docs/editor/introduction
- Extensions: https://tiptap.dev/docs/editor/extensions/functionality
- Pro Extensions: https://tiptap.dev/docs/editor/extensions/pro-extensions

### Similar Editors (Inspiration)
- **Notion**: Block-based, slash commands, excellent UX
- **Google Docs**: Collaboration, comments, suggestions
- **ProseMirror Examples**: Technical foundation of TipTap
- **Quill**: Alternative editor library
- **Lexical**: Facebook's editor framework

### Libraries to Consider
- `@tiptap-pro/*`: Pro extensions (may require license)
- `prosemirror-*`: Core ProseMirror utilities
- `yjs`: CRDT for collaboration
- `y-websocket`: WebSocket provider for Yjs
- `tiptap-extension-*`: Community extensions

---

## ❓ Open Questions

1. **Collaboration**: Is real-time collaboration a priority? If so, when?
2. **AI Integration**: Budget and API access for AI features?
3. **Mobile**: What percentage of users edit on mobile? Priority level?
4. **Offline**: How critical is offline editing for field surveyors?
5. **Export**: Which export formats are most important?
6. **Comments**: Who needs to comment? Internal only or clients too?
7. **Templates**: How complex should template variables be? Conditional logic?
8. **Accessibility**: Any specific compliance requirements (WCAG level)?
9. **Performance**: What's the typical document size? Max expected?
10. **Licensing**: Budget for TipTap Pro extensions?

---

## 🎯 Recommended First Steps

### Immediate (This Week) 🚨
1. **Page Break Visualization** - Users need to see page boundaries for A4 landscape reports
2. **Survey Image Library Dropdown** - Add quick insert for typical house diagram & location plan placeholder
3. **Page Layout Guides** - Show printable area margins

### Next Week
4. **Add Link Support** - This is conspicuously missing and critical
5. **Implement Keyboard Shortcuts Overlay** - High impact, low effort
6. **Add Floating Bubble Menu** - Modern UX improvement

### Following Weeks
7. **Plan Slash Commands** - Game-changer for UX
8. **Audit Current Performance** - Baseline before optimizations
9. **User Testing** - Get feedback on current pain points
10. **Create Feature Flags** - Test new features with subset of users

---

## Conclusion

The BlockEditor has a solid foundation with good technical architecture and several advanced features (custom S3 images, TOC, auto-save). However, **there are critical usability issues that need immediate attention**:

### 🚨 Critical Blockers
1. **No page overflow visibility** - Users can't tell when content will overflow to next page
2. **Missing standard report elements** - Typical house diagram and location plan not easily insertable
3. **No print layout guides** - Unclear what will actually print vs. what's off-page

### Missing Core Features
Additionally, it's missing some table-stakes features (links, underline) and modern UX patterns (slash commands, bubble menus) that users expect from contemporary editors.

**Recommended Strategy**:
1. **Phase 0 (Immediate)**: Fix critical page layout visibility issues - these are blocking effective report editing
2. **Short-term**: Knock out quick wins to boost perceived quality (links, shortcuts, bubble menu)
3. **Medium-term**: Add strategic features that support business use cases (templates, comments)
4. **Long-term**: Invest in differentiating features (collaboration, AI) if strategic fit

The roadmap above can transform this from a functional editor to a competitive advantage, but **the Phase 0 critical issues must be addressed first** before users can confidently create properly formatted reports.

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Author**: AI Assistant  
**Status**: Proposal for Review

