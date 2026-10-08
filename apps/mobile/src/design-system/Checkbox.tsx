import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";

const checkedPaths = [
  "M12 3.5C7.306 3.5 3.5 7.306 3.5 12C3.5 16.694 7.306 20.5 12 20.5C16.694 20.5 20.5 16.694 20.5 12C20.5 7.306 16.694 3.5 12 3.5ZM2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12Z",
  "M21.25 12C21.25 17.109 17.109 21.25 12 21.25C6.891 21.25 2.75 17.109 2.75 12C2.75 6.891 6.891 2.75 12 2.75C17.109 2.75 21.25 6.891 21.25 12ZM18.087 9.143C18.387 8.857 18.399 8.383 18.113 8.083C17.827 7.783 17.353 7.771 17.053 8.057L10.429 14.365L6.947 11.056C6.646 10.771 6.172 10.783 5.886 11.083C5.601 11.384 5.613 11.858 5.913 12.144L9.913 15.944C10.203 16.219 10.658 16.219 10.947 15.943L18.087 9.143Z",
];
const uncheckedPaths = [
  "M11.995 3.495C7.301 3.495 3.495 7.301 3.495 11.995C3.495 16.689 7.301 20.495 11.995 20.495C16.69 20.495 20.495 16.689 20.495 11.995C20.495 7.301 16.69 3.495 11.995 3.495ZM1.995 11.995C1.995 6.472 6.472 1.995 11.995 1.995C17.518 1.995 21.995 6.472 21.995 11.995C21.995 17.518 17.518 21.995 11.995 21.995C6.472 21.995 1.995 17.518 1.995 11.995Z",
  "M18.108 8.078C18.394 8.378 18.382 8.852 18.082 9.138L10.942 15.938C10.653 16.214 10.198 16.214 9.909 15.939L5.909 12.139C5.608 11.853 5.596 11.379 5.881 11.078C6.167 10.778 6.641 10.766 6.942 11.051L10.425 14.36L17.048 8.052C17.348 7.766 17.823 7.778 18.108 8.078Z",
];

/** Native Seugi circular checkbox artwork. Selection remains owned by the containing row. */
export function SeugiCheckbox({
  checked,
  enabled = true,
  size = 24,
}: {
  checked: boolean;
  enabled?: boolean;
  size?: 16 | 20 | 24;
}) {
  const paths = checked ? checkedPaths : uncheckedPaths;
  const color = checked && enabled ? SeugiColor.Primary500 : SeugiColor.Gray500;

  return (
    <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24">
      {paths.map((d) => (
        <Path key={d} d={d} fill={color} fillRule="evenodd" />
      ))}
    </Svg>
  );
}
