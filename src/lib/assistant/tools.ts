/**
 * The tools the founder's assistant can call (SHCWS-152). Kept apart from the MCP server so
 * pages that only list them don't load the SDK.
 */
export const ASSISTANT_TOOLS = [
  'estado_de_mis_fichas',
  'crear_borrador',
  'ver_lo_que_falta',
  'actualizar_borrador',
  'subir_captura',
  'enviar_a_revision',
] as const;
export type AssistantTool = (typeof ASSISTANT_TOOLS)[number];
