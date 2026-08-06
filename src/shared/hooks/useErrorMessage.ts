import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isNetworkError } from '@shared/utils/networkError';
import { Translations } from '@shared/i18n/translationKeys';

export const useErrorMessage = () => {
  const { t } = useTranslation();

  return useCallback(
    (
      error: unknown,
      fallbackKey: string = Translations.COMMON_ERROR_GENERIC,
    ) =>
      isNetworkError(error)
        ? t(Translations.COMMON_ERROR_OFFLINE)
        : t(fallbackKey),
    [t],
  );
};

export default useErrorMessage;
