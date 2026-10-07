import React from 'react';
import { Button as SystemButton } from '@/Components/ui';

interface SeugiButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> {
  text?: string;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

const Button: React.FC<SeugiButtonProps> = ({ text = '계속하기', type = 'submit', ...buttonProps }) => {
  return (
    <SystemButton variant="seugi" fullWidth type={type} {...buttonProps}>
      {text}
    </SystemButton>
  );
};

export default Button;
