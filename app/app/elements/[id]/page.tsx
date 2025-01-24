import { DataForm } from "../form";

export default function Page({ params }: { params: { id: string }}) {
  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Element</h1>
      </div>
      <DataForm id={params.id} />
    </div>
  );
}
