import React from 'react';
import { TextInput, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Translations as Common } from '@shared/i18n/translationKeys';
import {
  useFormContext,
  useController,
  type FieldValues,
  type FieldPath,
  type RegisterOptions,
} from 'react-hook-form';

type PaperInputProps = React.ComponentProps<typeof TextInput>;

export type InputFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label?: string;
  rules?: RegisterOptions<T, FieldPath<T>>;
  validateOnBlur?: boolean;
} & Omit<
  PaperInputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error' | 'label' | 'mode'
>;

const InputField = <T extends FieldValues>({
  name,
  label,
  rules,
  validateOnBlur = true,
  secureTextEntry,
  right,
  ...rest
}: InputFieldProps<T>) => {
  const { control, trigger } = useFormContext<T>();
  const { t } = useTranslation();

  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({ name, control, rules });

  const [isVisible, setIsVisible] = React.useState(false);

  const handleBlur = React.useCallback(() => {
    onBlur();
    if (validateOnBlur) void trigger(name);
  }, [onBlur, validateOnBlur, trigger, name]);

  const passwordToggle =
    secureTextEntry && !right ? (
      <TextInput.Icon
        icon={isVisible ? 'eye-off' : 'eye'}
        onPress={() => setIsVisible(v => !v)}
        // The glyph flips between an eye and a crossed-out eye; both are
        // announced as "button" without this, so the control that reveals a
        // password is indistinguishable from any other icon.
        accessibilityLabel={t(
          isVisible ? Common.A11Y_HIDE_PASSWORD : Common.A11Y_SHOW_PASSWORD,
        )}
        forceTextInputFocus={false}
      />
    ) : (
      right
    );

  return (
    <>
      <TextInput
        ref={ref}
        label={label}
        mode="outlined"
        value={value ?? ''}
        onChangeText={onChange}
        onBlur={handleBlur}
        style={{ width: '100%' }}
        error={!!error}
        secureTextEntry={secureTextEntry && !isVisible}
        right={passwordToggle}
        {...rest}
      />
      {!!error?.message ? (
        <HelperText type="error" visible padding="none">
          {error.message}
        </HelperText>
      ) : null}
    </>
  );
};

export default InputField;
