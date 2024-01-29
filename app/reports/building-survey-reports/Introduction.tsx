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
                <div className="mb-2">
                    <label htmlFor="file-input">Front Elevation Image</label>
                </div>
                <input type="file" name="file-input" id="file-input" className="block w-full border border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600
                file:bg-gray-50 file:border-0
                file:bg-gray-100 file:me-4
                file:py-3 file:px-4
                dark:file:bg-gray-700 dark:file:text-gray-400"/>
            </div>

        </>
    )
}