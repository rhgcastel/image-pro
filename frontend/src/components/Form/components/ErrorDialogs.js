import React, { useContext } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { ImageContext } from "../Form";

function ErrorDialogs() {
    const { state, dispatch } = useContext(ImageContext);
    const { dimensionError, fileSizeError, invalidFilesDialogOpen, invalidFileNames } = state;

    return (
        <>
            <Dialog open={dimensionError} onClose={() => dispatch({ type: 'SET_DIMENSION_ERROR', payload: false })}>
                <DialogTitle>Dimension Exceeded</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        The image dimension values should be between 1 and 8000.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => dispatch({ type: 'SET_DIMENSION_ERROR', payload: false })}>OK</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={fileSizeError} onClose={() => dispatch({ type: 'SET_FILE_SIZE_ERROR', payload: false })}>
                <DialogTitle>File Size Issue</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        The total file size should not exceed 100MB.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => dispatch({ type: 'SET_FILE_SIZE_ERROR', payload: false })}>OK</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={invalidFilesDialogOpen} onClose={() => dispatch({ type: 'SET_INVALID_FILES_DIALOG_OPEN', payload: false })}>
                <DialogTitle>Invalid File(s) Selected</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Only the following formats are allowed: <strong>.jpg</strong>, <strong>.jpeg</strong>, <strong>.gif</strong>, and <strong>.tiff</strong>.
                        <br />
                        Files with invalid format:
                        {invalidFileNames.map((fileName, index) => (
                            <React.Fragment key={index}>
                                <br />
                                <strong>{fileName}</strong>
                            </React.Fragment>
                        ))}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => dispatch({ type: 'SET_INVALID_FILES_DIALOG_OPEN', payload: false })} color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default ErrorDialogs;
