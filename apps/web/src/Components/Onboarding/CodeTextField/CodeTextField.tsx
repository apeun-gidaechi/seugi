import React, { useState, useRef, useEffect } from "react";
import * as S from "./CodeTextField.style";

interface CodeTextFieldProps {
  onChange: (value: string[]) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const CodeTextField: React.FC<CodeTextFieldProps> = ({ onChange, onKeyDown }) => {
  const [inputValues, setInputValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const pasteText = e.clipboardData?.getData("text");
      if (pasteText) {
        const newValues = pasteText.replace(/\D/g, "").slice(0, 6).split("");
        setInputValues(newValues);
        onChange(newValues);
      }
    };

    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 1);
    if (value === " ") return;
    const updatedValues = [...inputValues];
    if (value.length <= 1) {
      updatedValues[index] = value;
      setInputValues(updatedValues);
      onChange(updatedValues);
      if (value && index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]!.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!inputValues[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]!.focus();
      }
    }
    onKeyDown(e);
  };

  return (
    <>
      {inputValues.map((value, index) => (
        <S.InputCode
          key={index}
          type="text"
          value={value}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`인증 코드 ${index + 1}번째 자리`}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          ref={(el) => (inputRefs.current[index] = el)}
          maxLength={1}
        />
      ))}
    </>
  );
};

export default CodeTextField;
