'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import { DocumentList } from "../components/DocumentList";
import { useUserHook } from "../utils/useUser";
import { useCurrentTenantId } from "../utils/tenant-utils";

function EditorPage() {
  const router = useRouter();
  const [isUserHydrated, user] = useUserHook();
  const [isTenantHydrated, tenantId] = useCurrentTenantId();

  const handleCreate = () => {
    const newDocId = uuidv4();
    router.push(`/home/editor/${newDocId}`);
  };

  const handleOpen = async (path: string) => {
    const encodedPath = encodeURIComponent(path);
    router.push(`/home/editor/${encodedPath}`);
  }

  if (!isUserHydrated || !isTenantHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight dark:text-white mb-2">Document Editor</h1>
          <p className="text-muted-foreground">Create and manage your documents with ease</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Create New Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Start fresh with a new document</p>
              <Button className="w-full" onClick={handleCreate}>
                Create Document
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200 bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Start with a pre-designed template</p>
              <Button variant="outline" className="w-full bg-muted/50 disabled">
                Browse Templates
              </Button>
            </CardContent>
          </Card>
        </div>
        <div>
          {user && tenantId && (
            <DocumentList
              userId={user.userId}
              tenantId={tenantId}
              onOpen={handleOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
