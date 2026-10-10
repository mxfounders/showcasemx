/** POSTs one review action; throws the server's translated message, with the field when there is one. */
export async function reviewRequest(solutionId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/solutions/${solutionId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    field?: string;
    [key: string]: unknown;
  };
  if (!response.ok) throw Object.assign(new Error(body.error ?? ''), { field: body.field });
  return body;
}
