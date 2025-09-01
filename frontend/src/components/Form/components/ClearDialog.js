import React, { useContext } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { ImageContext } from "../Form"

function ClearDialog() {
    const { state, dispatch } = useContext(ImageContext);
    const { images, clearDialogOpen } = state;

    const handleClearDialogOpen = () => {
        dispatch({ type: 'SET_CLEAR_DIALOG_OPEN', payload: true });
    };

    const handleClearDialogClose = () => {
        dispatch({ type: 'SET_CLEAR_DIALOG_OPEN', payload: false });
    };

    const clearAll = () => {
        dispatch({ type: 'SET_IMAGES', payload: [] });
        dispatch({ type: 'SET_CLEAR_DIALOG_OPEN', payload: false });
    };

    return (
        <>
            {images.length > 0 && (
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleClearDialogOpen}
                >
                    Clear All
                </Button>
            )}
            <Dialog open={clearDialogOpen} onClose={handleClearDialogClose}>
                <DialogTitle>{"Confirm Clear All"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to clear all images?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClearDialogClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={clearAll} color="primary" autoFocus>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default ClearDialog;
