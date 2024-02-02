import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon'

function SelectBox({ labelTitle, labelDescription, defaultValue, placeholder, options, register} : any){
    return (
        <div>  
            {/* <label>
                <div>{labelTitle}
                {labelDescription && <div className="tooltip tooltip-right" data-tip={labelDescription}><InformationCircleIcon className='w-4 h-4'/></div>}
                </div>
            </label>

            <select defaultChecked={defaultValue} {...register()}>
                <option disabled value="PLACEHOLDER">{placeholder}</option>
                {   
                    options.map((o, k) => {
                        return <option value={o.value || o.name} key={k}>{o.name}</option>
                    })
                }
            </select> */}



<select data-hs-select='{
    "placeholder": "Select option...",
    "toggleTag": "<button type=\"button\"></button>",
    "toggleClasses": "",
    "dropdownClasses": "",
    "optionClasses": "hs-selected:"
  }'>
  <option>Select option</option>
  <option>Name</option>
  <option>Email address</option>
  <option>Description</option>  
  <option>User ID</option>
</select>
        </div>
    )
}

export default SelectBox