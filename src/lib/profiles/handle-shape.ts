// The shape of a public profile handle, with no imports: the middleware checks it on
// every /c/<handle> request (src/lib/routes.ts) and must stay small. The reserved words
// live in ./handle.ts; a reserved handle can never be saved, so the middleware's lookup
// of existing handles answers 404 for it anyway.

export const handleMin = 3;
export const handleMax = 30;

export const handleShape = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whether a value already has the shape of a handle (no reserved check). */
export function isHandleShape(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= handleMin &&
    value.length <= handleMax &&
    handleShape.test(value)
  );
}
