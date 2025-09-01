import React, { useContext, useRef } from "react";
import { Typography, Slider, Box } from "@mui/material";
import { ImageContext } from "../Form";

function ImageQualitySlider() {
  const ctx = useContext(ImageContext);
  const { state, dispatch } = ctx;
  const { quality, fileList = [], processing } = state || {};

  const hasFiles = fileList.length > 0;
  const allPNG = hasFiles && fileList.every(f => f.type === "image/png");
  const disabled = !hasFiles || allPNG;

  // Optional debounce if you later switch to onChange instead of onChangeCommitted
  const debounceRef = useRef(null);

  const handleChange = (_event, newValue) => {
    dispatch({ type: "SET_QUALITY", payload: newValue });
  };

  const handleChangeCommitted = () => {
    // Only auto-run optimize for JPEG/WebP (quality-relevant), with files loaded, and not already processing
    if (!disabled && !processing && typeof ctx.onSubmit === "function" && typeof ctx.handleSubmit === "function") {
      // Run optimize using originals (assuming Form onSubmit uses originals for optimize=true)
      ctx.handleSubmit(data => ctx.onSubmit(data, true))();
    }
  };

  return (
    <Box sx={{ mb: 2, opacity: disabled ? 0.9 : 1 }}>
      <Typography gutterBottom>Quality ({quality})</Typography>
      <Slider
        value={quality}
        onChange={handleChange}
        onChangeCommitted={handleChangeCommitted}
        valueLabelDisplay="auto"
        step={1}
        marks
        min={1}
        max={99}
        disabled={disabled}
      />
    </Box>
  );
}

export default ImageQualitySlider;
