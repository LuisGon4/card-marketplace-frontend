import { TEXT_LINK_CLASS } from '../lib/links'

// One renderer per block type. A section's blocks are plain data, so nothing
// here parses markup: there is no inline formatting and no
// dangerouslySetInnerHTML anywhere in this component.
function Block({ block }) {
  if (block.type === 'ul') {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }

  if (block.type === 'dl') {
    return (
      <dl className="space-y-2 text-sm text-zinc-700">
        {block.items.map(({ term, detail }) => (
          <div key={term}>
            <dt className="font-medium text-zinc-900">{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return <p className="text-sm text-zinc-700">{block.text}</p>
}

function LegalDocument({ sections, lastUpdated }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">Last updated: {lastUpdated}</p>
      {/* Plain anchors, not TextLink: these are in-page fragment links, and the
          browser's own handling is what scrolls to the section and moves the
          sequential focus starting point there. A router Link would change the
          location without either. */}
      <nav aria-label="On this page">
        <ul className="space-y-1 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className={TEXT_LINK_CLASS}>
                {section.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="space-y-3">
          <h2 className="text-base font-medium text-zinc-900">{section.heading}</h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </div>
  )
}

export default LegalDocument
