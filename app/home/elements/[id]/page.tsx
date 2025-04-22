import { DataForm } from "../form";

export default async function Page(props: { params: Promise<{ id: string }>}) {
  const params = await props.params;
  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Element</h1>
      </div>
      <DataForm id={params.id} />
    </div>
  );
}
