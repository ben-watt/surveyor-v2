# FilePond Metadata Edit Plugin

A plugin for FilePond that adds a metadata edit button to files, allowing you to edit and store custom metadata for each file.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/pqina/filepond-plugin-file-metadata/blob/master/LICENSE)

## Quick Start

Install using npm:

```bash
npm install filepond-plugin-metadata-edit
```

Then import and register the plugin:

```js
import * as FilePond from 'filepond';
import FilePondPluginMetadataEdit from 'filepond-plugin-metadata-edit';
import 'filepond-plugin-metadata-edit/dist/filepond-plugin-metadata-edit.css';

// Register the plugin
FilePond.registerPlugin(FilePondPluginMetadataEdit);
```

## How it Works

This plugin adds a metadata edit button to uploaded files. When clicked, it passes the file to a callback function where you can implement your own metadata editing UI. The updated metadata is then stored with the file in FilePond.

## Usage Example

The plugin requires a callback function that will be called when the metadata edit button is clicked. This function handles the actual metadata editing UI.

```js
const pond = FilePond.create({
  allowMetadataEdit: true,
  metadataEditorCallback: (file, currentMetadata, save) => {
    // Create your custom metadata editor UI here
    // In this example, we use a simple prompt
    const updatedMetadata = {
      ...currentMetadata,
      title: prompt('Enter title', currentMetadata.title || ''),
      description: prompt('Enter description', currentMetadata.description || '')
    };
    
    // Save the updated metadata (or null to cancel)
    save(updatedMetadata);
    
    // Alternatively, use a modern UI library for a better experience
    // Example: openMetadataModal(file, currentMetadata, save);
  }
});
```

### React Example

```jsx
import React, { useState } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginMetadataEdit from 'filepond-plugin-metadata-edit';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-metadata-edit/dist/filepond-plugin-metadata-edit.css';

// Register the plugin
registerPlugin(FilePondPluginMetadataEdit);

function App() {
  const [files, setFiles] = useState([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentMetadata, setCurrentMetadata] = useState({});
  const [saveCallback, setSaveCallback] = useState(null);
  
  // Metadata editor handler
  const metadataEditorCallback = (file, existingMetadata, save) => {
    setCurrentFile(file);
    setCurrentMetadata(existingMetadata);
    setSaveCallback(() => save);
    setShowMetadataModal(true);
  };
  
  // Handle metadata save
  const handleSaveMetadata = (updatedMetadata) => {
    saveCallback(updatedMetadata);
    setShowMetadataModal(false);
  };
  
  // Handle metadata edit cancel
  const handleCancelMetadata = () => {
    saveCallback(null); // Cancel the edit
    setShowMetadataModal(false);
  };
  
  return (
    <div className="App">
      <FilePond
        files={files}
        onupdatefiles={setFiles}
        allowMultiple={true}
        allowMetadataEdit={true}
        metadataEditorCallback={metadataEditorCallback}
      />
      
      {/* Simple metadata editor modal */}
      {showMetadataModal && (
        <div className="metadata-modal">
          <h2>Edit Metadata</h2>
          <div>
            <label>Title</label>
            <input
              type="text"
              value={currentMetadata.title || ''}
              onChange={(e) => 
                setCurrentMetadata({
                  ...currentMetadata,
                  title: e.target.value
                })
              }
            />
          </div>
          <div>
            <label>Description</label>
            <textarea
              value={currentMetadata.description || ''}
              onChange={(e) => 
                setCurrentMetadata({
                  ...currentMetadata,
                  description: e.target.value
                })
              }
            />
          </div>
          <div className="buttons">
            <button onClick={() => handleSaveMetadata(currentMetadata)}>Save</button>
            <button onClick={handleCancelMetadata}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
```

## Configuration

The plugin can be configured with the following options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowMetadataEdit` | Boolean | `true` | Enable or disable metadata editing |
| `metadataEditorCallback` | Function | `null` | The function that handles metadata editing (required) |
| `styleMetadataEditButtonPosition` | String | `'bottom center'` | Position of the metadata edit button (options: 'top left', 'top center', 'top right', 'bottom left', 'bottom center', 'bottom right') |
| `metadataEditIcon` | String | (SVG icon) | Custom icon for the metadata edit button |

## Using the Metadata

The metadata is stored in the FilePond item's metadata under the key 'custom'. You can access it like this:

```js
// Get the file item
const item = pond.getFile(fileId);

// Get the metadata
const metadata = item.getMetadata('custom');
console.log(metadata);
```

This metadata will be included in the upload if you're using a server.

## License

MIT