import React, { useContext } from 'react'
import InputText from '../Input/InputText'
import { useFormContext } from 'react-hook-form';
import InputImage from '../Input/ImageInput';


export default function Introduction() {
    const { register } = useFormContext();

    return (
        <>
            <InputText labelTitle="Address" register={() => register("address")} />
            <InputText labelTitle="Client" register={() => register("clientName")} />
            <div>
                <div className="m-2">
                    <label htmlFor="file-input">Front Elevation Image</label>
                </div>
                <InputImage register={() => register("frontElevationImage")} />
            </div>

        </>
    )
}