import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isNetworkError } from '@shared/utils/networkError';
import { Translations } from '@shared/i18n/translationKeys';

// V10. Every error branch asks the same question — "is this the network
// or is this us?" — and answers it with one of two sentences.
//
// `fallbackKey` is the screen's own non-network copy ("Couldn't load
// your matches."), which is strictly more useful than the generic
// sentence when we know what failed. It defaults to the generic one.
//
// The verdict comes from isNetworkError, which reads structured fields
// only — never message text.
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
