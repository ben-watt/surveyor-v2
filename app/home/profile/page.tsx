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
import SaveButtonWithUploadStatus from "@/app/home/components/SaveButtonWithUploadStatus";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage";
import { debounce } from "@tiptap-pro/extension-table-of-contents";

type ProfileFormData = {
  name: string;
  nickname: string;
  profile: string;
  picture: string;
  sub: string;
  email: string;
};

function Page() {
  const methods = useForm<ProfileFormData>();
  const { register, handleSubmit, reset, watch } = methods;
  const [enableForm, setEnableForm] = useState(false);

  useEffect(() => {
    fetchUserAttributes().then((attributes) => {
      reset({
        name: attributes.name,
        nickname: attributes.nickname,
        profile: attributes.profile,
        picture: attributes.picture,
        sub: attributes.sub,
        email: attributes.email,
      });
      setEnableForm(true);
    });
  }, [reset]);

  async function handleUpdateUserAttribute(form: FieldValues) {
    setEnableForm(false);

    const debounceToast = debounce(() => {
      toast.success("Profile updated successfully. You may need to log out and log back in to see the changes.");
    }, 1000);

    Object.keys(form)
      .filter((k) => k !== "email" && k !== "sub")
      .forEach(async (k) => {
        try {
          console.log("[handleUpdateUserAttribute] updating", k, form[k]);
          if (k === "profile" || k === "picture") {
            form[k] = form[k][0].path;
          }

          const output = await updateUserAttribute({
            userAttribute: {
              attributeKey: k,
              value: form[k],
            },
          });

          const { nextStep } = output;
          switch (nextStep.updateAttributeStep) {
            case "CONFIRM_ATTRIBUTE_WITH_CODE":
              const codeDeliveryDetails = nextStep.codeDeliveryDetails;
              toast(
                `Confirmation code was sent to ${codeDeliveryDetails?.deliveryMedium}.`
              );
              // Collect the confirmation code from the user and pass to confirmUserAttribute.
              break;
            case "DONE":
              debounceToast();
              break;
          }
          setEnableForm(true);
        } catch (error) {
          console.log(error);
        }
      })
  }

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
        <form onSubmit={handleSubmit(handleUpdateUserAttribute, () => {})}>
          <div className="space-y-2">
            <InputText
              labelTitle="Email"
              placeholder="Email Address"
              register={() => register("email", { required: true })}
              disabled
            />
            <InputText
              register={() => register("name", { required: true })}
              labelTitle="Name"
              placeholder="Enter your name"
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
              register={() => register("nickname", { required: true })}
              labelTitle="Signature Text"
              placeholder="Enter your signature text"
            />
            <SaveButtonWithUploadStatus
              isSubmitting={!enableForm}
              paths={[
                `profile/${sub}/profilePicture/`,
                `profile/${sub}/signatureImage/`,
              ]}
              buttonText="Update"
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default Page;
