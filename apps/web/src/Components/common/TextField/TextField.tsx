import React from 'react';
import { SeugiTextControl } from '@/Components/ui';

interface SeugiTextFieldProps {
    text?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: React.HTMLInputTypeAttribute;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
    style: React.CSSProperties;
    value: string;
}

const TextField: React.FC<SeugiTextFieldProps> = ({ onChange, placeholder, type = 'text', onKeyDown, style, value }) => {
    return (
        <SeugiTextControl
            onChange={onChange}
            placeholder={placeholder}
            type={type}
            onKeyDown={onKeyDown}
            style={style}
            value={value}
        />
    );
}

export default TextField;
