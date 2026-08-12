import PageHeading from '../components/PageHeading'
import TextLink from '../components/TextLink'
import LegalDocument from '../components/LegalDocument'
import { LAST_UPDATED } from '../helpers/legal/document'
import { PRIVACY_SECTIONS } from '../helpers/legal/privacy'

function PrivacyPage() {
  return (
    <div className="space-y-6">
      <PageHeading>Privacy Policy</PageHeading>
      <LegalDocument sections={PRIVACY_SECTIONS} lastUpdated={LAST_UPDATED} />
      <p className="text-sm text-zinc-700">
        See also our <TextLink to="/terms">Terms of Service</TextLink>.
      </p>
    </div>
  )
}

export default PrivacyPage
