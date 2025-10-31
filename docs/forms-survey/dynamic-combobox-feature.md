# Dynamic ComboBox Feature

## Overview

The DynamicComboBox component provides a mobile-friendly alternative to the standard ComboBox by using a drawer on mobile devices, making it easier for users to interact with the selection interface on smaller screens.

## Implementation Details

### New Components

1. **DynamicComboBox** (`app/home/components/Input/DynamicComboBox.tsx`)
   - Responsive wrapper that switches between desktop popover and mobile drawer
   - Uses `useMediaQuery` hook to detect mobile screens (<768px)
   - Maintains the same API as the original ComboBox

### Updated Components

1. **ComboBox** (`app/home/components/Input/ComboBox.tsx`)
   - Added `inDrawer` prop to render without popover wrapper
   - Added `onClose` callback for drawer integration
   - Enhanced touch-friendly styling with `py-3` on mobile items

## Usage Example

```tsx
import { DynamicComboBox } from '@/app/home/components/Input';
import { useForm } from 'react-hook-form';

function MyForm() {
  const {
    control,
    formState: { errors },
  } = useForm();

  const locationData = [
    { value: '1', label: 'Building A' },
    {
      value: '2',
      label: 'Building B',
      children: [
        { value: '2-1', label: 'Floor 1' },
        { value: '2-2', label: 'Floor 2' },
      ],
    },
  ];

  return (
    <DynamicComboBox
      name="location"
      control={control}
      data={locationData}
      labelTitle="Select Location"
      errors={errors}
      rules={{ required: 'Location is required' }}
    />
  );
}
```

## Key Features

### Mobile Experience

- Opens from bottom of screen using drawer
- Larger touch targets (increased padding)
- Full-screen search interface
- Smooth animations
- Native mobile feel

### Desktop Experience

- Maintains existing popover behavior
- No changes to desktop user experience
- Consistent with other form inputs

### Multi-select Support

- Works with `isMulti` prop
- Shows selected count on mobile trigger
- Inline removal of selected items

### Hierarchical Navigation

- Supports nested data structures
- Back navigation in drawer mode
- Search across all levels

## Migration Guide

To migrate existing ComboBox usage:

```diff
- import { Combobox } from '@/app/home/components/Input/ComboBox';
+ import { DynamicComboBox } from '@/app/home/components/Input';

// Change component name, props remain the same
- <Combobox
+ <DynamicComboBox
    name="myField"
    control={control}
    data={data}
  />
```

## Testing Considerations

1. Test on various mobile devices and screen sizes
2. Verify drawer animations are smooth
3. Ensure keyboard navigation works on desktop
4. Test with screen readers for accessibility
5. Verify form validation works correctly

## Performance Notes

- Drawer component is lazy-loaded on mobile
- No impact on desktop bundle size
- Minimal runtime overhead from media query hook
