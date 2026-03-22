import { Redirect } from 'expo-router';

export default () =>
  Redirect({
    href: __DEV__
      ? '/dev'
      : '/(tabs)/discover',
  });
