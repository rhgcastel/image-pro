import React, { useContext, useEffect } from 'react';
import { TextField, FormControlLabel, Checkbox } from '@mui/material';
import { ImageContext } from "../Form";

function DimensionFields() {
    const { state, dispatch, handleWidthChange, handleHeightChange } = useContext(ImageContext);
    const { newWidthValue, newHeightValue, fileList, maintainAspectRatio } = state;

    useEffect(() => {
        if (fileList.length === 0) {
            dispatch({ type: 'RESET_DIMENSIONS' });
        }
    }, [fileList, dispatch]);

    return (
        <>
            <TextField
                variant="outlined"
                InputLabelProps={{
                    shrink: true
                }}
                label="Width (px)"
                type="number"
                value={newWidthValue}
                onChange={handleWidthChange}
                disabled={fileList < 1 && maintainAspectRatio}
                sx={{ mb: 1, opacity: fileList < 1 ? 0.2 : 1 }}
            />
            <TextField
                label="Height (px)"
                type="number"
                InputLabelProps={{
                    shrink: true
                }}
                value={newHeightValue}
                onChange={handleHeightChange}
                disabled={fileList < 1 && maintainAspectRatio}
                sx={{ mb: 1, opacity: fileList < 1 ? 0.2 : 1 }}
            />

            <FormControlLabel
                control={
                    <Checkbox
                        checked={maintainAspectRatio}
                        onChange={(e) => dispatch({ type: 'SET_MAINTAIN_ASPECT_RATIO', payload: e.target.checked })}
                    />
                }
                label="Maintain Aspect Ratio"
                sx={{ mb: 1 }}
            />
        </>
    );
}

export default DimensionFields;
