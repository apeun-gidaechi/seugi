import React from 'react';
import { SeugiTextControl } from '@/Components/ui';

interface SeugiTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
    text?: string;
    value: string;
}

const TextField: React.FC<SeugiTextFieldProps> = ({ text: _text, ...inputProps }) => {
    return (
        <SeugiTextControl {...inputProps} />
    );
}

export default TextField;
