import React, { useContext } from 'react';
import { TextField } from '@mui/material';
import { ImageContext } from "../Form";

function FileInputField() {
    const { register, fileInputRef, handleFileChange } = useContext(ImageContext);

    return (
        <TextField
            label="Select the file(s)"
            InputLabelProps={{
                shrink: true
            }}
            type="file"
            variant="outlined"
            {...register("file", { required: "Please select an image" })}
            InputProps={{ inputProps: { multiple: "multiple" } }}
            inputRef={fileInputRef}
            sx={{ mb: 1 }}
            onChange={handleFileChange}
        />
    );
}

export default FileInputField;
