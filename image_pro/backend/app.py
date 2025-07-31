from flask import Flask, request, send_from_directory, jsonify, url_for
from flask_cors import CORS
from PIL import Image, ImageOps, TiffImagePlugin
import piexif
import os
import base64
import io

app = Flask(__name__)

CORS(app, origins=["http://localhost:3000"])

input_dir = "./input"
output_dir = "./output"

if not os.path.exists(input_dir):
    os.makedirs(input_dir)

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def image_to_base64(image):
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode('ascii')
    return f"data:image/jpeg;base64,{img_str}"

@app.route('/upload', methods=['POST'])
def upload():
    try:
        uploaded_files = request.files.getlist('file[]')  # Get all files as a list
        width = request.form.get('width')
        height = request.form.get('height')
        optimize = request.form.get('optimize') == 'true'
        quality = int(request.form.get('quality')) if optimize else None

        response_data = []

        for uploaded_file in uploaded_files:
            print(f"Processing file: {uploaded_file.filename}")
            filename = uploaded_file.filename

            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif')):
                input_path = os.path.join(input_dir, filename)
                uploaded_file.save(input_path)

                img = Image.open(input_path)
                original_width, original_height = img.size

                original_size = os.path.getsize(input_path)

                # Resizing block
                if width or height:
                    # if both width and height are provided, use them directly
                    if width and height:
                        new_width = int(width)
                        new_height = int(height)
                    elif width:
                        # only width provided, calculate height using original aspect ratio
                        new_width = int(width)
                        new_height = int(original_height * new_width / original_width)
                    else:
                        # only height provided, calculate width using original aspect ratio
                        new_height = int(height)
                        new_width = int(original_width * new_height / original_height)

                    img_resized = img.resize((new_width, new_height), resample=Image.LANCZOS)
                else:
                    img_resized = img


                # Convert image to RGB mode if it has an alpha channel (transparency)
                if img_resized.mode == 'RGBA':
                    img_resized = img_resized.convert('RGB')

                output_path = os.path.join(output_dir, filename)

                # Optimization block
                if optimize:
                    # Remove EXIF data
                    try:
                        exif_dict = piexif.load(img.info["exif"])
                        exif_bytes = piexif.dump(exif_dict) if exif_dict else b''
                    except (AttributeError, KeyError):
                        exif_bytes = b''

                    img_optimized = ImageOps.autocontrast(img_resized, cutoff=0, ignore=None)
                    img_optimized.save(output_path, optimize=True, quality=quality, exif=exif_bytes)
                else:
                    img_resized.save(output_path)

                optimized_size = os.path.getsize(output_path)
                optimized_image_url = url_for('get_image', filename=filename, _external=True)
                new_width, new_height = img_resized.size
                print("Optimized image URL:", optimized_image_url)
                print(f"Quality: {quality}")

                response_data.append({
                    "filename": filename,
                    "original_size": original_size,
                    "optimized_size": optimized_size,
                    "original_width": original_width,
                    "original_height": original_height,
                    "new_width": new_width,
                    "new_height": new_height,
                    "optimized_image_url": optimized_image_url,
                    "optimized_size_bytes": optimized_size,
                    "original_image_data": image_to_base64(img),
                    "resized_image_data": image_to_base64(img_resized) if not optimize else "",
                })
            else:
                return "Invalid file format", 400

            os.remove(input_path)
        return jsonify(response_data)
    except Exception as e:
        print(f"An error occurred while processing the upload: {e}")
        return str(e), 400

@app.route('/output/<filename>')
def get_image(filename):
    return send_from_directory(output_dir, filename)

if __name__ == '__main__':
    app.run(debug=True)
