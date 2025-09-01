import React, { useContext } from 'react';
import { Button } from '@mui/material';
import { ImageContext } from "../Form";

function DownloadButton() {
    const { state, downloadAll } = useContext(ImageContext);
    const { images } = state;

    return (
        <>
            <Button
                variant="contained"
                color="info"
                onClick={downloadAll}
                style={{ marginLeft: 8 }}
            >
                Download All
            </Button>
        </>
    );
}

export default DownloadButton;
