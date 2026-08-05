import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import { apiPost } from '../api/client'
import { putPresignedFile } from '../api/s3'
import PageHeading from '../components/PageHeading'
import TextLink from '../components/TextLink'
import ErrorNotice from '../components/ErrorNotice'
import ImageGallery from '../components/ImageGallery'
import EmptyState from '../components/EmptyState'
import PrimaryButton from '../components/PrimaryButton'
import FormField from '../components/FormField'
import { FIELD_CONTROL_CLASS, hintIdFor } from '../lib/fields'
import {
  imagesPageHeading,
  loadingListingText,
  emptyPhotosCopy,
  nonOwnerUploadCopy,
  doneViewListingLabel,
  addPhotoPanelHeading,
  photoFieldLabel,
  photoFieldHint,
  uploadButtonLabel,
  chooseFileFirstHint,
  uploadStageText,
  uploadErrorLine,
} from '../helpers/sell/copy'

// Reads a listing's existing photos, gates the upload slot on ownership,
// and runs the three-leg upload: presign, PUT to S3, confirm.
function ListingImagesPage({ authStatus, user }) {
  const { id } = useParams()
  const headingRef = useRef(null)

  // useParams() returns id already URL-decoded — re-encoding here is what
  // keeps the request scoped to a single path segment (ListingDetailPage
  // does the same).
  const path = `/api/listings/${encodeURIComponent(id)}`
  const { data, loading, error, refetch } = useFetch(path)

  const loaded = !loading && !error && data !== null
  // Exact id comparison, never a username match — the same rule
  // ListingDetailPage's own-listing check uses.
  const isOwner = authStatus === 'signedIn' && data?.sellerId === user?.id

  function focusPageHeading() {
    headingRef.current?.focus()
  }

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
          `/api/listings/${encodeURIComponent(id)}/images/presign`,
          { fileSizeBytes },
          { signal: controller.signal }
        )
      } catch (err) {
        // An aborted fetch rejects with a DOMException — check the signal
        // before touching state, or an unmount after navigating away would
        // still write a stale error.
        if (controller.signal.aborted) return
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
        `/api/listings/${encodeURIComponent(id)}/images`,
        { imageId },
        { signal: controller.signal }
      )
    } catch (err) {
      if (controller.signal.aborted) return
      setUploadStage(null)
      setFailedStage('confirming')
      setUploadError(err)
      return
    }
    if (controller.signal.aborted) return

    setUploadStage(null)
    setFailedStage(null)
    setUploadError(null)
    pendingImageIdRef.current = null
    // A file input can't be a controlled component — this is the only way
    // to clear the selection after success. Do not add a `value` prop.
    fileInputRef.current.value = ''
    // No optimistic append: the photo appearing in the gallery is the only
    // confirmation that means anything after a three-leg upload.
    refetch()
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>{imagesPageHeading}</PageHeading>

      {loaded && (
        <p className="text-sm text-zinc-700">
          <TextLink to={`/listings/${id}`}>{data.cardName}</TextLink>
        </p>
      )}

      {loading && <p className="text-sm text-zinc-600">{loadingListingText}</p>}

      {/* The listing fetch's own loading state renders above rather than
          sharing this region — this region announces only the three upload
          stage lines. */}
      <div role="status" aria-live="polite">
        {uploadStage && <p className="text-sm text-zinc-600">{uploadStageText(uploadStage)}</p>}
      </div>

      {error && (
        <ErrorNotice
          message={error.message}
          onRetry={() => {
            refetch()
            focusPageHeading()
          }}
        />
      )}

      {loaded && (
        <>
          {data.imageUrls.length > 0 ? (
            <ImageGallery imageUrls={data.imageUrls} cardName={data.cardName} />
          ) : (
            <EmptyState heading={emptyPhotosCopy.heading} body={emptyPhotosCopy.body} />
          )}

          {/* A non-owner sees this line instead of the upload panel. The
              server remains the real enforcement either way — this client
              gate is cosmetic. */}
          {isOwner ? (
            <section className="space-y-4 rounded border border-zinc-200 p-4">
              <h2 className="text-base font-medium text-zinc-900">{addPhotoPanelHeading}</h2>

              <FormField id="photo" label={photoFieldLabel} hint={photoFieldHint}>
                <input
                  ref={fileInputRef}
                  id="photo"
                  type="file"
                  accept="image/jpeg"
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

              <PrimaryButton type="button" disabled={uploadStage !== null} onClick={runUpload}>
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
            </section>
          ) : (
            <p className="text-sm text-zinc-700">{nonOwnerUploadCopy}</p>
          )}

          <TextLink to={`/listings/${id}`}>{doneViewListingLabel}</TextLink>
        </>
      )}
    </div>
  )
}

export default ListingImagesPage
