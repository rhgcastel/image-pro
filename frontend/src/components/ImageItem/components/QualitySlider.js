import React from 'react';
import { Slider, Typography, Box } from '@mui/material';

const QualitySlider = ({ value, onChange, ...extraProps }) => {
    const handleSliderChange = (event, newValue) => {
        onChange(event, newValue)
            .catch((error) => {
                console.error('Error updating quality:', error);
            });
    }

    return (
        <Box sx={{justifyContent: 'space-around', maxWidth: '350px', marginLeft: 5, marginRight: 5 }}>
            <Typography mt={1} variant="body2" color="text.secondary" align="center" gutterBottom>Quality ({value})</Typography>
            <Slider
                value={value}
                onChange={handleSliderChange}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={1}
                max={99}
                sx={{ marginBottom: 2 }}
                {...extraProps}
            />
        </Box>
    );
}

export default QualitySlider;
