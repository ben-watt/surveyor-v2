"use client";

import {
  fetchUserAttributes,
  FetchUserAttributesOutput,
} from "aws-amplify/auth";
import {
  updateUserAttribute,
  type UpdateUserAttributeOutput,
} from "aws-amplify/auth";
import { useEffect, useState } from "react";
import InputText from "../components/Input/InputText";
import { FieldValues, FormProvider, UseControllerProps, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { Edit } from "lucide-react";
import { Label } from "../components/Input/Label";
import { InputImageComponent } from "../components/Input/InputImage";

interface ImageUploadWithPreviewProps {
    labelText? : string;
    path: string;
    initImage: string | undefined;
    rhfProps: UseControllerProps;
}

function Page() {
  const [userAttributes, setUserAttributes] =
    useState<FetchUserAttributesOutput>();
  const methods = useForm();
  const { register, handleSubmit } = methods;
  const [enableForm, setEnableForm] = useState(false);

  useEffect(() => {
    fetchUserAttributes().then((attributes) => {
      setUserAttributes(attributes);
      setEnableForm(true);
    });
  }, []);

  async function handleUpdateUserAttribute(form: FieldValues) {
    setEnableForm(false);
    Object.keys(form).forEach(async (k) => {
      try {

        let value = form[k];
        if(k === "profile" || k === "picture") {
            value = form[k][0];
        }

        const output = await updateUserAttribute({
          userAttribute: {
            attributeKey: k,
            value: value,
          },
        });

        handleUpdateUserAttributeNextSteps(output);
        setEnableForm(true);
      } catch (error) {
        console.log(error);
      }
    });
  }

  function handleUpdateUserAttributeNextSteps(
    output: UpdateUserAttributeOutput
  ) {
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
        toast(`User attribute was successfully updated.`);
        break;
    }
  }

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleUpdateUserAttribute, () => {})}>
          <div className="space-y-2 max-w-72 m-auto">
            <InputText
              labelTitle="Email"
              placeholder="Email Address"
              defaultValue={userAttributes?.email}
              disabled
            />
            <InputText
              register={() => register("name", { required: true })}
              labelTitle="Name"
              placeholder="Enter your name"
              defaultValue={userAttributes?.name}
            />
            <InputText
              register={() => register("nickname", { required: true })}
              labelTitle="Signature Text"
              placeholder="Enter you signed name"
              defaultValue={userAttributes?.nickname}
            />
            <InputImageComponent.rhfImage maxNumberOfFiles={1} path={`profile/${userAttributes?.sub}/profilePicture/`} rhfProps={{name: "profile"}} labelText="Profile Picture" />
            <InputImageComponent.rhfImage maxNumberOfFiles={1} path={`profile/${userAttributes?.sub}/signatureImage/`} rhfProps={{name: "picture"}} labelText="Signature Image" />
            <Button
              role="submit"
              disabled={!enableForm}
            >
              Update
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default Page;
