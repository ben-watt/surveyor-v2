# Handlebars Syntax Highlighting Extension

## Overview

The `HandlebarsHighlight` extension provides real-time syntax highlighting for Handlebars template syntax in the TipTap editor. This improves the template editing experience by providing visual feedback for different types of Handlebars constructs.

## Features

### Color-Coded Syntax

The extension applies different colors to different types of Handlebars syntax:

| Syntax Type | Color | Background | Example |
|------------|-------|------------|---------|
| Regular Variables | Cyan (#0891b2) | Light Cyan | `{{reportDetails.clientName}}` |
| Loop/Conditional Opening | Orange (#ea580c) | Light Orange | `{{#each sections}}`, `{{#if field}}` |
| Closing Tags | Gray (#64748b) | Light Gray | `{{/each}}`, `{{/if}}` |
| Else Branches | Purple (#7c3aed) | Light Purple | `{{else}}` |
| Unescaped Output | Green (#16a34a) | Light Green | `{{{rawHtml}}}` |
| Comments | Light Gray (#9ca3af) | Very Light Gray | `{{! comment}}` |

### Supported Patterns

The extension recognizes and highlights the following Handlebars patterns:

1. **Loop Opening Tags**: `{{#each}}`, `{{#if}}`, `{{#unless}}`, `{{#with}}`, `{{#and}}`, `{{#or}}`
2. **Closing Tags**: `{{/each}}`, `{{/if}}`, `{{/unless}}`, `{{/with}}`, `{{/and}}`, `{{/or}}`
3. **Else Tags**: `{{else}}`
4. **Regular Variables**: `{{variable}}`, `{{this.property}}`, `{{../parent}}`
5. **Triple Braces** (unescaped): `{{{helper}}}`
6. **Comments**: `{{! comment}}`, `{{!-- long comment --}}`

## Technical Implementation

### Architecture

The extension uses ProseMirror's decoration system to apply styling without modifying the actual document content:

- **Plugin-based**: Implements a ProseMirror plugin with state management
- **Decoration System**: Uses `DecorationSet` to overlay styles
- **Regex Pattern Matching**: Efficiently identifies Handlebars syntax
- **Real-time Updates**: Decorations update automatically on document changes

### Performance

- **O(n) complexity**: Single pass through document text nodes
- **Efficient Updates**: Only recalculates decorations when content changes
- **No Content Modification**: Pure visual layer, doesn't alter HTML

### Code Structure

```typescript
// Extension definition
export const HandlebarsHighlight = Extension.create({
  name: 'handlebarsHighlight',
  addProseMirrorPlugins() {
    // Plugin with state management and decoration
  }
});

// Decoration finder
function findHandlebarsDecorations(doc): DecorationSet {
  // Regex patterns for each syntax type
  // Document traversal
  // Decoration creation
}
```

## Usage

### Enabling in NewEditor

The extension is conditionally added to the editor via the `enableHandlebarsHighlight` prop:

```typescript
<NewEditor
  editorId="template-editor"
  content={templateContent}
  onUpdate={handleUpdate}
  enableHandlebarsHighlight={true}  // Enable syntax highlighting
  // ... other props
/>
```

### CSS Styling

Styles are defined in `app/globals.css`:

```css
/* Regular variables - Cyan */
.tiptap .handlebars-variable {
  color: #0891b2;
  background-color: #ecfeff;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

/* Loop/conditional tags - Orange */
.tiptap .handlebars-loop {
  color: #ea580c;
  background-color: #fff7ed;
  /* ... */
}

/* And more... */
```

## Benefits

### For Users

1. **Instant Visual Feedback**: Immediately see what type of syntax you're working with
2. **Error Prevention**: Easily spot mismatched opening/closing tags
3. **Improved Readability**: Color coding makes complex templates easier to scan
4. **Professional Experience**: Similar to modern code editors

### For Developers

1. **Non-Invasive**: Doesn't modify document content
2. **Extensible**: Easy to add new patterns or colors
3. **Performant**: Efficient regex-based implementation
4. **Maintainable**: Clear separation between pattern detection and styling

## Extending the Highlighter

### Adding New Patterns

To add a new Handlebars pattern:

1. Add regex pattern to `findHandlebarsDecorations`:

```typescript
{
  regex: /\{\{@customHelper[^}]*\}\}/g,
  className: 'handlebars-custom',
}
```

2. Add corresponding CSS in `globals.css`:

```css
.tiptap .handlebars-custom {
  color: #your-color;
  background-color: #your-bg-color;
  /* ... */
}
```

### Customizing Colors

Edit the CSS classes in `app/globals.css` to change colors:

```css
.tiptap .handlebars-variable {
  color: #your-preferred-color;
  background-color: #your-preferred-background;
}
```

## Testing

### Manual Testing Checklist

- [ ] Regular variables highlight in cyan
- [ ] Loop tags (#each, #if) highlight in orange
- [ ] Closing tags (/each, /if) highlight in gray
- [ ] Else tags highlight in purple
- [ ] Triple braces highlight in green
- [ ] Comments highlight in gray italic
- [ ] Nested syntax works correctly
- [ ] Performance acceptable with large documents
- [ ] No interference with other editor features

### Test Cases

```handlebars
{{reportDetails.clientName}}           <!-- Should be cyan -->
{{#each sections}}                     <!-- Should be orange -->
  {{this.name}}                        <!-- Should be cyan -->
  {{#if this.isPartOfSurvey}}          <!-- Should be orange -->
    Content here
  {{else}}                             <!-- Should be purple -->
    Other content
  {{/if}}                              <!-- Should be gray -->
{{/each}}                              <!-- Should be gray -->
{{{rawHtml}}}                          <!-- Should be green -->
{{! This is a comment}}                <!-- Should be gray italic -->
```

## Future Enhancements

Potential improvements to consider:

1. **Hover Tooltips**: Show variable type or description on hover
2. **Auto-completion**: Suggest variables as you type
3. **Error Highlighting**: Red underline for invalid syntax
4. **Bracket Matching**: Highlight matching open/close tags
5. **Variable Validation**: Check if variables exist in schema
6. **Custom Color Schemes**: User-configurable color preferences

## Related Files

- **Extension**: `app/home/components/TipTapExtensions/HandlebarsHighlight.ts`
- **CSS Styles**: `app/globals.css` (lines 464-517)
- **Editor Component**: `app/home/components/Input/BlockEditor.tsx`
- **Template Form**: `app/home/configuration/templates/form.tsx`

## Version History

- **v1.0** (October 26, 2025): Initial implementation with 6 syntax types
  - Regular variables, loops, closings, else, unescaped, comments
  - Color-coded backgrounds and text
  - Monospace font for better code readability

