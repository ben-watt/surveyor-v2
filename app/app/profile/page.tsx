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
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { InputImageComponent } from "../components/Input/InputImage";
import { PrimaryBtn } from "../components/Buttons";


type ProfileFormData = {
  name: string;
  nickname: string;
  profile: string;
  picture: string;
  sub: string;
  email: string;
}

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
    async function handleUpdateUserAttribute(attributeKey: string, value: string) {
      try {
        const output = await updateUserAttribute({
          userAttribute: {
            attributeKey,
            value
          }
        });
        handleUpdateUserAttributeNextSteps(output);
      } catch (error) {
        console.log(error);
      }
    }

    Object.keys(form).filter(k => (k !== "email" && k !== "sub")).forEach(async (k) => {
      try {
        if(k === "profile" || k === "picture") {
          console.log(form[k]);
          form[k] = form[k][0];
        }

        handleUpdateUserAttribute(k, form[k]);
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

  if(!enableForm) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleUpdateUserAttribute, () => {})}>
          <div className="space-y-2 max-w-72 m-auto">
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
            <InputText
              register={() => register("nickname", { required: true })}
              labelTitle="Signature Text"
              placeholder="Enter you signed name"
            />
            <InputImageComponent.rhfImage maxNumberOfFiles={1} path={`profile/${watch()?.sub}/profilePicture/`} rhfProps={{name: "profile" }} labelText="Profile Picture" />
            <InputImageComponent.rhfImage maxNumberOfFiles={1} path={`profile/${watch()?.sub}/signatureImage/`} rhfProps={{name: "picture" }} labelText="Signature Image" />
            <PrimaryBtn 
              type="submit"
              disabled={!enableForm}
            >
              Update
            </PrimaryBtn>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default Page;
