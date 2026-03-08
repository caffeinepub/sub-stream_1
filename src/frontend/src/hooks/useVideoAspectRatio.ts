import { useEffect, useState } from "react";

type AspectClass = "vertical" | "horizontal" | "square";

export function useVideoAspectRatio(
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [aspectClass, setAspectClass] = useState<AspectClass>("vertical");
  const [ratio, setRatio] = useState<number>(9 / 16);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function onMeta() {
      if (!el) return;
      const w = el.videoWidth;
      const h = el.videoHeight;
      if (!w || !h) return;
      const r = w / h;
      setRatio(r);
      if (r < 0.95) setAspectClass("vertical");
      else if (r > 1.05) setAspectClass("horizontal");
      else setAspectClass("square");
    }
    el.addEventListener("loadedmetadata", onMeta);
    // In case already loaded
    if (el.readyState >= 1) onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [videoRef]);

  return { aspectClass, ratio };
}
