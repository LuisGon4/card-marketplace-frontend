import PageHeading from '../components/PageHeading'
import TextLink from '../components/TextLink'
import LegalDocument from '../components/LegalDocument'
import { LAST_UPDATED } from '../helpers/legal/document'
import { TERMS_SECTIONS } from '../helpers/legal/terms'

function TermsPage() {
  return (
    <div className="space-y-6">
      <PageHeading>Terms of Service</PageHeading>
      <LegalDocument sections={TERMS_SECTIONS} lastUpdated={LAST_UPDATED} />
      <p className="text-sm text-zinc-700">
        See also our <TextLink to="/privacy">Privacy Policy</TextLink>.
      </p>
    </div>
  )
}

export default TermsPage
