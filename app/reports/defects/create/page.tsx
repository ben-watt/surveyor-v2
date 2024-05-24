"use client";

import InputText from "@/app/components/Input/InputText";
import SelectBox from "@/app/components/Input/SelectBox";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { useForm } from "react-hook-form";



interface DefectFormData {
    title: string;
    description: string;
    condition: string;
}

export default function Page() {
    const { register, handleSubmit } = useForm<DefectFormData>({});

    return (
        <div className="container mx-auto px-5">
            <div className="flex mt-4 mb-4">
                <h1 className="text-4xl dark:text-white">Create Defect</h1>
            </div>
            <form className="grid gap-4">
                <InputText labelTitle="Title" register={() => register("title")} />
                <TextAreaInput labelTitle="Description" placeholder="Description" register={() => register("description")} />
                <SelectBox register={() => register("condition")}>
                    <option value="1">Walls</option>
                    <option value="2">Floor</option>
                    <option value="3">Ground</option>
                </SelectBox>
            </form>
        </div>
    );
}