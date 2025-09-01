import React from 'react';
import { CardContent, Typography, Box, CardMedia } from '@mui/material';

const ImageCard = ({ image, isOptimized }) => (
    <CardContent>
        <Typography gutterBottom variant="h5" component="div" align='center'>
            {isOptimized ? 'Optimized Image' : 'Resized Image'}
        </Typography>
        <Box sx={{display: 'flex', justifyContent: 'space-around', mt: 2, mr: -5, ml: -3}}>
            {isOptimized && (
                <CardMedia
                    component="img"
                    alt="Original Image"
                    image={isOptimized ? image.originalImage : image.resizedImage}
                    title="Original Image"
                    sx={{
                        maxWidth: '200px',
                        ml: -1.5,
                        mr: -4.5,
                        height: '200px',
                        objectFit: 'contain',
                    }}
                />
            )}
            <CardMedia
                component="img"
                alt={isOptimized ? "Optimized Image" : "Resized Image"}
                image={isOptimized ? image.optimizedImage : image.resizedImage}
                title={isOptimized ? "Optimized Image" : "Resized Image"}
                sx={{
                    margin: isOptimized ? 'undefined' : 'auto',
                    width: '200px',
                    height: '200px',
                    objectFit: 'contain',
                    display: 'block',
                }}
            />

        </Box>
    </CardContent>
);

export default ImageCard;
