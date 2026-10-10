/**
 * Stable, locale-neutral codes. Client forms and API routes map them to the
 * reader's language through `dict.auth.credentialErrors`.
 */
export type EmailError = 'emailMissing' | 'emailInvalid';
export type PasswordError = 'passwordMissing' | 'passwordShort' | 'passwordLong';
export type CredentialError = EmailError | PasswordError;
export type CredentialErrors = { email?: EmailError; password?: PasswordError };

export function credentialErrors(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!email.trim()) errors.email = 'emailMissing';
  else if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'emailInvalid';
  if (!password) errors.password = 'passwordMissing';
  else if (password.length < 6) errors.password = 'passwordShort';
  else if (password.length > 4096) errors.password = 'passwordLong';
  return errors;
}
