import { createContext, useContext } from 'react';
import { toast } from 'react-hot-toast';

const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
  const showSuccess = (msg) => toast.success(msg);
  const showError = (msg) => toast.error(msg);
  const showInfo = (msg) => toast(msg);

  const showSnackbar = (msg, type = 'info') => {
  if (type === 'success') toast.success(msg);
  else if (type === 'error') toast.error(msg);
  else toast(msg);
  };

  return (
    <SnackbarContext.Provider value={{ showSuccess, showError, showInfo, showSnackbar }}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => useContext(SnackbarContext);

export default SnackbarContext;
