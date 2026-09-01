export function credentialErrors(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = 'Escribe tu correo para continuar.';
  else if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Revisa tu correo. Por ejemplo: nombre@empresa.com.';
  if (!password) errors.password = 'Escribe tu contraseña.';
  else if (password.length < 6) errors.password = 'Tu contraseña necesita al menos 6 caracteres.';
  else if (password.length > 4096) errors.password = 'Esta contraseña es demasiado larga para procesarla.';
  return errors;
}
