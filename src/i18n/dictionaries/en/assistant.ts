import type { Dictionary } from '../../dictionary';

export const assistant = {
  card: {
    title: 'AI assistants',
    description:
      'Connect Claude, Cursor or another MCP-compatible assistant so it can create and complete your listings from the conversation. It can only touch your listings, and nothing is published without review by the shwcs team.',
    guide: 'How to connect it',
    empty: 'You haven’t created any tokens yet.',
    create: 'Create token',
    loadError: 'We couldn’t read your tokens right now. Please try again in a moment.',
    form: {
      title: 'New token',
      name: 'Name',
      namePlaceholder: 'Claude on my laptop',
      nameHint: 'So you can recognize it later. Only you see it.',
      lifetime: 'Expires in',
      days: '{days} days',
      year: '1 year',
      scope: 'What it can do',
      scopeValue:
        'Only your listings: create drafts, complete them, upload screenshots and submit them for review.',
      password: 'Your password',
      code: 'Two-step verification code',
      codeHint: 'From your authenticator app, or one of your backup codes.',
      submit: 'Create token',
      pending: 'Creating…',
      cancel: 'Cancel',
    },
    created: {
      title: 'Copy your token now',
      body: 'This is the only time you’ll see it. Treat it like a password: whoever has it can edit your listings until it expires or you revoke it.',
      label: 'Your token',
      copy: 'Copy',
      copied: 'Copied',
      next: 'Next step: paste it into your assistant.',
      done: 'I’ve saved it',
    },
    token: {
      scope: 'My listings',
      created: 'Created {date}',
      expires: 'Expires {date}',
      expired: 'Expired {date}',
      lastUsed: 'Last used: {date}',
      neverUsed: 'Not used yet',
      status: {
        active: 'Active',
        revoked: 'Revoked',
        expired: 'Expired',
        passwordChanged: 'Stopped working when you changed your password',
      },
      revoke: 'Revoke',
      revokeTitle: 'Revoke “{name}”',
      revokeBody:
        'The assistant using it can no longer get in from its next call. This can’t be undone.',
      revokeConfirm: 'Revoke token',
      revokePending: 'Revoking…',
      cancel: 'Cancel',
    },
    activity: {
      title: 'What your tokens did',
      description:
        'The latest 40 actions. We keep which tool was used, on which listing and how it ended; never what the assistant wrote.',
      empty: 'No assistant has used your tokens yet.',
      when: 'When',
      token: 'Token',
      action: 'Action',
      solution: 'Listing',
      result: 'Result',
      ok: 'Done',
      error: 'Failed',
      noSolution: 'No listing',
      unnamed: 'Untitled draft',
      tools: {
        estado_de_mis_fichas: 'Checked your listings',
        crear_borrador: 'Created a draft',
        ver_lo_que_falta: 'Checked what’s missing',
        actualizar_borrador: 'Updated a draft',
        subir_captura: 'Uploaded a screenshot',
        enviar_a_revision: 'Submitted for review',
      },
    },
    errors: {
      useAccount: 'Manage your tokens from your shwcs account.',
      signIn: 'Your session ended. Please sign in again.',
      name: 'Give it a name of up to 60 characters.',
      lifetime: 'Choose when it expires.',
      password: 'Enter your password.',
      passwordWrong: 'That password isn’t right.',
      code: 'Enter the code from your authenticator app, or one of your backup codes.',
      codeWrong: 'That code isn’t valid or was already used.',
      tooMany: 'Too many attempts. Please wait a moment.',
      limit: 'You already have 10 active tokens. Revoke one before creating another.',
      changed: 'Your password changed in the meantime. Please reload the page.',
      notFound: 'That token is no longer active.',
      unavailable: 'We couldn’t save the change. Please try again.',
    },
  },
  guide: {
    metaTitle: 'Connect shwcs to your assistant',
    back: 'Back to Connections',
    title: 'Connect shwcs to your assistant',
    intro:
      'With a personal token, your AI assistant creates your listing, tells you what it’s missing, completes it and submits it for review once you confirm. It works over MCP, the protocol Claude, Cursor and other assistants understand.',
    stepsTitle: 'In three steps',
    steps: [
      'Create a token in Settings → Connections and copy it. It’s only shown once.',
      'Add shwcs to your assistant with the address below and the header Authorization: Bearer followed by your token.',
      'Ask it, for example: “Publish my product on shwcs; the website is yourproject.com”.',
    ],
    createToken: 'Create a token',
    urlLabel: 'Server address',
    tokenPlaceholder: 'YOUR_TOKEN',
    clientsTitle: 'By assistant',
    clients: {
      claudeCode: {
        title: 'Claude Code',
        body: 'In the terminal, once:',
      },
      claudeApp: {
        title: 'Claude.ai and Claude Desktop',
        body: 'In Settings → Connectors → Add custom connector, enter the address. If your account shows the “Request headers” section (in beta), add the authorization header with the value Bearer, a space and your token. If it doesn’t, in Claude Desktop use the mcp-remote bridge in your configuration file:',
      },
      cursor: {
        title: 'Cursor and other MCP clients',
        body: 'In .cursor/mcp.json, or your client’s equivalent file:',
      },
      chatgpt: {
        title: 'ChatGPT',
        body: 'ChatGPT connectors only accept OAuth or no authentication, and shwcs doesn’t offer OAuth yet. When it does, we’ll explain it here. In the meantime, use Claude or Cursor.',
      },
    },
    toolsTitle: 'What it can do',
    tools: {
      estado_de_mis_fichas: 'Lists your listings with their status and what they’re missing.',
      crear_borrador:
        'Creates a draft. If you give it your website, shwcs reads it and writes a first draft with AI, under the same daily limit as on the web.',
      ver_lo_que_falta:
        'Shows what the listing already has, what’s missing to submit it and the review team’s comments.',
      actualizar_borrador: 'Changes the fields you ask for, under the same rules as the editor.',
      subir_captura: 'Uploads a public image (JPG, PNG or WebP up to 2 MB) to your listing.',
      enviar_a_revision: 'Submits it for review, only once you confirm in the conversation.',
    },
    safetyTitle: 'Good to know',
    safety: [
      'It only touches your listings: it doesn’t see your saved projects, lists, conversations or payment details.',
      'Nothing is published without review. The shwcs team reviews every submission, as if you’d made it from the editor.',
      'Revoking a token turns it off at the assistant’s next call. Changing your password turns them all off.',
      'In Connections you see what each token did: which tool, on which listing and how it ended.',
      'Your assistant receives the data of the listings you ask it to read or write, including your private contact email. You choose that service, and its own terms apply.',
    ],
  },
  server: {
    instructions:
      'You help a founder publish their projects on shwcs, a B2B catalog that connects companies with software, agencies and services. With these tools you create and complete THEIR listings; you can’t touch anyone else’s. Recommended flow: 1) estado_de_mis_fichas; 2) crear_borrador, with the project’s website so shwcs reads it; 3) ver_lo_que_falta; 4) actualizar_borrador with the version the previous call returned; 5) subir_captura if the founder gives you images; 6) show the founder the summary and only with their explicit confirmation call enviar_a_revision. Never invent facts: use what the founder or their website says, and leave empty what you don’t know. Nothing is published without review by the shwcs team.',
    tools: {
      estado_de_mis_fichas: {
        title: 'My listings',
        description:
          'Lists the founder’s listings: id, name, status, version, whether it can be submitted for review yet, the blocks still missing and the links to open them on shwcs.',
      },
      crear_borrador: {
        title: 'Create draft',
        description:
          'Creates a new listing draft. With sitio_web, shwcs reads the website and writes a first draft with AI (it only fills in what the site says, under a daily limit per account). Returns the id and version to continue.',
        website: 'The project’s website, for example yourproject.com.',
        useAi:
          'false to skip reading the website with AI and create the draft with just the address. By default it’s read when there’s a website.',
      },
      ver_lo_que_falta: {
        title: 'What’s missing',
        description:
          'Returns a listing’s current data, its version, the fields that keep it from being submitted for review, the guide of completed blocks, the valid capabilities for its categories, the uploaded screenshots and the review team’s latest comment.',
        solution: 'The listing’s id.',
      },
      actualizar_borrador: {
        title: 'Update draft',
        description:
          'Changes fields of one of the founder’s listings under the same rules as the shwcs editor. Send only the fields that change; null removes an optional field. Lists replace the whole list. Needs the current version (from ver_lo_que_falta or the last call) and returns the new one. If the listing was already published, the public version doesn’t change until the new one is approved.',
        solution: 'The listing’s id.',
        version: 'The listing’s current version.',
        changes: 'The fields that change.',
        fields: {
          name: 'Project name.',
          kind: 'What it is: Software, Agencia (agency) or Servicio (service).',
          categories: 'Catalog categories; the first one is the main one.',
          problem: 'What it solves, in one paragraph (at least 20 characters to submit).',
          audience: 'Who it’s for (at least 10 characters to submit).',
          website: 'Official website, http or https.',
          contactEmail: 'Private email where the founder receives requests. Never published.',
          capabilities:
            'What it does, specifically. Each capability belongs to a chosen category; ver_lo_que_falta lists the valid ones.',
          industries: 'Industries where it fits. [] means it serves any.',
          companySizes: 'Company sizes where it fits. [] means it serves any.',
          scope: 'What’s included and what isn’t.',
          notFor: 'When it isn’t a fit.',
          pricing: 'Pricing terms in free text.',
          pricingModel: 'Pricing models.',
          priceFrom: 'Entry price; 0 is a free plan. Needs a currency and a unit.',
          priceCurrency: 'ISO 4217 currency of the price, for example USD or MXN.',
          priceUnit: 'What the price pays for.',
          priceBand: 'Approximate price range.',
          setupTime: 'How long it takes to start working.',
          implementation: 'How it’s implemented.',
          integrationKeys: 'Tools it connects to. [] means none.',
          integrations: 'Integrations in free text.',
          support: 'Support offered.',
          compliance: 'Standards or certifications it meets, only if the founder confirms them.',
          evidence: 'Experience or cases that back it up.',
          evidenceUrl: 'Link to a case or evidence.',
          demoUrl: 'Link to a demo.',
          screenshots:
            'Screenshots the listing shows, in order (at most 4): each uploaded image’s id and what it shows (at least 3 characters).',
          founders: 'Up to 3 team members, with their consent: name, role, bio and links.',
          projectLinks: 'The project’s official links (at most 6).',
          hideSiteImage: 'true to stop showing the image the website publishes as a cover.',
          otherCategory: 'A category that isn’t in the list, in the founder’s own words.',
        },
      },
      subir_captura: {
        title: 'Upload screenshot',
        description:
          'Downloads a public image (JPG, PNG or WebP, up to 2 MB) and stores it in the listing with the same process as an upload from shwcs. With a caption, it adds it to the listing if it has fewer than 8 images.',
        solution: 'The listing’s id.',
        url: 'Public http or https address of the image.',
        caption: 'What the screenshot shows, to add it to the listing (3 to 180 characters).',
      },
      enviar_a_revision: {
        title: 'Submit for review',
        description:
          'Sends the listing to the shwcs review team. Call it only after showing the founder the summary and once they confirm the submission in the conversation. While under review it can’t be edited. It publishes nothing: the decision is the team’s.',
        solution: 'The listing’s id.',
        version: 'The listing’s current version.',
        confirm: 'true only if the founder explicitly confirmed the submission.',
      },
    },
    messages: {
      list: 'These are your listings.',
      empty: 'There are no listings yet. Create one with crear_borrador.',
      created: 'Draft created. Check what’s missing with ver_lo_que_falta.',
      createdFromSite:
        'Draft created and prepared with AI from the website ({filled} fields). Check what’s missing with ver_lo_que_falta.',
      createdPartial:
        'Draft created. The AI couldn’t write it; only the name and links were taken from the website.',
      siteNotRead: 'Draft created, but the website wasn’t read: {reason}',
      ready: 'It has everything needed to be submitted for review.',
      missing: 'It’s missing information to be submitted for review.',
      updated: 'Changes saved. New version: {version}.',
      uploaded: 'Screenshot uploaded and added to the listing. New version: {version}.',
      uploadedOnly:
        'Screenshot uploaded to the listing’s library. Add it with actualizar_borrador (screenshots field) whenever you like.',
      uploadedFull:
        'Screenshot uploaded to the listing’s library, but the listing already shows 8 images: it wasn’t added.',
      uploadedNotAttached:
        'Screenshot uploaded, but the listing changed in the meantime and it wasn’t added. Add it with actualizar_borrador.',
      submitted:
        'Submitted for review. The shwcs team reviews it and the founder gets a notice with the decision. It can’t be edited in the meantime.',
      notFound: 'We couldn’t find that listing among yours.',
      pending:
        'The listing is under review and can’t be changed right now. The founder can withdraw it from review on shwcs if they need to edit it.',
      conflict:
        'The listing changed since you read it; its current version is {version}. Read it again with ver_lo_que_falta and apply the changes on that version.',
      invalidFields:
        'These fields aren’t valid: {fields}. Check the type, that the value is in the allowed list and the maximum length.',
      incomplete:
        'It’s still missing information to be submitted for review. Complete it with actualizar_borrador.',
      rateLimited: 'Too many actions in a short time. Wait a few minutes before continuing.',
      invalidWebsite: 'That isn’t a valid web address. Use something like yourproject.com.',
      storageUnavailable: 'Screenshots aren’t available right now.',
      fileLimit: 'This listing already has 12 files. The founder can remove some on shwcs.',
      imageUnreachable:
        'We couldn’t download the image. The address must be public (http or https), answer within 8 seconds and weigh up to 2 MB.',
      staticImageOnly: 'The image must be JPG, PNG or WebP, without animation.',
      imageTooDetailed: 'The image has too much detail. Crop it or use a simpler one.',
      unreadable: 'We couldn’t read that image.',
      uploadConflict:
        'The listing changed or reached its file limit while the image was uploading. It wasn’t saved.',
      uploadUnconfirmed:
        'We couldn’t confirm the upload. Check the listing with ver_lo_que_falta before trying again.',
      failed: 'We couldn’t complete the action. Please try again in a moment.',
    },
  },
} as const satisfies Dictionary['assistant'];
