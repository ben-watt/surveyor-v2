import ElementEditClient from './ElementEditClient';

// Required for static export - return empty array to generate routes dynamically
export async function generateStaticParams() {
  return [];
}

export default function EditElementPage() {
  return <ElementEditClient />;
}
