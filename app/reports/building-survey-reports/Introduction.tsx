import React, { useContext } from 'react'
import InputText from '../Input/InputText'
import { useFormContext } from 'react-hook-form';
import { BuildingSurveyData, nameof } from './BuildingSurveyReportData';


export default function Introduction() {
    const { register } = useFormContext();
    const address = nameof<BuildingSurveyData>("address");
    const clientName = nameof<BuildingSurveyData>("clientName");

    return (
        <>
            <InputText
                labelTitle="Address"
                placeholder="Address"
                defaultValue={"8 Cranberry Close, Braunstone Town, Leicester LE3 3DL."}
                register={() => register(address)} />
            <InputText labelTitle="Client" placeholder="ClientName" defaultValue={"Paul Hillman"} register={() => register(clientName)} />
            <div>
                <label className="label">Front Elevation Image</label>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    {...register("frontElevationImage")}
                    className="file-input file-input-bordered max-w-xs" />
            </div>

        </>
    )
}