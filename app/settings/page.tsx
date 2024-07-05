import { Button } from "@/components/ui/button";


export default function Page() {
    return (
      <>
        <div>
          <h1 className="text-3xl dark:text-white">Settings</h1>
        </div>
        <div className="mt-4 mb-4">
            <Button>Seed Data</Button>
        </div>
      </>
    );
}