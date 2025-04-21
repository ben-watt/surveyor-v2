"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { surveyStore } from "@/app/home/clients/Database";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import the form component
const ReportDetailsForm = dynamic(() => import("./ReportDetailsForm"), {
  loading: () => <div>Loading form...</div>,
});

interface ReportDetailsFormPageProps {
  params: {
    id: string;
  };
}

const ReportDetailFormPage = ({
  params: { id },
}: ReportDetailsFormPageProps) => {
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
      id={id + "/report-details"}
      isOpen={isOpen}
      handleClose={handleClose}
      title="Report Details"
      description="Report Details"
      content={
        <Suspense fallback={<div>Loading form...</div>}>
          <ReportDetailsForm 
            surveyId={id} 
            reportDetails={survey.reportDetails} 
          />
        </Suspense>
      }
    />
  );
};

export default ReportDetailFormPage;
