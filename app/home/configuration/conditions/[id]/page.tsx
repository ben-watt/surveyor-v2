import ConditionEditClient from './ConditionEditClient';

// Required for static export - return empty array to generate routes dynamically
export async function generateStaticParams() {
  return [];
}

export default function EditConditionPage() {
  return <ConditionEditClient />;
}