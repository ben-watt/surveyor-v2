import React, {  } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  BuildingSurveyFormData,
  Component,
  ElementSection,
  Defect,
  RagStatus
} from "./BuildingSurveyReportSchema";

import { useForm, FormProvider, Controller, useFormContext, useFieldArray } from "react-hook-form";
import { ToggleSection } from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "../../components/Input/InputText";
import InputImage from "../../components/Input/ImageInput";
import SmartTextArea from "../../components/Input/SmartTextArea";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/ReportsClient";
import { successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { Pencil, X } from "lucide-react";
import { Label } from "@aws-amplify/ui-react";

interface BuildingSurveyFormProps {
  initDefaultValues?: BuildingSurveyFormData;
}

export default function Report({ initDefaultValues }: BuildingSurveyFormProps) {
  const createDefaultElementSection = (name: string): ElementSection => ({
    name,
    isPartOfSurvey: false,
    ragStatus: "N/A",
    description: "",
    components: [],
    images: [],
  });

  let defaultValues: BuildingSurveyFormData = {
    id: uuidv4(),
    reportDate: new Date(),
    address: "",
    clientName: "",
    frontElevationImagesUri: [],
    sections: [
      {
        name: "External Condition of Property",
        elementSections: [
          "Foundations and Substructure",
          "Roof Coverings",
          "Chimneys",
          "Rainwater Disposal System",
          "Sofits and Fascias",
          "Main Walls",
          "Windows and Doors",
        ].map(createDefaultElementSection),
      },
      {
        name: "Internal Condition of Property",
        elementSections: [
          "Roof Structure",
          "Ceilings",
          "Walls and Partitions",
          "Floors",
          "Internal Joinery",
          "Sanitaryware & Kitchen",
          "Fireplaces",
        ].map(createDefaultElementSection),
      },
      {
        name: "Services",
        elementSections: [
          "Electrical Installation",
          "Gas Installations",
          "Cold Water Supply",
          "Hot Water Supply / Heating Installations",
          "Surface water & Soil drainage",
        ].map(createDefaultElementSection),
      },
      {
        name: "Grounds",
        elementSections: ["Boundaries, Fencing, Drives, Lawn, etc"].map(
          createDefaultElementSection
        ),
      },
    ],
  };

  if (initDefaultValues) {
    defaultValues = initDefaultValues;
  }

  console.log("reportId", defaultValues.id);

  const methods = useForm<BuildingSurveyFormData>({ defaultValues });
  const { register, handleSubmit, watch, formState } = methods;
  const router = useRouter();

  const onSubmit = async () => {
    try {
      let form = watch();
      let _ = await reportClient.models.Reports.create({
        id: form.id,
        content: JSON.stringify(form),
      });

      console.debug(form);
      successToast("Saved");
      router.push("/reports");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="md:grid md:grid-cols-4 ">
      <div className="col-start-2 col-span-2">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <div className="space-y-4">
                <div>
                  <InputText
                    labelTitle="Address"
                    register={() =>
                      register("address", { required: "Address is required" })
                    }
                  />
                  <InputError message={formState.errors.address?.message} />
                </div>
                <div>
                  <InputText
                    labelTitle="Client"
                    register={() => register("clientName", { required: true })}
                  />
                  <InputError message={formState.errors.clientName?.message} />
                </div>
                <div>
                  <label className="mt-2" htmlFor="file-input">
                    Front Elevation Image
                  </label>
                  <InputImage
                    register={() => register("frontElevationImagesUri")}
                    path={`report-images/${defaultValues.id}/frontElevationImages/`}
                  />
                </div>
              </div>
              {defaultValues.sections.map((section, sectionIndex) =>
                section.elementSections.map((elementSection, i) => (
                  <section key={`${sectionIndex}.${i}`} className="mt-2">
                    <ToggleSection
                      defaultValue={elementSection.isPartOfSurvey}
                      label={elementSection.name}
                      register={() =>
                        register(
                          `sections.${sectionIndex}.elementSections.${i}.isPartOfSurvey`
                        )
                      }
                    >
                      <div className="flex-row space-y-2 p-2">
                        <Controller
                          name={`sections.${sectionIndex}.elementSections.${i}.ragStatus`}
                          render={({ field }) => (
                            <Select
                              name={field.name}
                              value={field.value}
                              onValueChange={field.onChange}
                              defaultValue={elementSection.ragStatus}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select a RAG Status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>RAG Status</SelectLabel>
                                  <SelectItem value="Red">
                                    <span className="text-red-600">Red</span>
                                  </SelectItem>
                                  <SelectItem value="Amber">
                                    <span className="text-amber-600">
                                      Amber
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="Green">
                                    <span className="text-green-600">
                                      Green
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="N/A">N/A</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <SmartTextArea
                          label={elementSection.name}
                          placeholder={`Description of the ${elementSection.name.toLowerCase()}...`}
                          register={() =>
                            register(
                              `sections.${sectionIndex}.elementSections.${i}.description`
                            )
                          }
                        />
                        <InputImage
                          register={() =>
                            register(
                              `sections.${sectionIndex}.elementSections.${i}.images`
                            )
                          }
                          path={`report-images/${defaultValues.id}/elementSections/${i}/images`}
                        />
                        <ComponentPicker name={`sections.${sectionIndex}.elementSections.${i}.components`} filterFn={(c) => c.element === elementSection.name } onClick={(ev, comp) => {}} />
                      </div>
                    </ToggleSection>
                  </section>
                ))
              )}
            </div>
            <div className="mt-8 mb-8">
              <PrimaryBtn className="w-full flex justify-center" type="submit">
                Save
              </PrimaryBtn>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

interface ComponentRendererProps extends React.PropsWithChildren<{}> {
  name: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  onDelete: () => void;
  ref: React.Ref<HTMLInputElement>;
}

const ComponentRenderer = ({
  name,
  label,
  onDelete,
  children,
}: ComponentRendererProps) => {
  return (
    <div className="border border-grey-400 p-2 rounded w-full">
      <div className="flex justify-between">
        <div>{label}</div>
        <X className="hover:cursor-pointer text-red-700" onClick={onDelete} />
      </div>
      <ul>
        {children}
      </ul>
    </div>
  );
};

interface DefectCheckboxProps {
  key: string;
  defect: Defect;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  name: string;
  ref: React.Ref<HTMLInputElement>;
}

const DefectCheckbox = ({ defect, name } : DefectCheckboxProps) => {

  const typedName = name as `sections.0.elementSections.0.components.0.defects.0`
  const { register, control } = useFormContext<BuildingSurveyFormData>();

  const mapConditionToColor = (condition: RagStatus) => {
    switch (condition) {
      case "Red":
        return "border-red-600 data-[state=checked]:bg-red-600";
      case "Amber":
        return "border-orange-600 data-[state=checked]:bg-orange-600";
      case "Green":
        return "border-green-600 data-[state=checked]:bg-green-600";
      case "N/A":
        return "";

    }
  };

  return (
    <Controller
      name={`${typedName}.isChecked` as const}
      control={control}
      render={({ field }) => (
        <div>
          <div className="flex items-center gap-3">
            <Checkbox
              id={field.name}
              name={field.name}
              onCheckedChange={field.onChange}
              ref={field.ref}
              checked={field.value}
              onBlur={field.onBlur}
              className={`rounded-full border-2 ${mapConditionToColor(
                defect.condition
              )}`}
            />
            <Label htmlFor={field.name} className="text-sm cursor-pointer">
              {defect.name}
            </Label>
          </div>
          <div className="ml-7">
            {defect.isChecked && (
                <SmartTextArea
                  label={defect.name}
                  defaultValue={defect.description}
                  register={() =>
                    register(`${typedName}.description` as const)
                  }
                />
            )}
          </div>
        </div>
      )}
    ></Controller>
  );
}

interface ComponentPickerProps {
  name: string;
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, component: Component) => void;
  filterFn: (c: ComponentPickerComponent) => boolean;
}


interface ComponentPickerComponent extends Component {
  element: string;
}

const ComponentPicker = ({ name, filterFn = () => true }: ComponentPickerProps) => {
  const typedName = name as `sections.0.elementSections.0.components`
  const { control, register } = useFormContext<BuildingSurveyFormData>();
  const fieldArray = useFieldArray({ name : typedName, control: control });

  const componentList : ComponentPickerComponent[] = [
    {
      element: "Roof Coverings",
      type: "Pitched Roof",
      name: "Slate Tiles",
      defects: [
        {
          name: "Minor undulations",
          description: "Where visible, the roof is generally in reasonable condition with no evidence of significant structural defects. ",
          isChecked: false,
          condition: "Amber",
        },
        {
          name: "Loose ridge tiles",
          description: "We identified that ridge tiles appeared loose during the inspection. When ridge tiles are loose, gaps and openings can form between the tiles and the roof structure. This creates an opportunity for water ingression. It is recommended that the ridge tiles are removed, cleaned and re-bedded using appropriate fixing methods to secure the tiles in line with the manufacturer’s guidelines.",
          isChecked: false,
          condition: "Amber",
        },
        {
          name: "Slipped or damaged slates",
          description: "Slipped or damaged slates were identified across the surface of the roof coverings. Slipped or damaged slates create openings through which rainwater can infiltrate the roof structure. It is recommended that areas of slipped or damaged slates are addressed in the immediate term. ",
          isChecked: false,
          condition: "Amber",
        },
        {
          name: "Lead tingle repairs",
          description: "We identified instances of lead tingle repairs to the rear pitch which suggests previous slipped or damaged slates have been addressed. We note that with the expansion and contraction of the slate due to temperature changes, this can create stress on the lead tingle, leading to eventual failure of the repair. Lead tingles suggest that some of the nails holdings the slates have failed and likely corroded. This could be an early warning sign that further slipped slates will start to occur as additional nails start to corrode further.",
          isChecked: false,
          condition: "Red",
        },
        {
          name: "Significant sagging",
          description: "We note that the roof appears to be sagging particularly around the area whereby lead tingle repairs are undertaken. This suggests that timber roof structure elements could be decayed or subject to structural movement.",
          isChecked: false,
          condition: "Red",
        },
        {
          name: "Recovering required",
          description: "Given the poor condition of the roof coverings generally, we recommend allocating a budget to recover the roof as part of a long-term maintenance plan.",
          isChecked: false,
          condition: "Red",
        },
        {
          name: "End of serviceable life in the long term",
          description: "Given the current condition, we anticipate that the roof coverings are approaching the end of serviceable life and we recommend allocating a budget to recover the roof as part of a long-term maintenance plan at a budget cost of circa £9,000, including for a new breathable membrane and replacing timber structure elements that are unsuitable for reuse",
          isChecked: false,
          condition: "Amber",
        },
      ],
    },
    {
      element: "Roof Coverings",
      type: "Pitched Roof",
      name: "Rosemary Tiles",
      defects: [
        {
          name: "Minor Undulations",
          description: "Where visible, the roof is generally in reasonable condition with no evidence of significant structural defects.",
          isChecked: false,
          condition: "Green",
        }
      ],
    },
  ]

  const filteredComponents = componentList.filter(filterFn);
  const orderedComponents = filteredComponents.sort((a, b) => a.type.localeCompare(b.type));
  const types = orderedComponents.map((c) => c.type).filter((v, i, a) => a.indexOf(v) === i);

  if(filteredComponents.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="border border-gray-400 pl-2 pr-2 p-1 rounded-sm w-full">
          Add Component
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            {types.map((type, index) => (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>{type}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {orderedComponents
                      .filter((c) => c.type === type)
                      .map((c, i) => (
                        <DropdownMenuItem
                          key={i}
                          onClick={(ev) => fieldArray.append(c)}
                        >
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            ))}
          </DropdownMenuGroup>
          {/* <DropdownMenuItem className="font-bold">Add New</DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="grid gap-2">
        {fieldArray.fields.map((field, index) => (
          <ComponentRenderer 
              key={field.id} 
              label={`${field.type} > ${field.name}`} 
              onDelete={() => fieldArray.remove(index)} {...register(`${typedName}.${index}` as const)}>
                {field.defects.map((defect, i) => (<DefectCheckbox defect={defect} key={`${field.id}.defect.${i}`} {...register(`${typedName}.${index}.defects.${i}` as const)} />))}
          </ComponentRenderer>
        ))}
      </div>
    </div>
  );
};
