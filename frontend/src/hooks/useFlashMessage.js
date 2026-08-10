import { useCallback } from 'react';
import bus from '../utils/bus';

export default function useFlashMessage() {
  const setFlashMessage = useCallback((msg, type) => {
    bus.emit('flash', {
      message: msg,
      type: type,
    });
  }, []); // Array de dependências vazio para que a função seja criada apenas uma vez

  return { setFlashMessage };
}