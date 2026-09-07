import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Translations } from '@shared/i18n/translationKeys';

// Asking for a photo: camera or library, in one place.
//
// It lived twice and disagreed with itself. Onboarding called
// launchImageLibraryAsync with NO permission request at all — on a denial
// it simply returned nothing and the screen looked broken — while Edit
// profile asked properly. Neither offered the camera, although the
// onboarding screen has said "Camera or library" under the button since
// the day it was written. This is that promise, kept.
//
// Returns the chosen asset, or null for every way of not getting one:
// cancelled the sheet, cancelled the picker, refused the permission.
// Callers do not need to tell those apart — in all of them the right
// behaviour is to leave the screen exactly as it was.

type PickOptions = {
  t: (key: string) => string;
  // Onboarding crops to 3:4 because that photo becomes a portrait hero in
  // the deck. Edit profile does not, because the grid there shows what
  // was uploaded.
  allowsEditing?: boolean;
  aspect?: [number, number];
};

const QUALITY = 0.8;

const denied = (t: PickOptions['t'], title: string, body: string) => {
  Alert.alert(t(title), t(body));
  return null;
};

const fromCamera = async ({ t, allowsEditing, aspect }: PickOptions) => {
  // The camera permission is requested HERE, on the tap that needs it,
  // rather than at launch. A dating app asking for the camera before it
  // has explained why is the request people refuse.
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    return denied(
      t,
      Translations.PHOTO_CAMERA_DENIED_TITLE,
      Translations.PHOTO_CAMERA_DENIED_BODY,
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    allowsEditing,
    aspect,
    quality: QUALITY,
  });
  return result.canceled ? null : (result.assets[0] ?? null);
};

const fromLibrary = async ({ t, allowsEditing, aspect }: PickOptions) => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return denied(
      t,
      Translations.PHOTO_LIBRARY_DENIED_TITLE,
      Translations.PHOTO_LIBRARY_DENIED_BODY,
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing,
    aspect,
    quality: QUALITY,
  });
  return result.canceled ? null : (result.assets[0] ?? null);
};

export const pickPhoto = (
  options: PickOptions,
): Promise<ImagePicker.ImagePickerAsset | null> =>
  // An Alert rather than a custom sheet: this is a two-option choice on
  // top of a screen the person is in the middle of, and the platform's
  // own dialog is the one their screen reader and their muscle memory
  // already know.
  new Promise(resolve => {
    Alert.alert(
      options.t(Translations.PHOTO_PICK_TITLE),
      undefined,
      [
        {
          text: options.t(Translations.PHOTO_PICK_CAMERA),
          onPress: () => resolve(fromCamera(options)),
        },
        {
          text: options.t(Translations.PHOTO_PICK_LIBRARY),
          onPress: () => resolve(fromLibrary(options)),
        },
        {
          text: options.t(Translations.PHOTO_PICK_CANCEL),
          style: 'cancel',
          // Dismissing has to resolve too. A promise left hanging here
          // would leave a caller's "uploading" flag on forever.
          onPress: () => resolve(null),
        },
      ],
      { onDismiss: () => resolve(null) },
    );
  });
