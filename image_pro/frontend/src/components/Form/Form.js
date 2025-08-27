import React, { useRef, useEffect, useReducer, createContext } from "react";
import { useForm } from "react-hook-form";
import { Box } from "@mui/material";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import FileInputField from "./components/FileInputField";
import ImageQualitySlider from "./components/ImageQualitySlider";
import DimensionFields from "./components/DimensionFields";
// import AspectRatioSelect from "./components/AspectRatioSelect";
import ActionButtons from "./components/ActionButtons";
import ClearDialog from "./components/ClearDialog";
import DownloadButton from "./components/DownloadButton";
import ImageGrid from "./components/ImageGrid";
import SnackbarProcessing from "./components/SnackbarProcessing";
import ErrorDialogs from "./components/ErrorDialogs";

import { imageReducer } from "../../reducer/imageReducer";
import { initialState } from "../../reducer/initialState";

export const ImageContext = createContext({
  state: initialState,
  dispatch: () => null,
  onSubmit: () => null,
  handleSubmit: () => null,
  register: () => null,
  watch: () => null,
  setValue: () => null,
  downloadAll: () => null,
  fileInputRef: null,
  handleFileChange: () => null,
  handleWidthChange: () => null,
  handleHeightChange: () => null,
  clearAll: () => null,
});

// Configurable API base (Vite or CRA), falls back to local Flask
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:5050";

