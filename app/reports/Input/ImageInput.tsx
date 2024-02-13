import { XCircleIcon } from "@heroicons/react/16/solid";
import { UseFormRegisterReturn, useFormContext } from "react-hook-form";

const ImageInput = (props: UseFormRegisterReturn<string>) => {
    const { watch, setValue, formState } = useFormContext();

    const images = watch(props.name, []);
    console.log(formState)

    const previewImageUrls = [];
    if (images.length !== 0) {
        for (let i = 0; i < images.length; i++) {
            previewImageUrls.push(URL.createObjectURL(new Blob([images[i]], { type: "image/*" })));
        }
    }

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setValue(props.name, newImages);
    }

    return (
        <div>
            <label htmlFor={props.name } className="sr-only">
                <span>Upload Images</span>
            </label>
            <input
                type="file"
                accept="image/*"
                multiple
                id="file-input"
                className="block w-full border border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-purple-600 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600
                        file:bg-gray-50 file:border-0
                        file:bg-gray-100 file:me-4
                        file:py-3 file:px-4
                        dark:file:bg-gray-700 dark:file:text-gray-400"
                onChange={props.onChange}
                onBlur={props.onBlur}
                ref={props.ref} />
            <div className="flex justify-start gap-x-5 mt-5">
                {previewImageUrls.map((src, i) => (
                    <div key={i} className="relative">
                        <XCircleIcon className="absolute top-0 right-0 w-5 text-red-500 cursor-pointer" onClick={() => removeImage(i)} />
                        <img src={src} width={100} height={100} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ImageInput;