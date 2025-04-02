## File structure

- All shadcn components are stored in /components
- The main application is stored in /app/app
- All custom components are stored in /app/app/components


## Data Storage

- We use a local cacheing mechanism to handle all database operations storing all data first in dexie then syncing to the server via the amplify-api.
- This ensures we have an offline first data model