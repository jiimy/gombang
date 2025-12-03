'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import styles from './snackbarProvider.module.scss';
import Snackbar from '@/components/snackbar/Snackbar';

type SnackbarContextType = {
  showSnackbar: (message: string, duration?: number) => void;
};

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbars, setSnackbars] = useState<{ message: string; duration?: number }[]>([]);

  const showSnackbar = (message: string, duration?: number) => {
    setSnackbars((prev) => [...prev, { message, duration }]);
  };

  const handleClose = (index: number) => {
    const a = snackbars.filter((_, i) => i !== index)
    setSnackbars((prev) => prev.filter((_, i) => i !== index));

    // setTimeout(() => {
    
  };


  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div className={styles.snackbarContainer}>
        {snackbars.map((snackbar, index) => (
          <Snackbar
            key={index}
            index={index}
            message={snackbar.message}
            duration={snackbar.duration}
            onClose={() => handleClose(index)}
          />
        ))}
      </div>
    </SnackbarContext.Provider>
  );
};