import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button, TextField, Surface, Eyebrow, Avatar } from "@/Components/ui";

function UiGallery() {
  const [value, setValue] = useState("스기");
  return (
    <div style={{ display: "grid", gap: 24, padding: 24, maxWidth: 480 }}>
      <Eyebrow>Seugi web ui primitives</Eyebrow>
      <Surface style={{ padding: 20, display: "grid", gap: 12 }}>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
        <Button variant="seugi">Seugi</Button>
      </Surface>
      <TextField
        id="demo"
        label="Label"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Placeholder"
      />
      <Avatar src="https://placehold.co/64x64/png" alt="avatar" size="large" />
    </div>
  );
}

const meta = {
  title: "Web/Ui/primitives",
  component: UiGallery,
} satisfies Meta<typeof UiGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gallery: Story = {};
