import React, {useContext} from 'react';
import {TextField, Box, FormControlLabel, Checkbox} from '@mui/material';
import {ImageContext} from "../../Form/Form";

const DimensionControls = ({
                               width,
                               height,
                               onWidthChange,
                               onHeightChange,
                               preserveAspectRatio,
                               setPreserveAspectRatio
                           }) => {

        return (
        <Box sx={{display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 2, marginBottom: 1.4 }}>
            <TextField
                label="Width"
                type="number"
                InputLabelProps={{shrink: true}}
                value={width}
                onChange={onWidthChange}
                sx={{width: 80, backgroundColor: 'white'}}
            />
            <TextField
                label="Height"
                type="number"
                InputLabelProps={{shrink: true}}
                value={height}
                onChange={onHeightChange}
                sx={{width: 80, backgroundColor: 'white'}}
            />
            <FormControlLabel
                control={<Checkbox checked={preserveAspectRatio}
                                   onChange={(event) => setPreserveAspectRatio(event.target.checked)}/>}
                label="Preserve aspect ratio"
            />
        </Box>
    )
};

export default DimensionControls;