function Form() {
  const [state, dispatch] = useReducer(imageReducer, initialState);
  const { register, handleSubmit, watch, setValue } = useForm();
  const fileInputRef = useRef();
  const originalFilesRef = useRef([]); // <- keep immutable originals for optimize

  const validTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/tiff",
    "image/webp",
  ];

  const width = watch("width");
  const height = watch("height");

  // Derived UI state
  const hasFiles = state.fileList && state.fileList.length > 0;
  const allPNG = hasFiles && state.fileList.every((f) => f.type === "image/png");
  const qualityDisabled = allPNG; // quality doesn't apply to PNG unless converting

  // Maintain aspect ratio logic (unchanged from your version)
  useEffect(() => {
    if (state.maintainAspectRatio && !state.manualChange) {
      const calculatedHeight = Math.round(
        (state.newWidthValue * state.originalHeight) / state.originalWidth
      );
      const calculatedWidth = Math.round(
        (state.newHeightValue * state.originalWidth) / state.originalHeight
      );

      if (
        state.lastChanged === "width" &&
        state.newWidthValue &&
        calculatedHeight !== state.newHeightValue
      ) {
        setValue("height", calculatedHeight);
      } else if (
        state.lastChanged === "height" &&
        state.newHeightValue &&
        calculatedWidth !== state.newWidthValue
      ) {
        setValue("width", calculatedWidth);
      }
    }
    dispatch({ type: "SET_MANUAL_CHANGE", payload: true });
  }, [
    state.maintainAspectRatio,
    state.newWidthValue,
    state.newHeightValue,
    state.manualChange,
    setValue,
    state.lastChanged,
    state.originalWidth,
    state.originalHeight,
    state.aspectRatio,
  ]);

  const handleClearDialogOpen = () => {
    dispatch({ type: "TOGGLE_CLEAR_DIALOG", payload: true });
  };

  const handleClearDialogClose = () => {
    dispatch({ type: "TOGGLE_CLEAR_DIALOG", payload: false });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = [];
    const invalidFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (validTypes.includes(file.type)) validFiles.push(file);
      else invalidFiles.push(file.name);
    }

    if (invalidFiles.length > 0) {
      dispatch({ type: "SET_INVALID_FILE_NAMES", payload: invalidFiles });
      dispatch({ type: "SET_INVALID_FILES_DIALOG_OPEN", payload: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    dispatch({ type: "SET_QUALITY", payload: 85 });
    dispatch({ type: "SET_FILE_LIST", payload: validFiles });
    originalFilesRef.current = validFiles; // <- preserve originals for optimize

    if (validFiles.length === 1) {
      const img = await createImage(validFiles[0]);
      dispatch({ type: "SET_ORIGINAL_WIDTH", payload: img.width });
      dispatch({ type: "SET_ORIGINAL_HEIGHT", payload: img.height });
      dispatch({
        type: "SET_ASPECT_RATIO",
        payload: (img.width / img.height).toFixed(2),
      });
    } else if (validFiles.length < 1) {
      dispatch({ type: "SET_ORIGINAL_WIDTH", payload: null });
      dispatch({ type: "SET_ORIGINAL_HEIGHT", payload: null });
      dispatch({ type: "SET_ASPECT_RATIO", payload: null });
    }
  };

  const handleWidthChange = async (e) => {
    const newWidth = e.target.value;
    dispatch({ type: "SET_NEW_WIDTH_VALUE", payload: newWidth });

    if (state.maintainAspectRatio && state.fileList[0]) {
      const img = await createImage(state.fileList[0]);
      const originalAspectRatio = img.width / img.height;
      const newHeight = Math.round(newWidth / originalAspectRatio);
      setValue("height", newHeight);
      dispatch({ type: "SET_NEW_HEIGHT_VALUE", payload: newHeight });
    }
  };

  const handleHeightChange = async (e) => {
    const newHeight = e.target.value;
    dispatch({ type: "SET_NEW_HEIGHT_VALUE", payload: newHeight });

    if (state.maintainAspectRatio && state.fileList[0]) {
      const img = await createImage(state.fileList[0]);
      const originalAspectRatio = img.width / img.height;
      const newWidth = Math.round(newHeight * originalAspectRatio);
      setValue("width", newWidth);
      dispatch({ type: "SET_NEW_WIDTH_VALUE", payload: newWidth });
    }
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  const createImage = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => resolve(img);
    });

  const handleApiCall = async (formData) => {
    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        // Let the browser set the multipart boundary automatically
        headers: {},
        withCredentials: false,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading the image:", error);
      return null;
    }
  };

  const clearAll = () => {
    dispatch({ type: "SET_IMAGES", payload: [] });
    dispatch({ type: "SET_CLEAR_DIALOG_OPEN", payload: false });
    originalFilesRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    dispatch({ type: "SET_FILE_LIST", payload: [] });
    setValue("width", "");
    setValue("height", "");
  };

  const onSubmit = async (data, optimize = false) => {
    const formWidth = state.newWidthValue;
    const formHeight = state.newHeightValue;

    // Use originals for OPTIMIZE; current selection for RESIZE
    const sourceFiles = optimize ? originalFilesRef.current : state.fileList;

    if (!sourceFiles || !sourceFiles.length) {
      console.error("No files uploaded.");
      return;
    }

    if (!optimize) {
      // Resize validations
      if (formWidth && (formWidth < 1 || formWidth > 8000)) {
        dispatch({ type: "SET_DIMENSION_ERROR", payload: true });
        return;
      }
      if (formHeight && (formHeight < 1 || formHeight > 8000)) {
        dispatch({ type: "SET_DIMENSION_ERROR", payload: true });
        return;
      }
    }

    dispatch({ type: "SET_PROCESSING", payload: true });

    const formData = new FormData();
    if (formWidth) formData.append("width", String(formWidth));
    if (formHeight) formData.append("height", String(formHeight));
    formData.append("optimize", optimize ? "true" : "false");
    if (optimize) formData.append("quality", String(state.quality));
    // Optional: add convert_to if you add a format select
    // formData.append("convert_to", selectedFormat); // '', 'jpeg', 'webp'

    sourceFiles.forEach((file) => formData.append("file[]", file));

    const responseDataArray = await handleApiCall(formData);

    if (!responseDataArray || !responseDataArray.length) {
      console.error("No response data received from backend.");
      dispatch({ type: "SET_PROCESSING", payload: false });
      return;
    }

    responseDataArray.forEach((responseData, i) => {
      const optimizedImage = {
        filename: responseData.filename.replace(/\.[^/.]+$/, ""),
        originalImage: URL.createObjectURL(sourceFiles[i]),
        optimizedImage: responseData.optimized_image_url,
        originalSizeMB: (responseData.original_size / (1024 * 1024)).toFixed(2),
        optimizedSizeMB: (responseData.optimized_size / (1024 * 1024)).toFixed(2),
        originalImageWidth: responseData.original_width,
        originalImageHeight: responseData.original_height,
        newImageWidth: responseData.new_width,
        newImageHeight: responseData.new_height,
        operation: optimize ? "Optimized" : "Resized",
        quality: state.quality,
        resizedImage: responseData.resized_image_data,
        originalFile: sourceFiles[i], // keep reference to the source file
      };
      dispatch({ type: "ADD_IMAGE", payload: optimizedImage });
    });

    // For RESIZE: clear selection; For OPTIMIZE: keep originals so slider reuses them
    if (!optimize) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      dispatch({ type: "SET_FILE_LIST", payload: [] });
      setValue("width", "");
      setValue("height", "");
    }

    dispatch({ type: "SET_PROCESSING", payload: false });
  };

  const downloadAll = async () => {
    if (!state.images || !state.images.length) return;

    const zip = new JSZip();
    const operation =
      state.images[0].operation === "Optimized" ? "optimized" : "resized";
    const zipFileName = `images.zip`;

    const promises = state.images.map(async (image) => {
      const response = await fetch(image.optimizedImage);
      const blob = await response.blob();
      const fileName = `${image.filename}_${operation}.jpg`; // or derive from URL ext
      zip.file(fileName, blob, { binary: true });
    });

    await Promise.all(promises);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, zipFileName);
  };

  return (
    <ImageContext.Provider
      value={{
        state,
        dispatch,
        onSubmit,
        handleSubmit,
        register,
        watch,
        setValue,
        downloadAll,
        fileInputRef,
        handleFileChange,
        handleWidthChange,
        handleHeightChange,
        clearAll,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit((data) => onSubmit(data, false))}
        mt={4}
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <FileInputField
          register={register}
          fileInputRef={fileInputRef}
          fileList={state.fileList}
        />

        <ImageQualitySlider
          quality={state.quality}
          fileList={state.fileList}
          disabled={qualityDisabled}
          helperText={
            qualityDisabled
              ? "PNG is lossless; quality affects JPEG/WebP only."
              : undefined
          }
          // Optional: trigger optimize on slider release (debounce inside slider)
          // onChangeCommitted={() => onSubmit({}, true)}
        />

        <DimensionFields
          width={width}
          handleWidthChange={handleWidthChange}
          height={height}
          handleHeightChange={handleHeightChange}
          maintainAspectRatio={state.maintainAspectRatio}
          fileList={state.fileList}
        />

        {/* 
        <AspectRatioSelect
          maintainAspectRatio={state.maintainAspectRatio}
          fileList={state.fileList}
          aspectRatio={state.aspectRatio}
          handleAspectRatioChange={handleAspectRatioChange}
        />
        */}

        <ActionButtons
          handleSubmit={handleSubmit}
          fileList={state.fileList}
          width={width}
          height={height}
          aspectRatio={state.aspectRatio}
        />

        <Box mt={2} align="center">
          <ClearDialog
            images={state.images}
            handleClearDialogOpen={handleClearDialogOpen}
            clearDialogOpen={state.clearDialogOpen}
            handleClearDialogClose={handleClearDialogClose}
            clearAll={clearAll}
          />

          {state.images && state.images.length > 1 && <DownloadButton />}
        </Box>

        <ImageGrid images={state.images} />

        <SnackbarProcessing processing={state.processing} />

        <ErrorDialogs
          dimensionError={state.dimensionError}
          fileSizeError={state.fileSizeError}
          invalidFilesDialogOpen={state.invalidFilesDialogOpen}
          invalidFileNames={state.invalidFileNames}
        />
      </Box>
    </ImageContext.Provider>
  );
}

export default Form;
