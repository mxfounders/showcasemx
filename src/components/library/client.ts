/**
 * `messages` comes from the caller's `library.errors` dictionary slice: the API already
 * answers in the page's language, these only cover a response without an error message.
 */
export async function changeLibrary(
  body: Record<string, unknown>,
  messages: { saveFailed: string },
) {
  const response = await fetch('/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || messages.saveFailed);
  return result as { ok: boolean; id?: string };
}
export const libraryField =
  'mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base outline-none focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
export const libraryButton =
  'action-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-50';
/**
 * The message to show for a failed mutation. Network failures, timeouts and unreadable
 * responses never confirm whether the write happened, so they get the caller's localized
 * `unconfirmed` text instead of a technical error message.
 */
export function libraryError(error: unknown, unconfirmed: string) {
  return error instanceof Error &&
    !['TypeError', 'TimeoutError', 'SyntaxError'].includes(error.name)
    ? error.message
    : unconfirmed;
}
