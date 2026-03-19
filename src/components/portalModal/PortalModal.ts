
import { useEffect } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const ModalPortal = ({ children, onClose }: ModalProps) => {
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose]);

  const modalRoot = document.getElementById("modal");

  if (!modalRoot) {
    return (`<></>`);
    // return null;
  };

  return ReactDOM.createPortal(children, modalRoot);
};

export default ModalPortal;
