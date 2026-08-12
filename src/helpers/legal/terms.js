import { CONTACT_EMAIL, GOVERNING_LAW, SERVICE_NAME } from './document'

export const TERMS_SECTIONS = [
  {
    id: 'agreement',
    heading: 'Agreement to these terms',
    blocks: [
      {
        type: 'p',
        text: `These terms are a binding agreement between you and ${SERVICE_NAME} ("we," "us," "our"). They cover everything you do here: browsing listings, posting your own, and messaging other users.`,
      },
      {
        type: 'p',
        text: `By using the service you accept these terms. If you do not accept them, do not use the service.`,
      },
      {
        type: 'p',
        text: `Our Privacy Policy explains what we do with your personal information, and it is part of this agreement.`,
      },
    ],
  },
  {
    id: 'eligibility',
    heading: 'Who can use the service',
    blocks: [
      {
        type: 'p',
        text: `You must be 18 or older to use ${SERVICE_NAME}. There is no account type for minors, and we do not knowingly allow anyone under 18 to sign in, post a listing, or send a message.`,
      },
      {
        type: 'p',
        text: `By signing in you confirm that you are 18 or older and that you are able to enter into this agreement.`,
      },
      {
        type: 'p',
        text: `If we learn that an account belongs to someone under 18, we will close it and remove its listings.`,
      },
    ],
  },
  {
    id: 'what-the-service-is',
    heading: 'What the service is',
    blocks: [
      {
        type: 'p',
        text: `${SERVICE_NAME} is a venue. We host listings for trading cards and connect the people who post them with the people who want to buy them. That is the whole of what we do.`,
      },
      {
        type: 'p',
        text: `We are not a party to any sale arranged here. We do not:`,
      },
      {
        type: 'ul',
        items: [
          `process payments, hold funds, or provide escrow`,
          `ship, store, handle, or inspect any card`,
          `verify the authenticity, condition, grade, or ownership of any card`,
          `verify the identity of any buyer or seller`,
          `guarantee that a listing is accurate, that a seller will send a card, or that a buyer will pay`,
        ],
      },
      {
        type: 'p',
        text: `Everything about a sale is arranged directly between you and the other user, at your own risk: how you pay, how the card reaches you, and what happens if something goes wrong. Meet safely, use a payment method that protects you, and inspect what you receive.`,
      },
      {
        type: 'p',
        text: `We do not review users or listings before they appear. If you have a dispute with another user, you resolve it with them.`,
      },
    ],
  },
  {
    id: 'accounts',
    heading: 'Accounts and signing in',
    blocks: [
      {
        type: 'p',
        text: `You sign in with a Google account. We do not issue passwords, and we never see or store your Google password.`,
      },
      {
        type: 'p',
        text: `You are responsible for everything done under your account and for keeping your Google account secure. Do not share your account or let anyone else use it. Write to ${CONTACT_EMAIL} if you believe someone else has used it.`,
      },
      {
        type: 'p',
        text: `Your username is shown publicly on every listing you post and to the other participant in every conversation you take part in.`,
      },
      {
        type: 'p',
        text: `There is no self-service way to close an account. Write to ${CONTACT_EMAIL} and a person will handle it.`,
      },
    ],
  },
  {
    id: 'listings',
    heading: 'Listings and prohibited items',
    blocks: [
      {
        type: 'p',
        text: `A listing must describe a real card that you own and are able to sell. Describe its condition and printing accurately, price it honestly, and keep it up to date.`,
      },
      {
        type: 'p',
        text: `The location on a listing is free text that you type, and it is shown publicly. Enter a general area such as a city or region. Do not enter your home address.`,
      },
      {
        type: 'p',
        text: `Do not list:`,
      },
      {
        type: 'ul',
        items: [
          `counterfeit or replica cards, or cards presented as graded or authenticated when they are not`,
          `stolen cards, or cards you do not own or have the right to sell`,
          `anything that is illegal to sell where you or the buyer are located`,
          `anything that is not a trading card`,
        ],
      },
      {
        type: 'p',
        text: `Remove a listing once the card is no longer available. Removing a listing deactivates it rather than erasing it, which is explained under "Suspension, removal, and termination."`,
      },
    ],
  },
  {
    id: 'your-content',
    heading: 'Content you post',
    blocks: [
      {
        type: 'p',
        text: `You keep ownership of everything you post: your listing text, your photos, and your messages.`,
      },
      {
        type: 'p',
        text: `To run the service we need permission to host and show what you post. By posting content you grant us a non-exclusive, worldwide, royalty-free license to store, copy, display, and distribute it for the purpose of operating the service. Removing the content ends that license, subject to the limits described below.`,
      },
      {
        type: 'p',
        text: `You confirm that you own or have the right to post what you post, and that it does not infringe anyone else's rights.`,
      },
      {
        type: 'p',
        text: `Photos need particular care. A photo you upload is stored at an ordinary public web address. Anyone who has that address can open the photo without signing in, the address does not expire, and it keeps working after you remove the listing the photo belonged to. Do not upload a photo showing anything you would not want to be public, including faces, documents, mail, or anything carrying your address.`,
      },
      {
        type: 'p',
        text: `Do not post content that is unlawful, harassing, hateful, sexually explicit, or deceptive, or that contains someone else's personal information.`,
      },
    ],
  },
  {
    id: 'prohibited-conduct',
    heading: 'Prohibited conduct',
    blocks: [
      {
        type: 'p',
        text: `Use the service the way it is meant to be used. Do not:`,
      },
      {
        type: 'ul',
        items: [
          `scrape, crawl, or harvest listings, users, or messages by any automated means`,
          `access the service with a bot, script, or automated tool, or in any way that places unreasonable load on it`,
          `harass, threaten, stalk, or abuse another user`,
          `send spam, chain messages, or unsolicited advertising`,
          `impersonate anyone, or misrepresent who you are or your connection to anyone else`,
          `probe, scan, or test the security of the service, defeat any access control, or use another user's account`,
          `upload or transmit malware, or anything designed to damage or interfere with the service`,
          `use the service to arrange an illegal transaction or to defraud anyone`,
          `copy, resell, or redistribute any part of the service`,
        ],
      },
      {
        type: 'p',
        text: `We may investigate suspected breaches and act on them, and we may report unlawful conduct to the authorities.`,
      },
    ],
  },
  {
    id: 'messaging',
    heading: 'Messaging other users',
    blocks: [
      {
        type: 'p',
        text: `Messages you send through the service are stored on our servers and delivered to the other participant in the conversation. Through the service, only you and that participant can read them. We can access stored messages where it is necessary to operate the service, investigate abuse, or comply with the law.`,
      },
      {
        type: 'p',
        text: `Do not send payment card numbers, bank details, government identification numbers, passwords, or other sensitive information through messages. This is not the place for them, and we do not need any of it.`,
      },
      {
        type: 'p',
        text: `A message cannot be deleted once it is sent, by you or by the person who received it. Keep messages related to the listing, and to the conduct rules above.`,
      },
    ],
  },
  {
    id: 'pricing',
    heading: 'Prices and valuation data',
    blocks: [
      {
        type: 'p',
        text: `Some screens show a market price alongside a card. That figure is an estimate obtained from a third-party pricing service and cached by us. It may be out of date, incomplete, or missing entirely.`,
      },
      {
        type: 'p',
        text: `A market price is information, not advice and not an appraisal. We do not warrant that it is accurate, and it is not a promise about what a card is worth or what it will sell for. The asking price on a listing is set by the seller alone.`,
      },
      {
        type: 'p',
        text: `Where an asking price is far above the estimate we hold, we may show a flag beside it. That flag is a rough signal for your own judgement, not a verdict about the seller, and its absence is not an endorsement of a price.`,
      },
    ],
  },
  {
    id: 'intellectual-property',
    heading: 'Intellectual property',
    blocks: [
      {
        type: 'p',
        text: `The service itself, including its design and its text, belongs to us, apart from the content users post.`,
      },
      {
        type: 'p',
        text: `Card names, set names, card images, and the trademarks and artwork they contain belong to their respective owners. We are not affiliated with, endorsed by, or sponsored by any card publisher, manufacturer, or grading company. Card and set names appear here to identify what is being sold.`,
      },
      {
        type: 'p',
        text: `If you believe something here infringes your copyright or trademark, write to ${CONTACT_EMAIL} with enough detail to identify the material and your claim, and we will review it.`,
      },
    ],
  },
  {
    id: 'termination',
    heading: 'Suspension, removal, and termination',
    blocks: [
      {
        type: 'p',
        text: `We may remove a listing, restrict an account, or end your access to the service if you break these terms, if the law requires it, or if we reasonably believe it is necessary to protect other users or the service.`,
      },
      {
        type: 'p',
        text: `You can stop using the service at any time.`,
      },
      {
        type: 'p',
        text: `Removing a listing deactivates it. It stops appearing in browsing and search, and its page stops loading for everyone, including you. The record is kept rather than erased, you can reactivate it, and any photos on it stay stored and stay reachable at their existing web addresses. "How long we keep information" in the Privacy Policy has the detail.`,
      },
      {
        type: 'p',
        text: `The parts of these terms that should outlast your access do: the license covering content you have not removed, the disclaimers, the limitation of liability, indemnification, and governing law.`,
      },
    ],
  },
  {
    id: 'disclaimers',
    heading: 'Disclaimers',
    blocks: [
      {
        type: 'p',
        text: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE SPECIFICALLY DISCLAIM THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.`,
      },
      {
        type: 'p',
        text: `We do not warrant that the service will be uninterrupted, secure, or error-free, that any defect will be corrected, or that any content on it, including listings, descriptions, photos, and market prices, is accurate, complete, or reliable.`,
      },
      {
        type: 'p',
        text: `We make no warranty about any other user, or about any transaction you arrange here. You deal with other users at your own risk.`,
      },
      {
        type: 'p',
        text: `Some jurisdictions do not allow the exclusion of implied warranties. Where that is the case, the exclusions above do not apply to you, and you may have rights these terms cannot take away.`,
      },
    ],
  },
  {
    id: 'liability',
    heading: 'Limitation of liability',
    blocks: [
      {
        type: 'p',
        text: `TO THE FULLEST EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS, ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.`,
      },
      {
        type: 'p',
        text: `TO THE FULLEST EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE IS LIMITED TO ONE HUNDRED U.S. DOLLARS (US$100).`,
      },
      {
        type: 'p',
        text: `This covers anything arising from a transaction between you and another user: a card that never arrived, a payment that was never made, a card that was not what it was described to be. We are not a party to those transactions and we are not responsible for their outcome.`,
      },
      {
        type: 'p',
        text: `Nothing here limits liability that cannot be limited by law, including liability for death or personal injury caused by negligence, or for fraud or fraudulent misrepresentation. Some jurisdictions do not allow the exclusion or limitation of certain damages; where that is the case, the limits above apply only as far as the law allows.`,
      },
    ],
  },
  {
    id: 'indemnification',
    heading: 'Indemnification',
    blocks: [
      {
        type: 'p',
        text: `You agree to indemnify and hold us harmless from any third-party claim, demand, loss, liability, or expense, including reasonable legal fees, arising out of your use of the service, the content you post, your breach of these terms, or a transaction you arranged here.`,
      },
      {
        type: 'p',
        text: `We will tell you about any such claim, and you may take over its defense with counsel of your choice provided we can participate at our own expense. Do not settle a claim in a way that admits fault on our behalf or imposes an obligation on us without our written agreement.`,
      },
    ],
  },
  {
    id: 'governing-law',
    heading: 'Governing law and disputes',
    blocks: [
      {
        type: 'p',
        text: `These terms are governed by the laws of ${GOVERNING_LAW}, without regard to its conflict-of-law rules.`,
      },
      {
        type: 'p',
        text: `Any dispute relating to these terms or to the service will be brought in the courts of ${GOVERNING_LAW}, and both you and we consent to their jurisdiction.`,
      },
      {
        type: 'p',
        text: `If you are a consumer resident in the European Economic Area or the United Kingdom, nothing here deprives you of the protection of the mandatory laws of the country you live in, or of your right to bring proceedings there.`,
      },
      {
        type: 'p',
        text: `Before filing anything, write to ${CONTACT_EMAIL}. Most problems are quicker to fix that way.`,
      },
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to these terms',
    blocks: [
      {
        type: 'p',
        text: `We may change these terms as the service changes. When we do, we update the "Last updated" date at the top of this page.`,
      },
      {
        type: 'p',
        text: `If a change is significant, we will make a reasonable effort to give notice on the site before it takes effect. Continuing to use the service after a change means you accept the revised terms. If you do not accept them, stop using the service.`,
      },
    ],
  },
  {
    id: 'contact',
    heading: 'Contact',
    blocks: [
      {
        type: 'p',
        text: `Questions about these terms go to ${CONTACT_EMAIL}.`,
      },
      {
        type: 'p',
        text: `For anything about your personal information, see the Privacy Policy.`,
      },
    ],
  },
]
