import React, { useContext } from "react";
import { Button, Box } from "@mui/material";
import { ImageContext } from "../Form";

function ActionButtons() {
  const { state, onSubmit, handleSubmit } = useContext(ImageContext);
  const { fileList, newWidthValue, newHeightValue, processing } = state;

  const hasFiles = fileList && fileList.length > 0;
  const hasAnyDim = Boolean(newWidthValue) || Boolean(newHeightValue); // allow 1 dimension
  const allPNG = hasFiles && fileList.every(f => f.type === "image/png");

  return (
    <Box mt={2}>
      <Button
        sx={{ mr: 1 }}
        variant="contained"
        color="primary"
        disabled={!hasFiles || !hasAnyDim || !!processing}
        onClick={handleSubmit(data => onSubmit(data, false))}
      >
        Resize
      </Button>

      <Button
        variant="contained"
        color="primary"
        disabled={!hasFiles || !!processing} // stays enabled for PNGs
        onClick={handleSubmit(data => onSubmit(data, true))}
      >
        Optimize
      </Button>

      {allPNG && (
        <Box mt={1} sx={{ fontSize: 12, opacity: 0.8 }}>
          PNG optimization is lossless; size changes may be small. Quality affects JPEG/WebP only.
        </Box>
      )}
    </Box>
  );
}

export default ActionButtons;
