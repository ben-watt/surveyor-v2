import { DefectForm } from "../../form";

export default function Page({ params }: { params: { slug: string }}) {

  console.log("page data", params);


  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Defect</h1>
      </div>
      <DefectForm id={params.slug} />
    </div>
  );
}
