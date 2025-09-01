export function imageReducer(state, action) {
    switch (action.type) {
        case 'SET_IMAGES':
            return {...state, images: action.payload};
        case 'SET_QUALITY':
            return {...state, quality: action.payload};
        case 'SET_PROCESSING':
            return {...state, processing: action.payload};
        case 'SET_ASPECT_RATIO':
            return {...state, aspectRatio: action.payload};
        case 'SET_FILE_LIST':
            return {...state, fileList: action.payload};
        case 'SET_CLEAR_DIALOG_OPEN':
            return {...state, clearDialogOpen: action.payload};
        case 'SET_DIMENSION_ERROR':
            return {...state, dimensionError: action.payload};
        case 'SET_FILE_SIZE_ERROR':
            return {...state, fileSizeError: action.payload};
        case 'SET_MAINTAIN_ASPECT_RATIO':
            return {...state, maintainAspectRatio: action.payload};
        case 'SET_ORIGINAL_WIDTH':
            return {...state, originalWidth: action.payload};
        case 'SET_ORIGINAL_HEIGHT':
            return {...state, originalHeight: action.payload};
        case 'SET_NEW_WIDTH_VALUE':
            return {...state, newWidthValue: action.payload};
        case 'SET_NEW_HEIGHT_VALUE':
            return {...state, newHeightValue: action.payload};
        case 'SET_LAST_CHANGED':
            return {...state, lastChanged: action.payload};
        case 'SET_MANUAL_CHANGE':
            return {...state, manualChange: action.payload};
        case 'SET_INVALID_FILES_DIALOG_OPEN':
            return {...state, invalidFilesDialogOpen: action.payload};
        case 'SET_INVALID_FILE_NAMES':
            return {...state, invalidFileNames: action.payload};
        case 'UPDATE_IMAGE':
            const newArray = [...state.images];
            newArray[action.payload.index] = action.payload.updatedImage;
            return {
                ...state,
                images: newArray
            };
        case 'RESET_DIMENSIONS':
            return {
                ...state,
                newWidthValue: '',
                newHeightValue: ''
            };
        case 'TOGGLE_CLEAR_DIALOG':
            return {...state, clearDialogOpen: !state.clearDialogOpen};
        case 'ADD_IMAGE':
            return {...state, images: [...state.images, action.payload]};
        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
}