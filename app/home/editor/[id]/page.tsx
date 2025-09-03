import EditorClient from './EditorClient';

// Required for static export - return empty array to generate routes dynamically
export async function generateStaticParams() {
  return [];
}

export default function Page() {
  return <EditorClient />;
}
