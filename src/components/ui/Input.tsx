import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type Props = TextInputProps;

export function Input({
  style,
  editable = true,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...rest}
      editable={editable}
      placeholderTextColor={colors.subdued}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        !editable && styles.inputDisabled,
        focused && styles.inputFocused,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.inverse,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputDisabled: {
    opacity: 0.6,
  },
});
