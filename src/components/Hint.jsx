import { useState } from "react";

const hintStyle = {
  backgroundColor: "rgb(255, 252, 205)",
  color: "black",
  border: "1px solid black",
  borderRadius: "5px",
  padding: "2px",
  position: "absolute",
  zIndex: "10",
  right: "-1rem",
  width: "min(300rem, 50vw)",

  boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
};

const Hint = ({ children }) => {
  const [hover, setHover] = useState(false);
  const onHover = () => {
    setHover(true);
  };

  const onLeave = () => {
    setHover(false);
  };

  if (typeof children != "string") {
    throw new Error("Hint must be a string.");
  }
  const alt = children.trim();
  return (
    <div style={{ display: "inline", position: "relative" }}>
      <span
        style={{ cursor: "help" }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        💡
      </span>
      {hover ? <div style={hintStyle}>{alt}</div> : null}
    </div>
  );
};
export default Hint;
