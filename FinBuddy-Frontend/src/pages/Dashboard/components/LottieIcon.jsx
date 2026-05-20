import React, { useRef, useEffect } from "react";
import lottie from "lottie-web";

// externalTrigger: undefined = hover kontrolü, true = dışarıdan oynat, false = durdur
const LottieIcon = ({ animationData, size = 28, autoplay = false, className = "", externalTrigger }) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: autoplay,
      autoplay: autoplay,
      animationData: animationData,
    });
    return () => {
      animRef.current?.destroy();
    };
  }, [animationData, autoplay]);

  useEffect(() => {
    if (externalTrigger === undefined) return;
    if (externalTrigger) {
      animRef.current?.setLoop(true);
      animRef.current?.play();
    } else {
      animRef.current?.setLoop(false);
      animRef.current?.stop();
    }
  }, [externalTrigger]);

  const handleMouseEnter = () => {
    if (autoplay || externalTrigger !== undefined) return;
    animRef.current?.goToAndPlay(0, true);
  };

  const handleMouseLeave = () => {
    if (autoplay || externalTrigger !== undefined) return;
    animRef.current?.stop();
  };

  return (
    <span
      className={`lottie-icon-wrap ${className}`}
      style={{ display: "inline-flex", width: size, height: size, cursor: "default", flexShrink: 0 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    />
  );
};

export default LottieIcon;