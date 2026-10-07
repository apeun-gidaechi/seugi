import React from "react";
import { TextControl } from "@/Components/ui";

interface SeugiTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  text?: string;
  style?: React.CSSProperties;
}

const TextField: React.FC<SeugiTextFieldProps> = ({ text: _text, ...props }) => <TextControl {...props} />;

export default TextField;
