export const dataUrlToImage = (dataUrl) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => resolve(img);
    });
};

export const optimizeImage = async (img, quality) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return await new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                const data = URL.createObjectURL(blob);
                resolve({ canvas, data });
            },
            "image/jpeg",
            quality / 100
        );
    });
};

export const resizeImage = async (img, width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                const data = URL.createObjectURL(blob);
                resolve({ canvas, data });
            },
            "image/jpeg"
        );
    });
};
