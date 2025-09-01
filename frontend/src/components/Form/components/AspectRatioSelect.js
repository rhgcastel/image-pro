import React, { useContext } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ImageContext } from '../Form';

function AspectRatioSelect() {
    const { state, dispatch } = useContext(ImageContext);
    const { maintainAspectRatio, fileList, aspectRatio } = state;

    const handleAspectRatioChange = (event) => {
        dispatch({ type: 'SET_ASPECT_RATIO', payload: event.target.value });
    };

    return (
        <FormControl fullWidth sx={{ mb: 1 }}>
            <InputLabel
                id="aspect-ratio-label"
                sx={{
                    opacity: maintainAspectRatio || fileList.length < 1 ? 0.2 : 1
                }}
            >
                Custom Aspect Ratio
            </InputLabel>
            <Select
                labelId="aspect-ratio-label"
                value={aspectRatio || ""}
                onChange={handleAspectRatioChange}
                label="Custom Aspect Ratio"
                disabled={maintainAspectRatio || fileList.length < 1}
                sx={{ opacity: maintainAspectRatio || fileList.length < 1 ? 0.2 : 1 }}
            >
                <MenuItem value="1:1">1:1</MenuItem>
                <MenuItem value="4:3">4:3</MenuItem>
                <MenuItem value="3:2">3:2</MenuItem>
                <MenuItem value="16:9">16:9</MenuItem>
            </Select>
        </FormControl>
    );
}

export default AspectRatioSelect;
