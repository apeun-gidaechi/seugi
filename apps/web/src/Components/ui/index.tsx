import React from "react";
import styled, { css } from "styled-components";
import { designTokens as t } from "@/Design/tokens";
import { SeugiFont } from "@/Design/text/SeugiFont";

type ButtonVariant = "primary" | "secondary" | "quiet" | "seugi";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; fullWidth?: boolean };

const ButtonRoot = styled.button<{ $variant: ButtonVariant; $fullWidth: boolean }>`
  display: inline-flex;
  min-height: 46px;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: ${t.radius.md};
  font: 600 15px ${t.type.family};
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
  ${({ $variant }) => $variant === "primary" && css`background: ${t.color.primary}; color: #fff; &:hover:not(:disabled) { background: ${t.color.primaryHover}; }`}
  ${({ $variant }) => $variant === "secondary" && css`background: ${t.color.surface}; color: ${t.color.ink}; border-color: ${t.color.line}; &:hover:not(:disabled) { background: ${t.color.canvas}; }`}
  ${({ $variant }) => $variant === "quiet" && css`background: transparent; color: ${t.color.primary}; &:hover:not(:disabled) { background: ${t.color.primarySoft}; }`}
  &:active:not(:disabled) { transform: translateY(1px); }
  &:focus-visible { outline: 3px solid ${t.color.focus}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
  ${({ $variant }) => $variant === "seugi" && css`
    display: flex;
    height: 54px;
    min-height: 54px;
    padding: 12px 180px;
    align-self: stretch;
    gap: 10px;
    border: none;
    border-radius: 12px;
    background: ${t.color.primary};
    color: ${t.color.surface};
    ${SeugiFont.subtitle.subtitle2};
    transition: none;
    &:hover:not(:disabled), &:active:not(:disabled) { background: ${t.color.primary}; transform: none; }
    &:focus-visible { outline: revert; outline-offset: revert; }
    &:disabled { cursor: default; opacity: 1; }
  `}
`;

export function Button({ variant = "primary", fullWidth = false, type = "button", ...props }: ButtonProps) {
  return <ButtonRoot $variant={variant} $fullWidth={fullWidth} type={type} {...props} />;
}

const FieldRoot = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
`;
const FieldLabel = styled.label`
  color: ${t.color.ink};
  font: 600 14px ${t.type.family};
`;
const InputWrap = styled.div`
  display: flex;
  min-height: 50px;
  align-items: center;
  border: 1px solid ${t.color.line};
  border-radius: ${t.radius.md};
  background: ${t.color.surface};
  transition: border-color 140ms ease, box-shadow 140ms ease;
  &:focus-within { border-color: ${t.color.primary}; box-shadow: 0 0 0 4px ${t.color.focus}; }
`;
export const TextControl = styled.input`
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0 14px;
  border: 0;
  outline: 0;
  border-radius: inherit;
  background: transparent;
  color: ${t.color.ink};
  font: 400 15px ${t.type.family};
  &::placeholder { color: ${t.color.subtle}; }
`;

export const SeugiTextControl = styled.input`
  flex-grow: 1;
  padding: 17px 16px;
  border: none;
  ${SeugiFont.subtitle.subtitle2};
  &:focus { outline: none; }
  box-sizing: border-box;
  width: 421px;
  height: 52px;
  background: ${t.color.surface};
  border-radius: 12px;
  &::placeholder { color: ${t.color.subtle}; ${SeugiFont.subtitle.subtitle2}; }
`;
const FieldMessage = styled.span<{ $error: boolean }>`
  color: ${({ $error }) => ($error ? t.color.danger : t.color.muted)};
  font: 400 ${t.type.small} ${t.type.family};
`;

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  message?: string;
  error?: boolean;
  trailing?: React.ReactNode;
};

export function TextField({ id, label, message, error = false, trailing, ...inputProps }: TextFieldProps) {
  return (
    <FieldRoot>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputWrap>
        <TextControl id={id} aria-invalid={error || undefined} aria-describedby={message ? `${id}-message` : undefined} {...inputProps} />
        {trailing}
      </InputWrap>
      {message ? <FieldMessage id={`${id}-message`} $error={error}>{message}</FieldMessage> : null}
    </FieldRoot>
  );
}

export const Surface = styled.section`
  border: 1px solid ${t.color.line};
  border-radius: ${t.radius.lg};
  background: ${t.color.surface};
  box-shadow: ${t.shadow.soft};
`;

export const Eyebrow = styled.span`
  color: ${t.color.primary};
  font: 700 12px ${t.type.family};
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;
