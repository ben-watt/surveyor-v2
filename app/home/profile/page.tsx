"use client";

import {
  fetchUserAttributes,
  updateUserAttribute,
  type UpdateUserAttributeOutput,
} from "aws-amplify/auth";
import { useEffect, useState } from "react";
import InputText from "../components/Input/InputText";
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage";
import { debounce } from "@tiptap-pro/extension-table-of-contents";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

// Zod schema for profile validation
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nickname: z.string().min(1, "Signature text is required"),
  profile: z.union([
    z.string().min(1, "Profile picture is required"),
    z.array(z.object({
      path: z.string(),
      isArchived: z.boolean(),
      hasMetadata: z.boolean()
    })).min(1, "Profile picture is required")
  ]),
  picture: z.union([
    z.string().min(1, "Signature image is required"),
    z.array(z.object({
      path: z.string(),
      isArchived: z.boolean(),
      hasMetadata: z.boolean()
    })).min(1, "Signature image is required")
  ]),
  sub: z.string(),
  email: z.string().email("Invalid email address")
});

type ProfileFormData = z.infer<typeof profileSchema>;

function Page() {
  const methods = useForm<ProfileFormData>({
    mode: 'onChange' // Enable validation on change
  });
  const { register, watch, getValues, trigger, formState: { errors } } = methods;
  const [enableForm, setEnableForm] = useState(false);
  const [entityData, setEntityData] = useState<ProfileFormData | null>(null);

  useEffect(() => {
    fetchUserAttributes().then((attributes) => {
      // Convert string paths to array format expected by RhfDropZoneInputImage
      const profileValue = attributes.profile
        ? [{ path: attributes.profile, isArchived: false, hasMetadata: false }]
        : [];
      const pictureValue = attributes.picture
        ? [{ path: attributes.picture, isArchived: false, hasMetadata: false }]
        : [];

      const formData: any = {
        name: attributes.name || "",
        nickname: attributes.nickname || "",
        profile: profileValue,
        picture: pictureValue,
        sub: attributes.sub || "",
        email: attributes.email || "",
      };
      methods.reset(formData, { keepDirtyValues: true });
      setEntityData({
        ...formData,
        profile: attributes.profile || "",
        picture: attributes.picture || ""
      });
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
              // Handle file upload fields - they return an array of file objects
              if (Array.isArray(value) && value.length > 0) {
                // Get the first file's path since maxFiles=1
                value = value[0]?.path || "";
              } else if (typeof value === 'object' && value !== null && 'path' in value) {
                // Handle single object case (backwards compatibility)
                value = (value as any).path;
              } else if (!value) {
                // If no value, skip this attribute
                return;
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
    <div className="min-h-screen bg-white">
      <div className="relative z-10 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between mb-8 items-baseline">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">Profile</h1>
              <p className="text-lg text-gray-600">
                Update your profile information.
              </p>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-md border-0 p-8">
            <FormProvider {...methods}>
              <div className="space-y-6">
          <InputText
            labelTitle="Email"
            placeholder="Email Address"
            register={() => register("email")}
            disabled
            errors={errors}
          />
          <InputText
            register={() => register("name")}
            labelTitle="Name"
            placeholder="Enter your name"
            errors={errors}
          />

          <RhfDropZoneInputImage
            path={`profile/${sub}/profilePicture/`}
            rhfProps={{
              name: "profile",
              rules: {},
            }}
            labelText="Profile Picture"
            maxFiles={1}
            minFiles={1}
          />

          <RhfDropZoneInputImage
            path={`profile/${sub}/signatureImage/`}
            rhfProps={{
              name: "picture",
              rules: {},
            }}
            labelText="Signature Image"
            maxFiles={1}
            minFiles={1}
          />
          <InputText
            register={() => register("nickname")}
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
        </div>
      </div>
    </div>
  );
}

export default Page;
