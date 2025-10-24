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

export function InputField<T extends FieldValues>({
  name,
  label,
  rules,
  validateOnBlur = true,
  ...rest
}: InputFieldProps<T>) {
  const { control, trigger } = useFormContext<T>();

  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({ name, control, rules });

  const handleBlur = React.useCallback(() => {
    onBlur();
    if (validateOnBlur) void trigger(name);
  }, [onBlur, validateOnBlur, trigger, name]);

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
        {...rest}
      />
      {!!error?.message ? (
        <HelperText type="error" visible>
          {error.message}
        </HelperText>
      ) : null}
    </>
  );
}
