/** Keep the exact body while allowing whitespace-only text and attachment-only payloads. */
export function acceptedChatMessageText(message: string, files?: string[]) {
  return message.length > 0 || !!files?.length ? message : undefined;
}
