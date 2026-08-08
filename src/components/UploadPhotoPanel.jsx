import { useEffect, useRef, useState } from 'react'
import { apiPost } from '../api/client'
import { putPresignedFile } from '../api/s3'
import ErrorNotice from './ErrorNotice'
import PrimaryButton from './PrimaryButton'
import FormField from './FormField'
import { FIELD_CONTROL_CLASS, hintIdFor } from '../lib/fields'
import { UPLOAD_CONTENT_TYPE } from '../lib/images'
import {
  addPhotoPanelHeading,
  photoFieldLabel,
  photoFieldHint,
  uploadButtonLabel,
  chooseFileFirstHint,
  uploadStageText,
  uploadErrorLine,
} from '../helpers/sell/copy'

// Runs the three-leg upload for one listing: presign, PUT to S3, confirm.
function UploadPhotoPanel({ listingId, onUploaded }) {
  const fileInputRef = useRef(null)
  // uploadStage is the operation's current leg — null when idle — and
  // drives the live-region text below. failedStage survives past a failure
  // (uploadStage resets to null) so a retry knows which leg to resume.
  const [uploadStage, setUploadStage] = useState(null)
  const [failedStage, setFailedStage] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [chooseFileBlocked, setChooseFileBlocked] = useState(false)
  // The presign's imageId, held across the PUT and into confirm — and, on
  // a confirm-stage failure, held again so the retry can re-POST confirm
  // with this same imageId instead of presigning a new one.
  const pendingImageIdRef = useRef(null)
  // One AbortController per attempt, so navigating away mid-upload cancels
  // the in-flight request instead of leaving it running unseen.
  const uploadControllerRef = useRef(null)
  const uploadButtonRef = useRef(null)
  // Set to true right before every settle-to-null of uploadStage (success
  // or failure), never on the empty-file early return or an aborted
  // attempt. The effect below reads it once uploadStage actually reaches
  // null in a committed render — the button is disabled while uploadStage
  // is non-null, and a disabled element can't hold focus, so this can't run
  // synchronously inside runUpload; it has to wait for the re-render that
  // clears `disabled`.
  const restoreUploadFocusRef = useRef(false)

  useEffect(() => {
    if (uploadStage === null && restoreUploadFocusRef.current) {
      restoreUploadFocusRef.current = false
      uploadButtonRef.current?.focus()
    }
  }, [uploadStage])

  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort()
    }
  }, [])

  async function runUpload() {
    // Re-entrancy guarded at the operation, not the control: both the
    // Upload button and ErrorNotice's "Try again" call this function, and
    // only the button gets `disabled`.
    if (uploadStage !== null) return

    const file = fileInputRef.current?.files[0] ?? null
    if (!file) {
      // The Upload button is never disabled for an empty selection.
      // Disabling it here instead would disable the button the instant a
      // successful upload clears the selection, dropping focus to <body>
      // right after the user's action succeeded.
      setChooseFileBlocked(true)
      fileInputRef.current?.focus()
      return
    }
    setChooseFileBlocked(false)
    setUploadError(null)

    const controller = new AbortController()
    uploadControllerRef.current = controller

    // A confirm-stage failure resumes here with the presign already done;
    // any other failure (or a first attempt) starts over from presign.
    const resumeAtConfirm = failedStage === 'confirming'
    let imageId = pendingImageIdRef.current

    if (!resumeAtConfirm) {
      // fileSizeBytes is file.size of this same File object, read once —
      // presigning one size and PUTting a different one produces a
      // Content-Length mismatch and an opaque S3 403.
      const fileSizeBytes = file.size

      setUploadStage('presigning')
      let presign
      try {
        presign = await apiPost(
          `/api/listings/${encodeURIComponent(listingId)}/images/presign`,
          { fileSizeBytes },
          { signal: controller.signal }
        )
      } catch (err) {
        // An aborted fetch rejects with a DOMException — check the signal
        // before touching state, or an unmount after navigating away would
        // still write a stale error.
        if (controller.signal.aborted) return
        restoreUploadFocusRef.current = true
        setUploadStage(null)
        setFailedStage('presigning')
        setUploadError(err)
        return
      }
      if (controller.signal.aborted) return

      imageId = presign.imageId
      pendingImageIdRef.current = imageId

      setUploadStage('uploading')
      try {
        await putPresignedFile(presign.uploadUrl, file, { signal: controller.signal })
      } catch (err) {
        if (controller.signal.aborted) return
        restoreUploadFocusRef.current = true
        setUploadStage(null)
        setFailedStage('uploading')
        setUploadError(err)
        return
      }
      if (controller.signal.aborted) return
    }

    setUploadStage('confirming')
    try {
      await apiPost(
        `/api/listings/${encodeURIComponent(listingId)}/images`,
        { imageId },
        { signal: controller.signal }
      )
    } catch (err) {
      if (controller.signal.aborted) return
      restoreUploadFocusRef.current = true
      setUploadStage(null)
      setFailedStage('confirming')
      setUploadError(err)
      return
    }
    if (controller.signal.aborted) return

    restoreUploadFocusRef.current = true
    setUploadStage(null)
    setFailedStage(null)
    setUploadError(null)
    pendingImageIdRef.current = null
    // A file input can't be a controlled component — this is the only way
    // to clear the selection after success. Do not add a `value` prop.
    fileInputRef.current.value = ''
    // No optimistic append: the photo appearing in the gallery is the only
    // confirmation that means anything after a three-leg upload.
    onUploaded()
  }

  return (
    <section className="space-y-4 rounded border border-zinc-200 p-4">
      <h2 className="text-base font-medium text-zinc-900">{addPhotoPanelHeading}</h2>

      <FormField id="photo" label={photoFieldLabel} hint={photoFieldHint}>
        <input
          ref={fileInputRef}
          id="photo"
          type="file"
          accept={UPLOAD_CONTENT_TYPE}
          aria-describedby={hintIdFor('photo')}
          onChange={() => {
            // A confirm-stage failure keeps failedStage 'confirming'
            // so the next Upload click retries confirm only, with
            // the same imageId. Choosing a different file is how the
            // user abandons a dead-ended retry (e.g. a repeat 409)
            // and starts over from presign instead — there is no
            // second button for that, by design.
            setFailedStage(null)
            setUploadError(null)
            pendingImageIdRef.current = null
          }}
          // Uncontrolled deliberately — a file input can't be a
          // controlled component. Cleared after success via
          // fileInputRef.current.value = '' in runUpload; do not
          // add a value prop here.
          className={FIELD_CONTROL_CLASS}
        />
      </FormField>

      <PrimaryButton
        ref={uploadButtonRef}
        type="button"
        disabled={uploadStage !== null}
        onClick={runUpload}
      >
        {uploadButtonLabel}
      </PrimaryButton>

      {chooseFileBlocked && (
        <p className="text-sm text-zinc-700">{chooseFileFirstHint}</p>
      )}

      {uploadError && (
        <ErrorNotice
          message={uploadErrorLine(failedStage, uploadError.message)}
          onRetry={runUpload}
        />
      )}

      {/* The listing fetch's own loading state renders above rather than
          sharing this region — this region announces only the three upload
          stage lines. */}
      <div role="status" aria-live="polite">
        {uploadStage && <p className="text-sm text-zinc-600">{uploadStageText(uploadStage)}</p>}
      </div>
    </section>
  )
}

export default UploadPhotoPanel
