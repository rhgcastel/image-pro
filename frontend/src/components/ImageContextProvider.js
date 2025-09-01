import React, { useReducer } from 'react';
import { ImageContext } from './Form/Form';
import { imageReducer } from '../reducer/imageReducer'
import { initialState } from "../reducer/initialState"

export const ImageContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(imageReducer, initialState);
    return (
        <ImageContext.Provider value={{ state, dispatch }}>
            {children}
        </ImageContext.Provider>
    );
}
