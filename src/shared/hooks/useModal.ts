import { useCallback, useMemo, useState } from 'react';

export const useModal = () => {
  const [visible, setVisible] = useState(false);

  const closeModal = useCallback(() => {
    setVisible(false);
  }, []);

  const openModal = useCallback(() => {
    setVisible(true);
  }, []);

  const modalProps = useMemo(
    () => ({
      visible,
      onDismiss: closeModal,
    }),
    [visible, closeModal],
  );

  return {
    visible,
    openModal,
    closeModal,
    modalProps,
    onDismiss: closeModal,
  };
};

export default useModal;
