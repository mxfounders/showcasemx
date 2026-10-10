import type { Dictionary } from '../../dictionary';

export const legal = {
  backHome: 'Back to home',
  pages: {
    privacidad: {
      title: 'Privacy policy',
      intro:
        'shwcs operates as a B2B directory and processes personal data in accordance with the Mexican Federal Law on the Protection of Personal Data Held by Private Parties (LFPDPPP) and, where applicable, the General Data Protection Regulation (GDPR). Data controller: shwcs, contact hola@shwcs.site.',
      sections: [
        {
          id: 'bases-legales',
          title: 'Legal bases and types of data',
          paragraphs: [
            'shwcs operates under the principles of data minimization and transparency. We process data under four legal bases: explicit consent (recorded digitally together with the version of the clause you accepted), contractual necessity (to provide the platform and the services you buy), compliance with legal obligations (such as tax obligations) and legitimate interest (to ensure the security and availability of the system).',
            'We collect identity and access data through OAuth protocols (such as Google), limited strictly to your email address and a secure unique identifier. We do not store, process or have visibility into external credentials or any other services linked to your identity provider.',
            'At an operational level, we collect the company information, descriptions and digital assets you choose to add to your profile, your saved lists, and metadata about your interaction with the system (declared role, sector, feature usage events).',
          ],
        },
        {
          id: 'newsletter',
          title: 'Newsletter and email communications',
          paragraphs: [
            'Data controller: shwcs (hola@shwcs.site). Purpose: to send editorial updates, catalog news and content related to business software and services. The newsletter may include sponsored mentions of catalog projects, always labeled as such; we never share your email with advertisers or use it for commercial profiling.',
            'Legal basis: explicit consent. When you subscribe through the form on the site, you give free, specific, informed and unambiguous consent, whose version (newsletter-v2 or later) and date are recorded in our database. Consent can be withdrawn at any time without consequences.',
            'Data processed: only your email address and, if you provide them voluntarily, your name, role (Founder / Buyer) and industry. This data is not used to build behavioral profiles and is not combined with external sources.',
            'Retention: data is kept while the subscription is active. If you unsubscribe, your email address is marked as unsubscribed (unsubscribed_at) and, due to audit obligations, it is not automatically removed from the historical record of consents. You can request complete deletion by emailing hola@shwcs.site.',
            'Sending subprocessor: emails are delivered through Resend (resend.com), a US-based provider subject to the EU-US Data Privacy Framework. Resend acts as a data processor and receives only the recipient address, the sender and the content of the message; it has no access to any other data in your account.',
            'How to unsubscribe: every email includes an unsubscribe link at the bottom. You can also unsubscribe at any time by emailing hola@shwcs.site with the subject "Baja newsletter". Unsubscribe requests are processed within a maximum of 48 business hours.',
            'How to withdraw consent: withdrawing consent does not affect the lawfulness of processing carried out before it. To withdraw it formally, simply unsubscribe as described above or write to hola@shwcs.site.',
          ],
        },
        {
          id: 'subprocesadores',
          title: 'Infrastructure and subprocessors',
          paragraphs: [
            'All information is processed on enterprise-grade infrastructure. We use hosting and file storage from Vercel (vercel.com), cloud databases (Neon, hosted on AWS us-east-1), the transactional email provider Resend and, for sponsored-slot payments, Stripe (stripe.com). These subprocessors meet encryption standards in transit (TLS 1.2+) and at rest (AES-256).',
            'By using shwcs, you acknowledge that information may be routed, processed or stored on servers that our subprocessors distribute geographically. We require confidentiality agreements and strict security measures from our technology supply chain, but shwcs is not liable for force majeure events or breaches originating in the underlying infrastructure.',
          ],
        },
        {
          id: 'privacidad-transaccional',
          title: 'Transactional privacy and third parties',
          paragraphs: [
            'The shwcs architecture strictly separates public information from private information. Drafts, content under review, your analytical notes and your lists (unless you state otherwise) reside in silos accessible exclusively to your account.',
            "The contact component is a passive conduit. When you start a connection request with a listed project, you give your explicit consent to transmit your profile information, email and the context of your message to the recipient. From delivery onward, processing is subject to the recipient's policies. shwcs has no authority to audit or revoke that subsequent use.",
            'The reviews and comments you publish are public: they show the name you enter and, if you add them, your country and company size. To show a review\'s verification level ("Verified email" or "Company email") we use whether you confirmed your email and its domain; we never publish your email or its domain. You can edit or delete your reviews at any time, and they are included in your data export.',
            "If you publish a solution you can declare its tax ID (in Mexico, the RFC). It stays private: we only use it to check public registries — in Mexico, the SAT's article 69-B list — and to show the result on your listing, never the ID itself. If you prove a purchase in a review, we send the SAT the fiscal folio, the RFCs and the total of the CFDI to check its status; we keep only the result, the date and an irreversible fingerprint of the folio that prevents the same receipt from being used twice.",
          ],
        },
        {
          id: 'pagos',
          title: 'Payments and sponsored slots',
          paragraphs: [
            'When you book a sponsored slot, you pay on Stripe’s secure page (stripe.com). Stripe receives your card or other payment details directly; shwcs never receives or stores them. During payment Stripe also collects your billing address and, if you provide it, your tax ID, to calculate taxes and issue the receipt.',
            'shwcs keeps a record of each booking: the listing and slot booked, the dates, the amounts, taxes and refunds, the account email, the version of the conditions accepted and the transaction identifiers at Stripe. Purpose: to perform the contract, issue receipts, handle cancellations, refunds and disputes, and meet tax and accounting obligations. Legal bases: performance of a contract and compliance with legal obligations.',
            'Stripe acts as a processor to handle the payment and, for fraud prevention and the regulatory compliance of financial services, as an independent controller under its own privacy policy (stripe.com/privacy). Its servers may be located outside your country, including in the United States.',
            'Retention: booking and payment records are kept for as long as applicable tax and accounting law requires, even if you delete your listing or your account. In that case they are unlinked from your account and only what that obligation needs is kept.',
            'Measuring sponsored slots: we count impressions and clicks as daily totals, without cookies or visitor identifiers, and we honor DNT and GPC signals. Advertisers see only those totals—never who saw or opened their ad, who saved their listing, or any data from your account.',
          ],
        },
        {
          id: 'derechos',
          title: 'Your ARCO and global rights',
          paragraphs: [
            'You may exercise at any time your rights of Access, Rectification, Cancellation and Opposition (ARCO) under the applicable data protection laws, as well as the extended GDPR rights (portability, restriction of processing, right to be forgotten). Write to us at hola@shwcs.site stating the right you wish to exercise and, if possible, the email associated with your account.',
            'Response time: 20 business days to confirm receipt and resolve your request (extendable by 20 additional business days when its complexity justifies it). Some rights can be exercised directly from your account dashboard (profile editing, list deletion, request deletion). For complete technical deletion, a request by email guarantees erasure across all subsystems, including encrypted backups within their rotation cycles. Erasure does not reach the payment records we must keep by law, described in “Payments and sponsored slots”.',
            'If you reside in the European Union and believe the processing infringes the GDPR, you have the right to lodge a complaint with the supervisory authority of your Member State. In Mexico, the competent authority is the Secretaría Anticorrupción y Buen Gobierno (Ministry of Anti-Corruption and Good Governance), which took over the functions of the former INAI under the LFPDPPP in force since 21 March 2025. If you reside in another country, you may contact the data protection authority of your jurisdiction.',
            'shwcs is a B2B directory designed exclusively for professionals and business entities. The service is not intended for consumers or for anyone under 18 years of age. We will immediately delete any account or subscription that does not meet this requirement.',
          ],
        },
        {
          id: 'telemetria',
          title: 'Auditing, telemetry and changes to this policy',
          paragraphs: [
            'We deploy telemetry instrumentation to ensure performance, prevent abuse (rate limiting) and generate visibility metrics for founders. This processing uses ephemeral counters and irreversible hash functions. We do not build individual profiles or use cross-site tracking cookies.',
            'This policy may be updated. When changes are material, we will notify active newsletter subscribers at least 15 days in advance. The current version will always be available at shwcs.site/privacidad with its last-updated date. Last reviewed: October 2026.',
          ],
        },
      ],
    },
    terminos: {
      title: 'Terms of service',
      intro:
        'Binding terms and liability framework applicable to all interactions, accounts and contracts related to the shwcs platform.',
      sections: [
        {
          id: 'naturaleza',
          title: 'Nature of the service and jurisdiction',
          paragraphs: [
            'shwcs operates as an informational directory and a discovery channel for technology solutions, and sells sponsored slots that are labeled as such. We are not providers, distributors, brokers, consultants or agents of any of the entities listed in the catalog.',
            'Any use of the platform constitutes full acceptance of these terms. Users who represent a company warrant that they have the legal authority to bind that entity to these terms.',
          ],
        },
        {
          id: 'garantias',
          title: 'Comprehensive limitation of warranties',
          paragraphs: [
            'Our platform is provided "AS IS" and "AS AVAILABLE". shwcs expressly disclaims any warranty, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, quality or non-infringement.',
            'We do not guarantee server availability (uptime), the intact preservation of unsaved information, or that the service will be free of errors, interruptions or cyberattacks.',
          ],
        },
        {
          id: 'responsabilidad',
          title: 'Maximum disclaimer of liability',
          paragraphs: [
            'Under no circumstances, and under no legal theory (tort, contract, negligence or strict liability), shall shwcs, its directors, employees or affiliates be liable for indirect, incidental or punitive damages, lost profits, loss of data or business interruption resulting from the use of, or inability to use, the platform.',
            'Any evaluation, technical audit, solvency review and negotiation of agreements (SLAs, NDAs, service contracts) is the sole and absolute responsibility of the buyer and the provider. shwcs is fully released from any dispute resulting from those interactions.',
          ],
        },
        {
          id: 'propiedad-intelectual',
          title: 'Intellectual property and absolute restrictions',
          paragraphs: [
            'The source code, algorithms, data architecture, logos, interface design (UI/UX) and the compilation of the shwcs database are protected by international intellectual property laws.',
            'Any form of reverse engineering, systematic data extraction (scraping, crawling, spidering), database mining, resale of the service or creation of derivative works without express written authorization is strictly prohibited.',
          ],
        },
        {
          id: 'contenido',
          title: 'Content, licenses and moderation',
          paragraphs: [
            'By submitting assets, text, logos and descriptions to shwcs, the user retains ownership of their intellectual property but grants shwcs a worldwide, perpetual, royalty-free and transferable license to host, run, modify (for technical display purposes) and distribute that content on the platform.',
            'The user assumes full legal responsibility for the originality of, and the rights to, that content.',
            'shwcs exercises unilateral moderation authority. We reserve the final, unappealable right to suspend accounts, reject applications, reduce visibility or remove listings immediately and without the need for justification if we determine legal risk, impersonation, low quality or a violation of the philosophy of the service.',
          ],
        },
        {
          id: 'resenas',
          title: 'Reviews',
          paragraphs: [
            "A review must describe your own experience with the solution. You may not review your own solution, your employer's or a direct competitor's, or publish reviews in exchange for payments, discounts or other benefits that depend on what you say.",
            'The publisher of the solution can reply publicly but cannot edit or delete reviews. shwcs may hide a review that breaks these rules, contains third-party personal data or is offensive; its author will see the reason and can correct it.',
            'Reviews influence catalog order under the rules published at /criterios. No payment changes a review, its visibility or its weight.',
          ],
        },
        {
          id: 'publicidad',
          title: 'Advertising and sponsored slots',
          paragraphs: [
            'shwcs sells sponsored slots: a place labeled “Sponsored” on category pages, on the home page or, once it is being sent, in the newsletter. Each booking covers whole calendar days, from 00:00 to 23:59 Mexico City time, for a specific listing and slot. The price is the number of days times the daily rate in effect when you pay; it is paid in advance and never renews automatically.',
            'Only accounts whose listing has been approved by the editorial team can buy slots, and only businesses or professionals buying for their trade. By booking, you confirm that you buy in that capacity and that you have authority to bind the entity you represent.',
            'Payment does not buy a listing’s approval or its position in the catalog. Sponsored slots are shown apart from organic results and always labeled; they do not affect the order of the catalog, search, collections or community lists, and they are not an endorsement, verification or certification by shwcs.',
            'Prices are in US dollars (USD) or Mexican pesos (MXN), as you choose, before tax. Applicable taxes, such as VAT, are calculated and added at payment from your billing address and tax ID. Payment is processed by Stripe and a booking is confirmed only when Stripe confirms the charge; an unpaid booking is released. A rate change applies to new bookings only. Receipts are issued through Stripe; if you need a tax receipt specific to your country, write to hola@shwcs.site before buying.',
            'You can cancel a booking from your account at any time. Every booked day that starts at least 24 hours after you cancel is refunded; days that have started or start within 24 hours count as delivered and keep showing. Example: if on Monday at 10:00 you cancel a Monday-to-Sunday booking, Monday and Tuesday are shown and Wednesday through Sunday are refunded. If you cancel at least 24 hours before the first day, the refund is in full.',
            'We may decline a booking before payment or remove a slot at any time. If we remove it on our own initiative or for reasons not attributable to you, we refund every day not served, including the current day. If we remove it because the listing or its content breaches these terms (for example, misleading information or impersonation), the slot stops at once and we refund the remaining full days from the next day on, except in cases of fraud, unlawful content or deliberate deception, where we may withhold the amount of the unserved days to the extent the law allows. If your listing stops being published during a booking, the slot stops showing and we will review the case to refund the unserved days under this paragraph.',
            'If, for reasons attributable to shwcs, a slot is not shown for four or more cumulative hours on a booked day, or the newsletter is not sent on the booked date, that day counts as not delivered and you may choose a make-good day in the same slot or a pro-rata refund of that day. You must claim it within 30 days after the booking ends by writing to hola@shwcs.site. If force majeure prevents a slot from showing for more than five business days, either party may cancel the remaining days with a refund of those not served. These are the only remedies for delivery failures; lower traffic, fewer clicks or fewer contacts are not failures.',
            'We do not guarantee impressions, clicks, contacts, sales or any business result. Slot metrics are aggregated totals that may miss events (because of content blockers or DNT and GPC signals); they are informational and are not a basis for billing.',
            'Refunds go to the original payment method, in the original currency, and include the proportional share of taxes. They may take 5 to 10 business days to appear, depending on your bank. Currency differences and fees charged by third parties are not refunded.',
            'Before disputing a charge with your bank, write to us: we resolve most cases directly. While a dispute is open, the slot is paused, we cannot issue refunds outside that process and we may suspend new purchases by the account.',
            'Deleting your account counts as cancelling your active and future bookings under the 24-hour rule. We keep payment records for as long as the law requires, as the Privacy policy explains.',
            'You are responsible for the accuracy of your listing and for complying with the advertising and consumer protection laws that apply to you. The indemnification section of these terms also applies to sponsored slots.',
          ],
        },
        {
          id: 'indemnidad',
          title: 'Indemnification (Hold Harmless)',
          paragraphs: [
            'The user agrees to indemnify, defend and hold harmless shwcs and its affiliates from and against any claim, damage, obligation, loss, liability, cost or debt, and expense (including legal fees) arising from: (a) their use of and access to the platform; (b) their violation of any term set out herein; or (c) any claim arising from their content or their interactions with third parties through our channel.',
          ],
        },
        {
          id: 'fuerza-mayor',
          title: 'Force majeure and modifications',
          paragraphs: [
            'shwcs shall not be liable for any delay or failure in performance resulting directly or indirectly from causes beyond our reasonable control (strikes, internet outages, natural disasters, government actions).',
            'We reserve the exclusive right to alter, update or modify these terms at any time. Continued use of the services after any revision constitutes binding consent to the new terms.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies and measurement',
      intro:
        'shwcs uses only the technical cookies required for the session to work securely. We do not use third-party analytics cookies or advertising tracking.',
      sections: [
        {
          id: 'sesion',
          title: 'Session cookies',
          paragraphs: [
            'The sign-in cookie is HttpOnly, SameSite=Lax and Secure in production. It cannot be read by client-side JavaScript or shared across sites. The Google sign-in flow uses a temporary security cookie (state) that expires in ten minutes and is deleted automatically when the flow completes.',
          ],
        },
        {
          id: 'metricas',
          title: 'Aggregated metrics without identification',
          paragraphs: [
            'The listing view and click counter works through irreversible server-side hashes. It does not create analytics cookies, does not generate a permanent visitor identifier and does not build a behavioral profile. The counters respect DNT and GPC signals. They may miss events because of content blockers or technical limitations.',
          ],
        },
        {
          id: 'servicios-externos',
          title: 'External services',
          paragraphs: [
            "The websites, demos and social networks you open from shwcs have their own cookie policies and are responsible for how they process data. shwcs does not control, share data with, or take responsibility for those third parties' cookies.",
            'When you pay for a sponsored slot, payment takes place on Stripe’s page, which may use its own cookies needed for payment and fraud prevention under its policy.',
          ],
        },
        {
          id: 'sin-publicidad',
          title: 'No advertising or retargeting cookies',
          paragraphs: [
            'shwcs does not use, and does not plan to use, advertising cookies, tracking pixels (Facebook Pixel, Google Ads, etc.) or any retargeting technology. We do not sell visitor data to advertising networks.',
            'shwcs’s sponsored slots use no cookies or pixels either: they are measured in aggregate and first-party, like the rest of our metrics.',
          ],
        },
      ],
    },
  },
} as const satisfies Dictionary['legal'];
