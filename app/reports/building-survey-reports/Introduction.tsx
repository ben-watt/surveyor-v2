import React, { useContext } from 'react'
import InputText from '../Input/InputText'
import { useFormContext } from 'react-hook-form';
import { BuildingSurveyData, nameof } from './BuildingSurveyReportData';


export default function Introduction() {
    const { register } = useFormContext();
    const address = nameof<BuildingSurveyData>("address");
    const clientName = nameof<BuildingSurveyData>("clientName");
    const frontElevationImage = nameof<BuildingSurveyData>("frontElevationImage");

    return (
        <>
            <InputText
                labelTitle="Address"
                placeholder="Address"
                register={() => register(address)} />
            <InputText labelTitle="Client" placeholder="ClientName" register={() => register(clientName)} />
            <div>
                <div className="m-2">
                    <label htmlFor="file-input">Front Elevation Image</label>
                </div>
                <input type="file" id="file-input" className="block w-full border border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-purple-600 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600
                file:bg-gray-50 file:border-0
                file:bg-gray-100 file:me-4
                file:py-3 file:px-4
                dark:file:bg-gray-700 dark:file:text-gray-400" {...register(frontElevationImage)}/>
            </div>

        </>
    )
}