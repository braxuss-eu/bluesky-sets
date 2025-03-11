import React, { useEffect, useState } from "react";
import delayedImageService from "../services/delayedImageService";

const DelayedImage = (props) => {
  const pt = props?.pt || {};
  const [url, setUrl] = useState(false);
  useEffect(() => {
    // On mount...
    const abortController = new AbortController();
    delayedImageService.preloadImage(props.src, abortController).then((url) => {
      setUrl(url);
    }).catch((error) => {
      console.debug("DelayedImage error", error);
    });
    return () => {
      // On unmount
      abortController.abort('Component unmounted');
    }
}, [])
  return (
    <>
      {url ? (
        <img src={url} {...pt} />
      ) : (
        <div {...pt} />
      )}
    </>
  );
};

export default DelayedImage;
