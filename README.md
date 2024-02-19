## Surveyor

- Generate Building Surveyor Reports Instantly

### Getting Started

First, run the development server:

```bash
npm run dev
```

```bash
aws sandbox
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Roadmap

### Now

- Auth ✅
- Deployment ✅
- Actually kick out a report✅
  - Input components need work ✅
  - Tiny Mce + API Key ✅
  - Open API Key / Audio Feature ✅
  - Read this to understand how to do auth properly.... https://docs.amplify.aws/gen2/build-a-backend/server-side-rendering/ ✅
  - Read this to get the defect search working properly... https://www.algolia.com/doc/api-reference/widgets/search-box/react/ ✅

  - Refactor some of the components to tidy up the form ✅
    - Text box ✅
    - Defect Input ✅

  - More dynamic defect sections (ignore for now...)

  - Actually saving the form data and the individual reports!
  - Getting the export just right


  - Guidance on each section and what you'd want
  - Listing out and re-opening that form data
  - Report formatting
  - Mobile
  - Publish with correct api keys for environments
- Offline mode

### Next

Can we do something where we're less structured???. Rock up at a property take a load of pictures take a load of audio / video then interpret that data to understand what is useful in order to generate a survey. What would we need? An understanding of what is required for a survey 

- [AI: Review this image and identify any possible defects] (Easy)
- [AI: Link relevant bits of video, audio and text together] (Hard)
- [AI: Generate specific bits about each section] (Medium)
- [AI: Create a report with encapsulates all the information above] (Very hard)


