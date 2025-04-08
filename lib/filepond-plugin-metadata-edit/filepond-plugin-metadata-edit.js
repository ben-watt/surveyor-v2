/**
 * FilePond Plugin Metadata Edit
 * Allow users to edit metadata on uploaded files
 */

// Plugin version
const VERSION = '1.0.0';

// Simple debug logger that only logs in non-production
const log = (message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[FilePond Metadata Edit]: ${message}`, data || '');
  }
};

/**
 * Metadata Edit Plugin
 */
const plugin = ({ addFilter, utils, views }) => {
  // Extract required utilities from utils
  const { Type, createRoute } = utils;
  const { fileActionButton } = views;
  
  log(`Plugin initializing (v${VERSION})`);
  
  // Called when an item is added
  addFilter('DID_CREATE_ITEM', (item, { query, dispatch }) => {
    log(`Item created: ${item.id}`);
    
    // Add metadata editing method to the item
    item.extend('editMetadata', () => {
      dispatch('EDIT_METADATA', { id: item.id });
    });
    
    return item;
  });
  
  // Called when a view is created for an item
  addFilter('CREATE_VIEW', (viewAPI) => {
    log('View created');
    
    // Get the view constructor
    const { is, view, query } = viewAPI;
    
    // Only hook into the file view
    if (!is('file')) {
      return;
    }
    
    // Log when the view is created
    log('File view created');
    
    // Create the edit button for the file item
    const createMetadataEditButton = ({ root, props }) => {
      const item = query('GET_ITEM', props.id);
      if (!item) return;
      
      log(`Creating edit button for item ${props.id}`);
      
      // Check if metadata editing is allowed
      if (!query('GET_ALLOW_METADATA_EDIT')) {
        log('Metadata editing disabled');
        return;
      }
      
      // Get icon
      const icon = query('GET_METADATA_EDIT_ICON');
      
      // Create the metadata edit button
      const buttonView = view.createChildView(fileActionButton, {
        label: 'edit-metadata',
        icon,
        opacity: 1
      });
      
      // Add custom class name
      buttonView.element.classList.add('filepond--action-metadata-edit-item');
      buttonView.element.dataset.align = query('GET_STYLE_METADATA_EDIT_BUTTON_POSITION');
      
      // Handle the edit button click
      buttonView.on('click', () => {
        log(`Edit button clicked for ${props.id}`);
        
        // Get current metadata
        const metadata = item.getMetadata('custom') || {};
        
        // Get editor callback
        const metadataEditorCallback = query('GET_METADATA_EDITOR_CALLBACK');
        if (!metadataEditorCallback) {
          log('No editor callback defined', 'error');
          return;
        }
        
        // Call editor with current metadata
        metadataEditorCallback(item, metadata, (updatedMetadata) => {
          if (updatedMetadata === null) {
            log('Metadata edit cancelled');
            return;
          }
          
          log(`Saving updated metadata for ${props.id}`, updatedMetadata);
          item.setMetadata('custom', updatedMetadata);
          
          // Notify that metadata has been updated
          root.dispatch('DID_UPDATE_METADATA', { id: props.id, metadata: updatedMetadata });
        });
      });
      
      // Add button to preview
      root.ref.metadataButton = view.appendChildView(buttonView);
    };
    
    // Add button to file view
    const didCreateView = ({ root, props }) => {
      log(`File view mounted for ${props.id}`);
      createMetadataEditButton({ root, props });
    };
    
    // Route definition
    const routes = {
      DID_LOAD_ITEM: didCreateView
    };
    
    // Add routes to view
    view.registerWriter(createRoute(routes));
  });
  
  return {
    // Plugin name
    options: {
      // Enable or disable metadata editing
      allowMetadataEdit: [true, Type.BOOLEAN],
      
      // Position of the metadata edit button
      styleMetadataEditButtonPosition: ['bottom center', Type.STRING],
      
      // The callback function that will receive the file and should return updated metadata
      metadataEditorCallback: [null, Type.FUNCTION],
      
      // Icon for the metadata edit button
      metadataEditIcon: [
        '<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M7.505 21c-.183 0-.34-.067-.471-.2-.13-.133-.196-.292-.196-.478 0-.026.004-.075.013-.147s.017-.128.026-.17l1.425-5.77c.03-.105.079-.196.144-.274L17.1 4.033c.366-.372.805-.65 1.32-.836.514-.186 1.048-.262 1.601-.229.549.038 1.062.19 1.54.458.479.267.859.618 1.14 1.055.28.433.444.908.49 1.423.047.516-.022 1.017-.209 1.505-.186.487-.464.899-.831 1.236l-8.6 9.76c-.065.063-.15.107-.255.131l-5.707 1.42c-.091.02-.182.028-.274.026-.91.013-.182.018-.274.018zm1.485-6.126l-1.16 4.701 4.52-1.132 8.518-9.67c.105-.112.183-.228.235-.35a1.13 1.13 0 00.078-.386c0-.133-.026-.258-.078-.376a1.026 1.026 0 00-.235-.327 1.015 1.015 0 00-.336-.222 1.08 1.08 0 00-.393-.08c-.13 0-.256.026-.379.08-.124.053-.235.13-.335.234L8.99 14.874z" fill="currentColor" fill-rule="nonzero"/></svg>',
        Type.STRING
      ]
    }
  };
};

// Fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

if (isBrowser) {
  document.dispatchEvent(
    new CustomEvent('FilePond:pluginloaded', { detail: plugin })
  );
  console.log('[FilePond Metadata Edit]: Plugin loaded and ready for registration');
}

export default plugin; 