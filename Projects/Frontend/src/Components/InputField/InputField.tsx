import "./InputField.css"
type InputFieldProps = {
    name: string;
    placeholder: string;
    type: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const InputField = ({name, placeholder, type, onChange}: InputFieldProps) => {
    return (
        <input className="InputField" name={name} type={type} onChange={onChange} placeholder={placeholder} />
    )
}
export default InputField;