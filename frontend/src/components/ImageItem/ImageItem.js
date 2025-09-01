import React, {useState, useEffect, useMemo, useCallback, useContext} from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useDebounce from '../../hooks/useDebounce';
import ErrorDialog from "./components/ErrorDialog";
import QualitySlider from "./components/QualitySlider";
import DimensionControls from "./components/DimensionControls";
import ImageCard from "./components/ImageCard";
import {ImageContext} from '../Form/Form';


const MAX_WIDTH = 10000; // maximum width limit
const MAX_HEIGHT = 10000; // maximum height limit
const MAX_TOTAL_FILE_SIZE_MB = 100; // maximum total file size limit in MB

const ImageItem = ({image, index}) => {
    const {state, dispatch} = useContext(ImageContext);
    const [inputQuality, setInputQuality] = useState(image.quality);
    const [newImageWidth, setNewImageWidth] = useState(image.newImageWidth);
    const [newImageHeight, setNewImageHeight] = useState(image.newImageHeight);
    const [preserveAspectRatio, setPreserveAspectRatio] = useState(false);
    const [lastUpdatedField, setLastUpdatedField] = useState(null);
    const [fileSizeError, setFileSizeError] = useState(false);
    const [dimensionError, setDimensionError] = useState(false);


    const debouncedQuality = useDebounce(inputQuality, 350);
    const aspectRatio = useMemo(() => image.originalImageWidth / image.originalImageHeight, [image]);
    const isOptimized = useMemo(() => image.operation === 'Optimized', [image.operation]);

    useEffect(() => {
        dispatch({type: 'SET_QUALITY', payload: image.quality});
    }, [image]);

    useEffect(() => {
        if (preserveAspectRatio) {
            const currentAspectRatio = newImageWidth / newImageHeight;
            if (currentAspectRatio !== aspectRatio) {
                if (lastUpdatedField === 'width') {
                    setNewImageHeight(Math.round(newImageWidth / aspectRatio));
                } else if (lastUpdatedField === 'height') {
                    setNewImageWidth(Math.round(newImageHeight * aspectRatio));
                }
            }
        }
    }, [preserveAspectRatio, newImageWidth, newImageHeight, aspectRatio, lastUpdatedField]);


    useEffect(() => {
        if (debouncedQuality !== inputQuality) {
            setInputQuality(debouncedQuality);
        }
    }, [debouncedQuality]);


    useEffect(() => {
        if (debouncedQuality !== image.quality) {
            dataUrlToImage(image.originalImage)
                .then(img => optimizeImage(img, debouncedQuality))
                .then(dataUrl => {
                    fetch(dataUrl)
                        .then(response => response.blob())
                        .then(blob => {
                            const updatedOptimizedSize = blob.size;
                            const updatedImage = {
                                ...image,
                                optimizedImage: dataUrl,
                                optimizedSizeMB: (updatedOptimizedSize / (1024 * 1024)).toFixed(2),
                                quality: debouncedQuality,
                            };
                            dispatch({type: 'UPDATE_IMAGE', payload: {index: index, updatedImage: updatedImage}});
                        })
                        .catch(error => {
                            console.error("An error occurred when updating the quality: ", error);
                        });
                });
        }
    }, [debouncedQuality, image, dispatch]);


    const updateImageSize = useCallback(
        async (newWidth, newHeight) => {
            const img = await dataUrlToImage(image.originalImage);
            const {canvas, data} = await resizeImage(img, newWidth, newHeight);
            const response = await fetch(data);
            const blob = await response.blob();
            const updatedResizedSize = blob.size;
            const updatedImage = {
                ...image,
                resizedImage: data,
                resizedSizeMB: (updatedResizedSize / (1024 * 1024)).toFixed(2),
                newImageWidth: newWidth,
                newImageHeight: newHeight,
            };
            dispatch({type: 'UPDATE_IMAGE', payload: {index: index, updatedImage: updatedImage}});
        },
        [dispatch]
    );


    useEffect(() => {
        updateImageSize(newImageWidth, newImageHeight);
    }, [newImageWidth, newImageHeight, updateImageSize, dispatch]);

    const handleQualityChange = useCallback(async (event, newValue) => {
        setInputQuality(newValue);
    }, [setInputQuality]);


    const handleWidthChangeOnCard = async (event) => {
        let value = parseInt(event.target.value, 10);
        if (isNaN(value) || value < 1) {
            value = 1; // Set a minimum value of 1
        }
        if (value > MAX_WIDTH) {
            setDimensionError(true);
            return;
        }
        setDimensionError(false);
        setNewImageWidth(value);
        setLastUpdatedField('width');
        if (preserveAspectRatio) {
            setNewImageHeight(Math.round(value / aspectRatio));
        }
        await updateImageSize(value, newImageHeight);
    };

    const handleHeightChangeOnCard = async (event) => {
        let value = parseInt(event.target.value, 10);
        if (isNaN(value) || value < 1) {
            value = 1; // Set a minimum value of 1
        }
        if (value > MAX_HEIGHT) {
            setDimensionError(true);
            return;
        }
        setDimensionError(false);
        setNewImageHeight(value);
        setLastUpdatedField('height');
        if (preserveAspectRatio) {
            setNewImageWidth(Math.round(value * aspectRatio));
        }
        await updateImageSize(newImageWidth, value);
    };


    const handleFileChange = (e) => {
        const files = e.target.files;
        const totalFileSize = Array.from(files).reduce((total, file) => total + file.size, 0);
        if (totalFileSize > MAX_TOTAL_FILE_SIZE_MB * 1024 * 1024) {
            setFileSizeError(true);
            e.target.value = '';
            return;
        }
        setFileSizeError(false);
    };


    const resizeImage = async (img, width, height) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        return await new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    const data = URL.createObjectURL(blob);
                    resolve({canvas, data});
                },
                "image/jpeg"
            );
        });
    };


    const downloadImage = () => {
        const imageData = isOptimized ? image.optimizedImage : image.resizedImage;
        fetch(imageData)
            .then((response) => response.blob())
            .then((blob) => {
                if (!blob) {
                    console.error('Invalid blob');
                    return;
                }
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = isOptimized ? `${image.filename}_optimized.jpg` : `${image.filename}_resized.jpg`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch((error) => {
                console.error('Error fetching blob:', error);
            });
    };


    const openImage = () => {
        const imageData = isOptimized ? image.optimizedImage : image.resizedImage;
        fetch(imageData)
            .then((response) => response.blob())
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            });
    };


    const dataUrlToImage = (dataUrl) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => resolve(img);
        });
    };

    const optimizeImage = async (img, quality) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL("image/jpeg", quality / 100);
    };

    const handleClose = () => {
        // Create a copy of the current images array
        const updatedImages = [...state.images];

        // Remove the image at the specified index
        updatedImages.splice(index, 1);

        // Dispatch an action to update the images state
        dispatch({type: 'SET_IMAGES', payload: updatedImages});
    };


    return (
        <Card
            sx={{
                width: '400px',
                height: '550px',
                backgroundColor: '#f7f7f7',
                boxShadow: '4px 4px 4px rgba(0, 0, 0, 0.3)',
            }}>
            <CardContent>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="h6" component="div">
                        {image.title}
                    </Typography>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close"
                    >
                        <CloseIcon/>
                    </IconButton>
                </Box>

                <ImageCard image={image} isOptimized={isOptimized}/>

                <Box sx={{display: 'flex', flexDirection: 'column'}}>
                    {isOptimized ? (
                        <Box sx={{justifyContent: 'space-between'}}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 3,
                                ml: 2.5,
                                mr: 1.5,
                                mt: -1
                            }}>
                                <Typography variant="body2" color="text.secondary" align="center">
                                    Original size: {image.originalSizeMB} MB
                                </Typography>
                                <Typography variant="body2" color="text.secondary" align="center">
                                    Optimized size: {image.optimizedSizeMB} MB
                                </Typography>
                            </Box>

                            <QualitySlider
                                value={inputQuality}
                                onChange={handleQualityChange}
                                sx={{marginBottom: 2}}
                            />

                        </Box>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary" align="center"
                                        sx={{marginBottom: 2, marginTop: -1}}>
                                Original dimensions: {image.originalImageWidth}x{image.originalImageHeight}
                            </Typography>

                            <DimensionControls
                                width={newImageWidth}
                                onWidthChange={handleWidthChangeOnCard}
                                height={newImageHeight}
                                onHeightChange={handleHeightChangeOnCard}
                                preserveAspectRatio={preserveAspectRatio}
                                setPreserveAspectRatio={setPreserveAspectRatio}
                            />
                        </>
                    )}
                </Box>

                <Box sx={{display: 'flex', justifyContent: 'space-around'}} mt={2}>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={downloadImage}
                    >
                        Download
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={openImage}
                    >
                        Open
                    </Button>
                </Box>


            </CardContent>

            <ErrorDialog
                title="File Size Exceeded"
                content={`The total file size should not exceed ${MAX_TOTAL_FILE_SIZE_MB} MB.`}
                open={fileSizeError}
                handleClose={() => setFileSizeError(false)}
            />

            <ErrorDialog
                title="Dimension Exceeded"
                content={`The image dimensions should not exceed ${MAX_WIDTH}x${MAX_HEIGHT}.`}
                open={dimensionError}
                handleClose={() => setDimensionError(false)}
            />

        </Card>
    );
};

export default ImageItem;
