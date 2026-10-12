import type { Meta, StoryObj } from "@storybook/react";
import { Route, Routes } from "react-router-dom";
import Shell from "@/Components/Shell/Shell";

const meta: Meta = {
  title: "Web/Shell",
  parameters: {
    layout: "fullscreen",
    router: { initialEntries: ["/"] },
  },
};

export default meta;

type Story = StoryObj;

export const WithOutletPlaceholder: Story = {
  render: () => (
    <Routes>
      <Route path="/*" element={<Shell />}>
        <Route
          index
          element={
            <div style={{ padding: 24, fontFamily: "sans-serif" }}>
              Shell <code>Outlet</code> placeholder — use page stories for full screens.
            </div>
          }
        />
      </Route>
    </Routes>
  ),
};
