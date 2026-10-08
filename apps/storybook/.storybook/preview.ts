import type { Preview } from "@storybook/react";
import { SeugiColor } from "@seugi/design-tokens";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "gray100",
      values: [
        { name: "gray100", value: SeugiColor.Gray100 },
        { name: "white", value: SeugiColor.White },
      ],
    },
    options: {
      storySort: {
        order: ["Design system", "Web", "Mobile", "*"],
      },
    },
  },
};

export default preview;
