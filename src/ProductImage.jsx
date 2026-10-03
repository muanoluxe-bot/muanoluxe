import React from "react";
// The generated contact sheet is displayed as four catalog frames without altering the source artwork.
export default function ProductImage({ src, alt = "", className = "" }) {
  const positions = {
    blazer: "0% 0%",
    shirt: "100% 0%",
    trousers: "0% 100%",
    knit: "100% 100%",
  };
  const fragment = src?.split("#")[1];
  if (positions[fragment] && src.includes("/images/products.png"))
    return (
      <span
        role="img"
        aria-label={alt}
        className={`product-photo atlas-photo ${className}`}
      >
        <span
          style={{
            backgroundImage: "url(/images/products.png)",
            backgroundPosition: positions[fragment],
          }}
        />
      </span>
    );
  return (
    <img
      className={`product-photo ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
    />
  );
}
