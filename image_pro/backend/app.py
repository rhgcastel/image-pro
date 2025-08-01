from flask import Flask, request, send_from_directory, jsonify, url_for
from flask_cors import CORS
from PIL import Image, ImageOps
import piexif
import os
import base64
import io
import sys

# Flask App Initialization
app = Flask(__name__)

# Enable CORS for React frontend
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

# Directories for uploaded and processed files
input_dir = "./input"
output_dir = "./output"

# Ensure directories exist
os.makedirs(input_dir, exist_ok=True)
os.makedirs(output_dir, exist_ok=True)


# Helper Function: Convert Image to Base64
def image_to_base64(image):
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode('ascii')
    return f"data:image/jpeg;base64,{img_str}"


# Upload Route
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload():
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return '', 200

    try:
        # Get uploaded files
        uploaded_files = request.files.getlist('file[]')
        width = request.form.get('width')
        height = request.form.get('height')
        optimize = request.form.get('optimize') == 'true'
        quality = int(request.form.get('quality')) if optimize else None

        if not uploaded_files:
            return jsonify({"error": "No files uploaded"}), 400

        response_data = []

        for uploaded_file in uploaded_files:
            filename = uploaded_file.filename

            if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif')):
                return jsonify({"error": f"Invalid file format for {filename}"}), 400

            # Save uploaded file
            input_path = os.path.join(input_dir, filename)
            uploaded_file.save(input_path)

            # Open the uploaded image
            img = Image.open(input_path)
            original_width, original_height = img.size
            original_size = os.path.getsize(input_path)

            # Resize the image if width/height are provided
            if width or height:
                width = int(width) if width else original_width
                height = int(height) if height else original_height
                img_resized = img.resize((width, height), resample=Image.LANCZOS)
            else:
                img_resized = img

            # Convert image to RGB if necessary
            if img_resized.mode == 'RGBA':
                img_resized = img_resized.convert('RGB')

            # Save optimized or resized image
            output_path = os.path.join(output_dir, filename)

            if optimize:
                try:
                    exif_dict = piexif.load(img.info.get("exif", b""))
                    exif_bytes = piexif.dump(exif_dict)
                except (AttributeError, KeyError):
                    exif_bytes = b''

                img_optimized = ImageOps.autocontrast(img_resized, cutoff=0)
                img_optimized.save(output_path, optimize=True, quality=quality, exif=exif_bytes)
            else:
                img_resized.save(output_path)

            optimized_size = os.path.getsize(output_path)
            optimized_image_url = url_for('get_image', filename=filename, _external=True)

            response_data.append({
                "filename": filename,
                "original_size": original_size,
                "optimized_size": optimized_size,
                "original_width": original_width,
                "original_height": original_height,
                "new_width": width,
                "new_height": height,
                "optimized_image_url": optimized_image_url,
                "resized_image_data": image_to_base64(img_resized) if not optimize else "",
            })

            # Delete original file after processing
            os.remove(input_path)

        return jsonify(response_data), 200

    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500


# Route to Serve Processed Images
@app.route('/output/<filename>')
def get_image(filename):
    return send_from_directory(output_dir, filename)


# Run Flask App
if __name__ == '__main__':
    print("Starting Flask Server...")
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    app.run(host='localhost', port=5000, debug=True)
