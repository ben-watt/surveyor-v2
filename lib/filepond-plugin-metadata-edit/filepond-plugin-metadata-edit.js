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
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line-icon lucide-pencil-line"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/><path d="m15 5 3 3"/></svg>',
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