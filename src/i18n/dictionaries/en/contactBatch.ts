import type { Dictionary } from '../../dictionary';

export const contactBatch = {
  meta: {
    proposal: 'Request proposals from several projects',
    group: 'Proposals requested together',
  },
  page: {
    backTo: '← Back to {name}',
    titleOne: 'Request a proposal from one project',
    titleMany: 'Request proposals from {count} projects',
    intro:
      'One form. Each project gets its own request with the same details, so you can compare their answers.',
    invalidTitle: 'Choose two or three projects from your list',
    invalidBody: 'The selection changed or does not belong to this list.',
    backToList: 'Back to the list →',
    /** SHCWS-53: proposals straight from a temporary comparison. */
    backToComparison: '← Back to the comparison',
    invalidComparisonTitle: 'Choose two to three published listings',
    invalidComparisonBody: 'The selection repeats a listing or one is no longer published.',
    backToCatalog: 'Back to the catalog →',
    noneTitle: 'None of these projects can receive a new request',
    noneBody: 'The reason for each one is below.',
    excludedTitle: 'Not included',
    reasons: {
      own: 'It is your project.',
      unavailable: 'Its listing is no longer published.',
      external: 'It only takes contact through its official website.',
    },
    unavailableName: 'Project not available',
    existing:
      'You already wrote to them. We will not send another request: their conversation will show alongside the others.',
    viewThread: 'View conversation →',
  },
  form: {
    aria: 'Request proposals from several projects',
    recipientsLabel: 'To',
    questionsLegend: 'Ask everyone the same',
    questionsHint:
      'The questions you tick are added at the end of your need, so the answers can be compared.',
    questionsHeading: 'To compare options, it would help if you could share:',
    questions: {
      pricing: 'Price and how you charge',
      implementation: 'Implementation time and steps',
      invoicing: 'Invoicing that meets my country’s tax requirements',
      integrations: 'Integrations with the tools we already use',
      support: 'Support and onboarding after we sign',
    },
    needTooLong:
      'Your need and the questions add up to more than 2000 characters. Shorten it or untick a question.',
    review: 'Review requests',
    reviewTitle: 'This is what each project will receive',
    reviewNote:
      'Each project only receives its own request, with these same details: it does not know who else you wrote to and does not see your lists, saved projects or notes.',
    consentLegend: 'Authorize each recipient',
    consentScope:
      'Each authorization covers only this request: your name, your account email, your company and what you wrote. Your saved projects, lists and notes are not shared.',
    consentFor: 'I authorize sharing these details with the account that owns {project}.',
    consentRequired: 'Authorize at least one project to send.',
    existingRow: '{project}: you already wrote to them, nothing new is sent.',
    sendOne: 'Send to 1 project',
    sendMany: 'Send to {count} projects',
    sending: 'Sending…',
    edit: 'Edit details',
  },
  results: {
    title: 'What was sent',
    sent: 'Sent to {project}',
    existing: 'You had already written to {project}: no new request was sent',
    failed: 'Not sent to {project}',
    viewThread: 'View conversation →',
    retry: 'Retry what failed',
    retrying: 'Retrying…',
    retryNote: 'Retrying is safe: whatever was already sent is not duplicated.',
    viewGroup: 'See the answers together →',
    notGrouped:
      'The requests that were sent are in My contacts, but we could not group them. Retry to see them together.',
    myContacts: 'See my contacts',
  },
  group: {
    back: '← My contacts',
    title: 'Proposals requested together',
    sentOn: 'Sent on',
    fromList: 'from your list',
    privacy:
      'Each project only received its own request and does not know who else you wrote to. Here you see their answers side by side.',
    earlier: 'You had written to them before',
    turnMine: 'Your turn to reply',
    turnTheirs: 'Waiting for their reply',
    lastReply: 'Their latest reply',
    noReply: 'No reply yet.',
    open: 'Open conversation →',
    sharedTitle: 'What you sent to everyone',
  },
  inbox: {
    title: 'Group proposals',
    replied: '{replied} of {total} replied',
    sent: 'Sent',
    view: 'See together →',
  },
  detail: {
    partOf: 'This request is part of a proposal sent to several projects.',
    view: 'See the answers together →',
  },
  errors: {
    incomplete:
      'Fill in your details, choose one to three projects and authorize each one before sending.',
    listUnavailable: 'This list is no longer available.',
    notInList: 'A project is no longer on this list. Reload and check the selection.',
    consentMissing: 'Authorize each project that will receive the request.',
    createLimit: 'You have sent too many requests. Nothing was sent; try again later.',
    itemUnconfirmed: 'We could not confirm it was sent. Check My contacts before trying again.',
  },
} as const satisfies Dictionary['contactBatch'];
