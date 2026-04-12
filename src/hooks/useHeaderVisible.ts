import { useEffect, useRef, useState, RefObject } from "react";

export const useHeaderVisible = (ref: RefObject<HTMLElement>) => {
  const [visible, setVisible] = useState(true);

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const THRESHOLD = 8; // 작은 스크롤 무시

  const update = () => {
    if (!ref.current) return;

    const current = ref.current.scrollTop;
    const diff = current - lastScrollY.current;

    if (Math.abs(diff) < THRESHOLD) {
      ticking.current = false;
      return;
    }

    if (diff > 0 && current > 40) {
      // 아래로 스크롤
      console.log('아래 스크롤');
      setVisible(false);
    } else {
      // 위로 스크롤
      console.log('위로  스크롤');
      setVisible(true);
    }

    lastScrollY.current = current;
    ticking.current = false;
  };

  const onScroll = () => {
    if (!ticking.current) {
      requestAnimationFrame(update);
      ticking.current = true;
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener("scroll", onScroll);

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [ref]);

  return visible;
};