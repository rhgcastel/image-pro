import React, {useState} from 'react';
import {Container, Box, Typography} from '@mui/material';
import Form from './components/Form/Form'
import {ImageContextProvider} from "./components/ImageContextProvider";

function App() {
    return (
        <Container maxWidth="md">
            <Box mt={4}>
                <Typography variant="h4" align="center">ImagePro</Typography>
            </Box>
            <ImageContextProvider>
                <Form/>
            </ImageContextProvider>
        </Container>
    );
}

export default App;
