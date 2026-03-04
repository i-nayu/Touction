import "./ConfirmButton.css"
type ConfirmButton = {
    label: string;
    type?: "button" | "submit" | "reset";

}
const ConfirmButton = ({ label, type }: ConfirmButton) => {
    return (
        <button className="ConfirmButton" type={type}>
            <p>{label}</p>
        </button>
    )
}
export default ConfirmButton;