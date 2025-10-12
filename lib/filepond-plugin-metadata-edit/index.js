import plugin from './filepond-plugin-metadata-edit';
import './metadata-edit-button.css';
import './metadata-modifiers.css';

// If we're in a browser environment, log that the plugin was imported
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.log('[FilePond Metadata Edit]: Plugin imported');
}

export default plugin;
