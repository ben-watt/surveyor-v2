import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon'

function SelectBox({labelTitle, labelDescription, defaultValue, containerStyle, placeholder, labelStyle, options, register} : any){
    return (
        <div className={`inline-block ${containerStyle}`}>  
            <label  className={`label  ${labelStyle}`}>
                <div className="label-text">{labelTitle}
                {labelDescription && <div className="tooltip tooltip-right" data-tip={labelDescription}><InformationCircleIcon className='w-4 h-4'/></div>}
                </div>
            </label>

            <select className="select select-bordered w-full" defaultChecked={defaultValue} {...register()}>
                <option disabled value="PLACEHOLDER">{placeholder}</option>
                {   
                    options.map((o, k) => {
                        return <option value={o.value || o.name} key={k}>{o.name}</option>
                    })
                }
            </select>
        </div>
    )
}

export default SelectBox