import React, { useContext } from 'react';
import { Snackbar } from '@mui/material';
import { Alert } from '@mui/material';
import { ImageContext } from "../Form";

function SnackbarProcessing() {
    const { state } = useContext(ImageContext);
    const { processing } = state;

    return (
        <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            open={processing}
            autoHideDuration={null}
        >
            <Alert variant="filled" severity="info">
                "Processing image(s)..."
            </Alert>
        </Snackbar>
    );
}

export default SnackbarProcessing;
