export function shouldShowTextFieldClearButton({
  platform,
  clearable,
  hasCustomClearAction,
  hasValue,
  editable,
}: {
  platform: string;
  clearable?: boolean;
  hasCustomClearAction: boolean;
  hasValue: boolean;
  editable: boolean;
}) {
  return (clearable ?? (hasCustomClearAction || platform === "ios")) && hasValue && editable;
}
