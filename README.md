## Survii.io

- Generate Building Surveyor Reports Instantly

### Getting Started

First, run the development server:

```bash
npm run dev
```

```bash
npx ampx sandbox
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Amplify
- Next JS
- https://lucide.dev/icons/
- TanStack
- ShadCN
- Tailwind
- Dexie JS

## Roadmap

- Change the form to make it easier to  do surveys quickly (+ change the data model if needed)
- Ensure data works fully with Dexie JS and background sync is working
- Update the template header and footers
- Add shapes to the editor (or allow highlighting colours) - maybe both
- Ensure when we render it renders the whole report correctly and doesn't do partial renders.
- Use file pond for image uploads and make it slicker
- Improve site wide navigation using shadcn navbar

- Tiptap Collaboration features in the editor
- Address lookup
- Client details
- Improve landing page + social login?
- Update next-js

### Next

Can we do something where we're less structured???. Rock up at a property take a load of pictures take a load of audio / video then interpret that data to understand what is useful in order to generate a survey. What would we need? An understanding of what is required for a survey 

- [AI: Review this image and identify any possible defects] (Easy)
- [AI: Link relevant bits of video, audio and text together] (Hard)
- [AI: Generate specific bits about each section] (Medium)
- [AI: Create a report with encapsulates all the information above] (Very hard)


