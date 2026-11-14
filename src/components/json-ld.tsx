/**
 * Structured data for search engines and assistants. Serialized so that text a person
 * wrote (a list name, a review) can never close the <script> tag: `<` becomes <.
 * Never put sponsored placements here (docs/ads.md).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(
          /</g,
          '\\u003c',
        ),
      }}
    />
  );
}
