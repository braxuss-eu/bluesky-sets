import React, { useState } from "react";
import delayedImageService from "../services/delayedImageService";

const DelayedImage = (props) => {
  const pt = props?.pt || {};
  const [url, setUrl] = useState(false);
  delayedImageService.preloadImage(props.src).then((url) => {
    setUrl(url);
  }).catch((error) => {
    console.error("DelayedImage error", error);
  });
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
