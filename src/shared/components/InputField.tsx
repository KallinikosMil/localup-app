import React from 'react';
import { TextInput, HelperText } from 'react-native-paper';
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
} & Omit<PaperInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error' | 'label' | 'mode'>;

const InputField = <T extends FieldValues> ({
  name,
  label,
  rules,
  validateOnBlur = true,
  secureTextEntry,
  right,
  ...rest
}: InputFieldProps<T>) => {
  const { control, trigger } = useFormContext<T>();

  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({ name, control, rules });

  const [isVisible, setIsVisible] =
    React.useState(false);

  const handleBlur = React.useCallback(() => {
    onBlur();
    if (validateOnBlur) void trigger(name);
  }, [onBlur, validateOnBlur, trigger, name]);

  const passwordToggle =
    secureTextEntry && !right ? (
      <TextInput.Icon
        icon={isVisible ? 'eye-off' : 'eye'}
        onPress={() =>
          setIsVisible(v => !v)
        }
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
        secureTextEntry={
          secureTextEntry && !isVisible
        }
        right={passwordToggle}
        {...rest}
      />
      {!!error?.message ? (
        <HelperText
          type="error"
          visible
          padding="none"
        >
          {error.message}
        </HelperText>
      ) : null}
    </>
  );
};

export default InputField;
