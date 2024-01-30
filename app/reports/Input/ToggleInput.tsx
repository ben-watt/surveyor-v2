export default function ToogleInput({ labelTitle, defaultValue, onClick, register }: any) {
    var inputProps = null;
    if (register) {
        inputProps = register()
    }
    

    return (
        <div className="flex justify-between p-2">
            <label htmlFor="hs-basic-usage">{labelTitle}</label>
            <input
                type="checkbox"
                id="hs-basic-usage"
                className="relative w-[3.25rem] h-7 p-px bg-gray-100 border-transparent text-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:ring-blue-600 disabled:opacity-50 disabled:pointer-events-none checked:bg-none checked:text-blue-600 checked:border-blue-600 focus:checked:border-blue-600 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-600
                            before:inline-block before:w-6 before:h-6 before:bg-white checked:before:bg-blue-200 before:translate-x-0 checked:before:translate-x-full before:rounded-full before:shadow before:transform before:ring-0 before:transition before:ease-in-out before:duration-200 dark:before:bg-gray-400 dark:checked:before:bg-blue-200"
                defaultValue={defaultValue} {...inputProps} onClick={onClick}
            />
        </div>
    )
}