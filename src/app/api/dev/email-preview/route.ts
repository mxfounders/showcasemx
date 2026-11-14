import { NextRequest, NextResponse } from 'next/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { escapeHtml } from '@/lib/notifications/email-template';
import { isPreviewTemplate, previewEmail, previewTemplates } from '@/lib/notifications/preview';

/**
 * Development-only preview of the transactional emails (SHCWS-161), built with the same
 * functions the senders use and fictional data. 404 in production: enabled only by
 * `next dev` or, for an isolated build, EMAIL_PREVIEW=1. Nothing is sent.
 *
 *   /api/dev/email-preview               index
 *   /api/dev/email-preview?t=<template>  the HTML email
 *   /api/dev/email-preview?t=<template>&format=text   its plain-text version and headers
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env.EMAIL_PREVIEW !== '1')
    return new NextResponse(null, { status: 404 });
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  const template = request.nextUrl.searchParams.get('t');
  const origin = request.nextUrl.origin;
  if (!isPreviewTemplate(template)) {
    const links = previewTemplates
      .map(
        name =>
          `<li><a href="?t=${name}">${name}</a> · <a href="?t=${name}&format=text">texto</a></li>`,
      )
      .join('');
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>Correos de shwcs</title><body style="font-family:system-ui;padding:32px"><h1>Correos de shwcs</h1><ul>${links}</ul></body>`,
      { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  const labels = (await getDictionary('es')).contacts;
  // A fixed preview secret, so the one-click header shows up without the real one.
  const email = previewEmail(
    template,
    origin,
    labels,
    'preview-only-secret-not-used-to-send-anything',
  );
  if (request.nextUrl.searchParams.get('format') === 'text') {
    const head = Object.entries(email.headers ?? {})
      .map(([name, value]) => `${name}: ${value}`)
      .join('\n');
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><pre style="white-space:pre-wrap;font:14px/1.5 ui-monospace,monospace;padding:24px">Asunto: ${escapeHtml(email.subject)}\n${escapeHtml(head)}\n\n${escapeHtml(email.text)}</pre>`,
      { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  return new NextResponse(email.html, {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
