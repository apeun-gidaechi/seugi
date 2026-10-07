import React from 'react';
import { Button as SystemButton } from "@/Components/ui";

interface SeugiButtonProps {
  text?: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}


const Button: React.FC<SeugiButtonProps> = ({ text = '계속하기', onClick }) => {
  return (
    <SystemButton fullWidth onClick={onClick}>
      {text}
    </SystemButton>
  );
};

export default Button;
