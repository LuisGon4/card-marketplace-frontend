import { hintIdFor } from '../lib/fields'

// The label+hint wrapper every text/select/textarea field in the app sits
// inside. `children` is the control itself — this component never renders
// an <input> or <select>, so a caller is free to pass either. `hint`, when
// given, renders under the control at the id `hintIdFor(id)` returns; the
// caller is responsible for pointing the control's own `aria-describedby`
// at that same id, since FormField never touches the control's props.
function FormField({ id, label, hint, className = '', children }) {
  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="text-sm text-zinc-700">
        {label}
      </label>
      {children}
      {hint && (
        <p id={hintIdFor(id)} className="text-sm text-zinc-700">
          {hint}
        </p>
      )}
    </div>
  )
}

export default FormField
