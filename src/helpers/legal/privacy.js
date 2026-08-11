import { CONTACT_EMAIL, SERVICE_NAME } from './document'

export const PRIVACY_SECTIONS = [
  {
    id: 'overview',
    heading: 'Overview',
    blocks: [
      {
        type: 'p',
        text: `This policy explains what personal information ${SERVICE_NAME} collects, why we collect it, and what you can do about it. It covers this website and the service behind it.`,
      },
      {
        type: 'p',
        text: `${SERVICE_NAME} is the controller of the personal information described here. You can reach us at ${CONTACT_EMAIL}.`,
      },
      {
        type: 'p',
        text: `The short version: we collect the account details Google gives us when you sign in, whatever you type into a listing or a message, the photos you upload, and ordinary server logs. We use them to run the service. We do not sell your personal information, we show no advertising, and we use no analytics or tracking of any kind.`,
      },
    ],
  },
  {
    id: 'what-we-collect',
    heading: 'Information we collect',
    blocks: [
      {
        type: 'p',
        text: `We collect the following.`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Account information from Google`,
            detail: `When you sign in with Google, Google confirms who you are and we store an account record containing your email address, a username, and an internal identifier. We never receive your Google password.`,
          },
          {
            term: `Listing content`,
            detail: `Everything you enter when you post a card: the card, its condition and printing, the asking price, an optional description, and a location. The location is free text you type yourself, and it is shown publicly on the listing.`,
          },
          {
            term: `Photos`,
            detail: `Images you upload for a listing, and whatever those images happen to show. Uploaded photos are stored at public web addresses, which is covered under "What is publicly visible."`,
          },
          {
            term: `Messages`,
            detail: `The content and timing of messages you send through the service, and who they were sent to. Messages are stored on our servers so a conversation can be reopened.`,
          },
          {
            term: `Server logs`,
            detail: `Our servers and our hosting providers record ordinary technical information about requests: IP address, browser user agent, what was requested, and a timestamp. This happens on every request, whether or not you are signed in.`,
          },
        ],
      },
      {
        type: 'p',
        text: `We do not ask for and do not want your payment card details, bank details, or government identification numbers. We process no payments, so we have no reason to hold any of it. Do not send any of it through a message.`,
      },
    ],
  },
  {
    id: 'cookies',
    heading: 'Cookies and local storage',
    blocks: [
      {
        type: 'p',
        text: `We use exactly two cookies. Both are strictly necessary to sign you in and to keep your account safe, so neither is used for tracking.`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Session cookie`,
            detail: `Set by our server when you finish signing in with Google. It is how the service knows a request comes from you. It is marked HttpOnly, so no script on the page can read it, and it is sent only over an encrypted connection. It stops working when your session ends.`,
          },
          {
            term: `XSRF-TOKEN`,
            detail: `A cross-site request forgery token. The page reads it and echoes it back on every request that changes something, which is how our server tells a real action in this tab from one another site tried to make your browser send. It is readable by the page's own script by design, and it says nothing about you.`,
          },
        ],
      },
      {
        type: 'p',
        text: `Nothing else is stored in your browser. The site writes nothing to local storage or session storage, and it loads no script from any other company. There are no analytics cookies, no advertising cookies, no tracking pixels, no session-replay tools, and no third-party embeds.`,
      },
      {
        type: 'p',
        text: `Because both cookies are strictly necessary, there is no cookie banner and nothing here to opt out of. Blocking them in your browser will stop you from signing in.`,
      },
    ],
  },
  {
    id: 'how-we-use',
    heading: 'How we use information',
    blocks: [
      {
        type: 'p',
        text: `We use personal information for the purposes below. If you are in the European Economic Area or the United Kingdom, the legal basis for each purpose is named with it.`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Running your account`,
            detail: `Signing you in, recognising you across requests, and showing your username where it belongs. Legal basis: performance of our contract with you.`,
          },
          {
            term: `Publishing your listings`,
            detail: `Storing and showing the listings and photos you post so that other people can find them. Legal basis: performance of our contract with you.`,
          },
          {
            term: `Delivering your messages`,
            detail: `Storing messages and delivering them to the other participant in a conversation. Legal basis: performance of our contract with you.`,
          },
          {
            term: `Keeping the service secure and working`,
            detail: `Server logs, cross-site request forgery protection, diagnosing errors, and preventing abuse. Legal basis: our legitimate interest in operating a secure and reliable service.`,
          },
          {
            term: `Enforcing our terms`,
            detail: `Investigating reports, removing listings, and restricting accounts that break the Terms of Service. Legal basis: our legitimate interest in protecting our users and the service.`,
          },
          {
            term: `Complying with the law`,
            detail: `Responding to lawful requests and keeping records we are required to keep. Legal basis: compliance with a legal obligation.`,
          },
        ],
      },
      {
        type: 'p',
        text: `We do not use your information to build a profile of you, to advertise to you, or to make any automated decision that produces a legal or similarly significant effect on you.`,
      },
    ],
  },
  {
    id: 'public-information',
    heading: 'What is publicly visible',
    blocks: [
      {
        type: 'p',
        text: `Some of what you post can be seen by anyone on the internet, signed in or not. Before you post, assume the following is public:`,
      },
      {
        type: 'ul',
        items: [
          `your username, on every listing you post`,
          `the card, condition, printing, asking price, and description on each listing`,
          `the location you typed on each listing`,
          `every photo you upload`,
        ],
      },
      {
        type: 'p',
        text: `Photos deserve particular attention. They are stored with our hosting provider at ordinary public web addresses. Anyone holding a photo's address can open it directly without signing in, those addresses do not expire, and they keep working after you remove the listing the photo belonged to. We cannot make an address that someone has already saved or shared stop working.`,
      },
      {
        type: 'p',
        text: `Messages are not public. They are visible to you, to the other participant in the conversation, and to us where operating the service requires it.`,
      },
      {
        type: 'p',
        text: `Your email address is not shown to other users.`,
      },
    ],
  },
  {
    id: 'recipients',
    heading: 'Who we share information with',
    blocks: [
      {
        type: 'p',
        text: `We do not sell your personal information and we do not share it for advertising. We use a small number of service providers to run the service, and they process information on our instructions:`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Google`,
            detail: `Authentication. Google handles the sign-in and tells us who you are. Your use of Google's sign-in is also covered by Google's own privacy policy.`,
          },
          {
            term: `Amazon Web Services`,
            detail: `Hosting for our servers and database, and storage for uploaded photos.`,
          },
          {
            term: `Vercel`,
            detail: `Hosting and content delivery for this website.`,
          },
        ],
      },
      {
        type: 'p',
        text: `All three operate in the United States. We also disclose information where the law requires it, where it is necessary to investigate a breach of our terms or to protect the rights and safety of our users, and to a buyer or successor if the service is ever sold or merged, in which case this policy continues to apply until it is replaced.`,
      },
      {
        type: 'p',
        text: `Other users see what "What is publicly visible" describes, plus your username in any conversation you take part in.`,
      },
    ],
  },
  {
    id: 'retention',
    heading: 'How long we keep information',
    blocks: [
      {
        type: 'p',
        text: `We keep your account record, your listings, your photos, and your messages for as long as your account exists.`,
      },
      {
        type: 'p',
        text: `Removing a listing deactivates it rather than erasing it. A deactivated listing stops being shown and its page stops loading, but the record stays in our database and you can reactivate it. Photos attached to it stay stored and stay reachable at their existing web addresses.`,
      },
      {
        type: 'p',
        text: `There is no self-service way to delete an account, a message, or a photo. Write to ${CONTACT_EMAIL} and we will delete what we can. The rights sections below set out how quickly we respond.`,
      },
      {
        type: 'p',
        text: `Server logs are retained by our hosting providers for a limited period under their own settings, and we use them only for security and diagnostics.`,
      },
      {
        type: 'p',
        text: `We keep information longer where we need it to comply with a legal obligation, resolve a dispute, or enforce our agreements.`,
      },
    ],
  },
  {
    id: 'gdpr-rights',
    heading: 'Your rights in the EEA and the UK',
    blocks: [
      {
        type: 'p',
        text: `If you are in the European Economic Area or the United Kingdom, the GDPR and the UK GDPR give you the following rights over your personal information.`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Access`,
            detail: `Ask whether we hold personal information about you, and get a copy of it.`,
          },
          {
            term: `Rectification`,
            detail: `Have inaccurate information corrected and incomplete information completed.`,
          },
          {
            term: `Erasure`,
            detail: `Ask us to delete your personal information where we have no overriding reason to keep it. We cannot recall copies that other people have already downloaded or saved.`,
          },
          {
            term: `Restriction`,
            detail: `Ask us to stop processing your information while a dispute about its accuracy, or about our use of it, is resolved.`,
          },
          {
            term: `Objection`,
            detail: `Object to processing we carry out on the basis of legitimate interests. We will stop unless we have compelling grounds to continue.`,
          },
          {
            term: `Portability`,
            detail: `Receive the information you gave us in a structured, commonly used, machine-readable format, or ask us to send it to another controller where that is technically feasible.`,
          },
          {
            term: `Withdrawing consent`,
            detail: `Withdraw consent at any time where we rely on it. We rely on consent for nothing, so in practice there is nothing here to withdraw.`,
          },
          {
            term: `Complaining to a regulator`,
            detail: `Lodge a complaint with your national data protection authority, or with the Information Commissioner's Office in the United Kingdom. You can do that without contacting us first, though we would rather you did.`,
          },
        ],
      },
      {
        type: 'p',
        text: `To exercise any of these rights, email ${CONTACT_EMAIL} from the address on your account and tell us what you want. There is no self-service control for this in the app; every request is handled by a person. We respond within one month of receiving a request, and if a request is complex or you have made several we may extend that by up to two further months, telling you why within the first month.`,
      },
      {
        type: 'p',
        text: `We may need to ask you for information to confirm a request is really from you. Exercising these rights is free, and we will not treat you differently for it.`,
      },
    ],
  },
  {
    id: 'ccpa-rights',
    heading: 'Your rights in California',
    blocks: [
      {
        type: 'p',
        text: `If you are a California resident, the California Consumer Privacy Act as amended by the CPRA gives you rights over the personal information we collect. In the twelve months before the date at the top of this page, we collected these categories:`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Identifiers`,
            detail: `Your email address, your username, an internal account identifier, and IP address. Collected from you and from Google when you sign in, and used to run your account and keep the service secure.`,
          },
          {
            term: `Commercial information`,
            detail: `The listings you post, including card, condition, printing, asking price, description, and location, and the conversations you take part in. Collected from you, and used to publish your listings and deliver your messages.`,
          },
          {
            term: `Internet or network activity`,
            detail: `Server log information about your requests, including IP address, browser user agent, and timestamps. Collected automatically, and used for security and diagnostics.`,
          },
          {
            term: `Visual information`,
            detail: `Photos you upload for a listing. Collected from you, and used to show your listing.`,
          },
        ],
      },
      {
        type: 'p',
        text: `On sensitive personal information there is one qualification we would rather state than gloss over: the contents of a communication count as sensitive personal information when the business is not the intended recipient, and we store the messages you send so that we can deliver them. We use them only to deliver them and to keep the service safe, never to infer anything about you. Beyond that we collect no sensitive personal information at all: no government identifiers, no financial account details, no precise geolocation, no account credentials, and nothing about health, race, ethnicity, religion, or sexual orientation.`,
      },
      {
        type: 'p',
        text: `We do not sell your personal information, and we do not share it for cross-context behavioral advertising. We never have. There is nothing to opt out of, which is why you will not find a "Do Not Sell or Share My Personal Information" link here.`,
      },
      {
        type: 'dl',
        items: [
          {
            term: `Right to know`,
            detail: `Ask what personal information we have collected about you, where we got it, why we collected it, and who we disclosed it to.`,
          },
          {
            term: `Right to delete`,
            detail: `Ask us to delete personal information we collected from you, subject to the exceptions the law allows, such as information we need to detect security incidents or to comply with a legal obligation.`,
          },
          {
            term: `Right to correct`,
            detail: `Ask us to correct inaccurate personal information we hold about you.`,
          },
          {
            term: `Right to opt out of sale or sharing`,
            detail: `We do not sell or share personal information, so there is nothing to opt out of.`,
          },
          {
            term: `Right to limit use of sensitive personal information`,
            detail: `We use the messages described above only to provide the service, which is already the limit this right sets.`,
          },
          {
            term: `Right to non-discrimination`,
            detail: `We will not deny you service, charge you a different price, or give you a lower quality of service for exercising any of these rights.`,
          },
        ],
      },
      {
        type: 'p',
        text: `To make a request, email ${CONTACT_EMAIL} from the address on your account. We confirm receipt within ten business days and respond within forty-five days, and we will tell you if we need up to another forty-five.`,
      },
      {
        type: 'p',
        text: `You can use an authorized agent. We will ask the agent for written permission signed by you, and we may still ask you to confirm the request directly. We verify a request by matching the address it comes from against the one on the account; if we cannot verify it we will tell you, and we will not act on it.`,
      },
    ],
  },
  {
    id: 'security',
    heading: 'Security',
    blocks: [
      {
        type: 'p',
        text: `We take reasonable measures to protect your information. Traffic between your browser and our servers travels over HTTPS. The session cookie is HttpOnly, so no script on the page can read it. Every request that changes something carries a cross-site request forgery token, which stops another site from making your browser act as you. Our servers and database run on managed infrastructure with access limited to those who need it.`,
      },
      {
        type: 'p',
        text: `No method of transmission or storage is completely secure, and we cannot guarantee absolute security. Keep your Google account protected, and write to ${CONTACT_EMAIL} if you think someone else has reached your account.`,
      },
      {
        type: 'p',
        text: `Photos are public by design, so none of this protects them. "What is publicly visible" explains what that means before you upload one.`,
      },
    ],
  },
  {
    id: 'children',
    heading: 'Children',
    blocks: [
      {
        type: 'p',
        text: `The service is for adults. You must be 18 or older to use it, and we do not knowingly collect personal information from anyone under 18.`,
      },
      {
        type: 'p',
        text: `If you believe someone under 18 has an account here, write to ${CONTACT_EMAIL}. We will close the account and delete the information we hold about it.`,
      },
    ],
  },
  {
    id: 'international',
    heading: 'International users',
    blocks: [
      {
        type: 'p',
        text: `We operate in the United States, and our service providers host and process information there. Using the service means your information is transferred to and stored in the United States, which may have different data protection laws from your own country.`,
      },
      {
        type: 'p',
        text: `Where we transfer personal information out of the European Economic Area or the United Kingdom, we rely on the European Commission's standard contractual clauses, together with the United Kingdom addendum to them, as the safeguard for that transfer. Ask us at ${CONTACT_EMAIL} for a copy.`,
      },
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to this policy',
    blocks: [
      {
        type: 'p',
        text: `We update this policy when the service changes or the law does. The "Last updated" date at the top of this page always reflects the current version.`,
      },
      {
        type: 'p',
        text: `If a change materially affects how we handle your personal information, we will make a reasonable effort to give notice on the site before it takes effect.`,
      },
    ],
  },
  {
    id: 'contact',
    heading: 'Contact',
    blocks: [
      {
        type: 'p',
        text: `Questions, requests, and complaints about privacy go to ${CONTACT_EMAIL}. A person reads that address; there is no automated form.`,
      },
      {
        type: 'p',
        text: `If you are in the European Economic Area or the United Kingdom and you are not satisfied with our response, you can complain to your national data protection authority. In the United Kingdom that is the Information Commissioner's Office.`,
      },
    ],
  },
]
