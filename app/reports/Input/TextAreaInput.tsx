export default function TextAreaInput({labelTitle, labelStyle, containerStyle, defaultValue, placeholder, register }: any){
    return(
        <div className={`form-control w-full ${containerStyle}`}>
            <label htmlFor="textarea-label" className="sr-only">
                <span className={labelStyle}>{labelTitle}</span>
            </label>
            <textarea id="textarea-label" className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600" rows="3" defaultValue={defaultValue || ""} className="textarea textarea-bordered w-full" placeholder={placeholder || ""} {...register()}></textarea>
        </div>
    )
}