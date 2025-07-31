"use client";

import {
  fetchUserAttributes,
  updateUserAttribute,
  type UpdateUserAttributeOutput,
} from "aws-amplify/auth";
import { useEffect, useState } from "react";
import InputText from "../components/Input/InputText";
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage";
import { debounce } from "@tiptap-pro/extension-table-of-contents";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

type ProfileFormData = {
  name: string;
  nickname: string;
  profile: string;
  picture: string;
  sub: string;
  email: string;
};

function Page() {
  const methods = useForm<ProfileFormData>({
    mode: 'onChange' // Enable validation on change
  });
  const { register, watch, getValues, trigger, formState: { errors } } = methods;
  const [enableForm, setEnableForm] = useState(false);
  const [entityData, setEntityData] = useState<ProfileFormData | null>(null);

  useEffect(() => {
    fetchUserAttributes().then((attributes) => {
      const formData: ProfileFormData = {
        name: attributes.name || "",
        nickname: attributes.nickname || "",
        profile: attributes.profile || "",
        picture: attributes.picture || "",
        sub: attributes.sub || "",
        email: attributes.email || "",
      };
      methods.reset(formData);
      setEntityData(formData);
      setEnableForm(true);
    });
  }, [methods]);

  // Autosave functionality
  const saveProfile = async (data: ProfileFormData, { auto = false }: { auto?: boolean } = {}) => {
    setEnableForm(false);

    const debounceToast = debounce(() => {
      if (!auto) {
        toast.success("Profile updated successfully. You may need to log out and log back in to see the changes.");
      }
    }, 1000);

    try {
      Object.keys(data)
        .filter((k) => k !== "email" && k !== "sub")
        .forEach(async (k) => {
          try {
            console.log("[saveProfile] updating", k, data[k as keyof ProfileFormData]);
            let value = data[k as keyof ProfileFormData];
            
            if (k === "profile" || k === "picture") {
              // Handle file upload fields - they might be File objects
              if (typeof value === 'object' && value !== null && 'path' in value) {
                value = (value as any).path;
              }
            }

            const output = await updateUserAttribute({
              userAttribute: {
                attributeKey: k,
                value: value as string,
              },
            });

            const { nextStep } = output;
            switch (nextStep.updateAttributeStep) {
              case "CONFIRM_ATTRIBUTE_WITH_CODE":
                const codeDeliveryDetails = nextStep.codeDeliveryDetails;
                if (!auto) {
                  toast(
                    `Confirmation code was sent to ${codeDeliveryDetails?.deliveryMedium}.`
                  );
                }
                // Collect the confirmation code from the user and pass to confirmUserAttribute.
                break;
              case "DONE":
                debounceToast();
                break;
            }
          } catch (error) {
            console.log(error);
            if (!auto) toast.error("Error updating profile");
            throw error; // Re-throw for autosave error handling
          }
        });
    } finally {
      setEnableForm(true);
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveProfile,
    watch,
    getValues,
    trigger,
    {
      delay: 1000, // 1 second delay for autosave
      showToast: false, // Don't show toast for autosave
      enabled: enableForm, // Only enable autosave when form is ready
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  const sub = watch("sub");

  if (!enableForm) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-96 m-auto md:m-0">
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Update your profile information.
          </p>
        </div>
      </div>
      <FormProvider {...methods}>
        <div className="space-y-2">
          <InputText
            labelTitle="Email"
            placeholder="Email Address"
            register={() => register("email", { required: "Email is required" })}
            disabled
            errors={errors}
          />
          <InputText
            register={() => register("name", { required: "Name is required" })}
            labelTitle="Name"
            placeholder="Enter your name"
            errors={errors}
          />

          <RhfDropZoneInputImage
            path={`profile/${sub}/profilePicture/`}
            rhfProps={{
              name: "profile",
              rules: { required: "Profile picture is required" },
            }}
            labelText="Profile Picture"
            maxFiles={1}
            minFiles={1}
          />

          <RhfDropZoneInputImage
            path={`profile/${sub}/signatureImage/`}
            rhfProps={{
              name: "picture",
              rules: { required: "Signature image is required" },
            }}
            labelText="Signature Image"
            maxFiles={1}
            minFiles={1}
          />
          <InputText
            register={() => register("nickname", { required: "Signature text is required" })}
            labelTitle="Signature Text"
            placeholder="Enter your signature text"
            errors={errors}
          />
          <LastSavedIndicator
            status={saveStatus}
            lastSavedAt={lastSavedAt || undefined}
            entityUpdatedAt={entityData ? new Date().toISOString() : undefined}
            className="text-sm justify-center"
          />
        </div>
      </FormProvider>
    </div>
  );
}

export default Page;
