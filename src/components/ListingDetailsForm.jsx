import ErrorNotice from './ErrorNotice'
import PrimaryButton from './PrimaryButton'
import FormField from './FormField'
import { FIELD_CONTROL_CLASS, hintIdFor } from '../lib/fields'
import { CONDITION_OPTIONS, PRINTING_OPTIONS } from '../lib/listings'
import {
  describePanelHeading,
  conditionFieldLabel,
  printingFieldLabel,
  conditionEmptyOptionLabel,
  printingEmptyOptionLabel,
  askingPriceFieldLabel,
  locationFieldLabel,
  descriptionFieldLabel,
  descriptionHint,
  submitBlockMessage,
} from '../helpers/sell/copy'

// Three field shapes local to this form, deliberately not FilterBar's
// TextFilterField/SelectFilterField (Fact / CardResult precedent — local
// beside its one consumer, not extracted). Same markup, opposite
// semantics: enterKeyHint="search" and spellCheck={false} are search
// behaviours that don't belong on a price or location field, and
// SelectFilterField's empty option means "filter off, a legal final
// state" where this form's empty option means "not chosen yet, invalid
// until changed."
function TextField({ id, label, value, onChange, ref, type = 'text', inputMode, describedBy }) {
  return (
    <FormField id={id} label={label}>
      <input
        ref={ref}
        type={type}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        aria-describedby={describedBy}
        className={FIELD_CONTROL_CLASS}
      />
    </FormField>
  )
}

function SelectField({ id, label, emptyOptionLabel, options, value, onChange }) {
  return (
    <FormField id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CONTROL_CLASS}
      >
        <option value="">{emptyOptionLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

function TextAreaField({ id, label, value, onChange, hint }) {
  return (
    <FormField id={id} label={label} hint={hint}>
      <textarea
        id={id}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hintIdFor(id)}
        className={FIELD_CONTROL_CLASS}
      />
    </FormField>
  )
}

function ListingDetailsForm({
  draft,
  onFieldChange,
  onSubmit,
  posting,
  blockedField,
  postError,
  askingPriceRef,
  askingPriceDescribedBy,
  valuationHint,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded border border-zinc-200 p-4"
    >
      <h2 className="text-base font-medium text-zinc-900">{describePanelHeading}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="condition"
          label={conditionFieldLabel}
          emptyOptionLabel={conditionEmptyOptionLabel}
          options={CONDITION_OPTIONS}
          value={draft.condition}
          onChange={(value) => onFieldChange('condition', value)}
        />
        <SelectField
          id="printing"
          label={printingFieldLabel}
          emptyOptionLabel={printingEmptyOptionLabel}
          options={PRINTING_OPTIONS}
          value={draft.printing}
          onChange={(value) => onFieldChange('printing', value)}
        />
        {/* Plain text + inputMode="decimal", not a native numeric
            input — FilterBar's price fields use the same shape, for
            the same reason: a numeric input reads back '' the moment
            the browser can't sanitize what was typed. */}
        <TextField
          id="askingPrice"
          label={askingPriceFieldLabel}
          value={draft.askingPrice}
          onChange={(value) => onFieldChange('askingPrice', value)}
          ref={askingPriceRef}
          type="text"
          inputMode="decimal"
          describedBy={askingPriceDescribedBy}
        />
        <TextField
          id="location"
          label={locationFieldLabel}
          value={draft.location}
          onChange={(value) => onFieldChange('location', value)}
        />
      </div>

      {/* Deliberately outside the role="status" live region: this
          changes on every condition/printing toggle, and announcing it
          would interrupt the form for advisory information. Wired by
          aria-describedby on the asking-price input instead. */}
      {valuationHint}

      <TextAreaField
        id="description"
        label={descriptionFieldLabel}
        value={draft.description}
        onChange={(value) => onFieldChange('description', value)}
        hint={descriptionHint(draft.description.length)}
      />

      <PrimaryButton type="submit" disabled={posting}>
        Create listing
      </PrimaryButton>

      {blockedField && (
        <p className="text-sm text-zinc-700">{submitBlockMessage(blockedField)}</p>
      )}

      {postError && <ErrorNotice message={postError.message} onRetry={onSubmit} />}
    </form>
  )
}

export default ListingDetailsForm
