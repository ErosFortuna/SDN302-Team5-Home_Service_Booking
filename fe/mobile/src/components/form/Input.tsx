import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Icon, AppIconKey } from '../ui/Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: AppIconKey;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  isPassword,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={isFocused ? Colors.primary[500] : Colors.neutral[400]}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.neutral[400]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={!showPassword}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity onPress={togglePassword} style={styles.rightIcon} accessibilityLabel={!showPassword ? "Hiển thị mật khẩu" : "Ẩn mật khẩu"}>
            <Icon
              name={showPassword ? 'visibilityOff' : 'visibility'}
              size={20}
              color={Colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Space.md,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
    marginBottom: Space.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.md,
    height: 48,
    paddingHorizontal: Space.md,
  },
  inputFocused: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.neutral[0],
  },
  inputError: {
    borderColor: Colors.semantic.error,
    backgroundColor: Colors.semantic.errorBg,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    height: '100%',
  },
  leftIcon: {
    marginRight: Space.sm,
  },
  rightIcon: {
    marginLeft: Space.sm,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
    marginTop: Space.xs,
  },
});
