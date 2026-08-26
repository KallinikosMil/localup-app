import type { TFunction } from 'i18next';

import { Translations } from '../i18n/translationKeys';

// Distance display rule: "0.0 km" reads broken — anything under 1 km is
// just "nearby".
//
// Lives here rather than in the card because the redesign moved the
// distance pill off the photo and into the screen header, and the two
// would otherwise round differently.
export const formatDistance = (km: number, t: TFunction) =>
  km < 1
    ? t(Translations.DISCOVER_DISTANCE_NEARBY)
    : t(Translations.DISCOVER_DISTANCE_KM, {
        km: km.toFixed(1),
      });
