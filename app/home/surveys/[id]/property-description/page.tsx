"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { surveyStore } from "@/app/home/clients/Database";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import the form component
const PropertyDescriptionForm = dynamic(() => import("./PropertyDescriptionForm"), {
  loading: () => <div>Loading form...</div>,
});

const PropertyDescriptionPage = () => {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isHydrated, survey] = surveyStore.useGet(id);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    router.back();
  }, [router]);

  useEffect(() => {
    if (isHydrated) {
      setIsOpen(true);
    }
  }, [isHydrated]);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (!survey) {
    return <div>Survey not found</div>;
  }

  return (
    <DynamicDrawer
      id={id + "/property-description"}
      isOpen={isOpen}
      handleClose={handleClose}
      title="Property Description"
      description="Property Description"
      content={
        <Suspense fallback={<div>Loading form...</div>}>
          <PropertyDescriptionForm 
            surveyId={id} 
            propertyDescription={survey.propertyDescription} 
          />
        </Suspense>
      }
    />
  );
};


export default PropertyDescriptionPage;
