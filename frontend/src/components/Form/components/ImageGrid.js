import React, { useContext } from 'react';
import { Grid, Box } from '@mui/material';
import ImageItem from '../../ImageItem/ImageItem';
import { ImageContext } from "../Form";

function ImageGrid() {
    const { state } = useContext(ImageContext);
    const { images } = state;

    return (
        <Grid
            container
            spacing={2}
            mt={4}
            sx={{ p: 1 }}
            maxWidth="xl"
            justifyContent="center"
        >
            {images.map((image, index) => (
                <Grid item key={index} xs={4} md={6}>
                    <ImageItem image={image} index={index} />
                </Grid>
            ))}
        </Grid>
    );
}

export default ImageGrid;
