from flask import Flask, request, send_from_directory, jsonify, url_for
from flask_cors import CORS
from PIL import Image, ImageOps
import piexif
import os, base64, io, sys

app = Flask(__name__)
CORS(app,
     resources={r"/*": {"origins": ["http://localhost:3000"]}},
     supports_credentials=True,
     methods=["GET","POST","OPTIONS"],
     allow_headers=["Content-Type","Authorization"])

input_dir, output_dir = "./input", "./output"
os.makedirs(input_dir, exist_ok=True)
os.makedirs(output_dir, exist_ok=True)

@app.get("/health")
def health():
    return jsonify(ok=True)

def image_to_base64(image, fmt="JPEG"):
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return "data:image/{};base64,{}".format(fmt.lower(), base64.b64encode(buf.getvalue()).decode("ascii"))

def _safe_int(v, default=None):
    try:
        return int(v) if v not in (None, "", "null", "undefined") else default
    except Exception:
        return default

@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        # accept multiple possible field names
        uploaded_files = []
        if "file[]" in request.files:
            uploaded_files = request.files.getlist("file[]")
        elif "files[]" in request.files:
            uploaded_files = request.files.getlist("files[]")
        elif "file" in request.files:
            uploaded_files = [request.files["file"]]
        elif "image" in request.files:
            uploaded_files = [request.files["image"]]

        width  = _safe_int(request.form.get('width'))
        height = _safe_int(request.form.get('height'))
        optimize = str(request.form.get('optimize')).lower() == 'true'
        quality  = _safe_int(request.form.get('quality'), 82) if optimize else None

        if not uploaded_files:
            return jsonify({"error": "No files uploaded (expected 'file[]', 'files[]', 'file' or 'image')"}), 400

        resp = []

        for uf in uploaded_files:
            filename = uf.filename or "image"
            if not filename.lower().endswith(('.jpg','.jpeg','.png','.gif','.tiff','.tif','.webp')):
                return jsonify({"error": f"Invalid file format for {filename}"}), 400

            input_path = os.path.join(input_dir, filename)
            uf.save(input_path)

            img = Image.open(input_path)
            orig_w, orig_h = img.size
            original_size = os.path.getsize(input_path)

            # resize if one or both provided (fallback to original)
            target_w = width  or orig_w
            target_h = height or orig_h
            if width or height:
                img = img.resize((target_w, target_h), resample=Image.LANCZOS)

            # convert to appropriate mode for saving
            if img.mode in ("P","LA","RGBA"):
                img = img.convert("RGBA") if filename.lower().endswith(".png") else img.convert("RGB")

            out_path = os.path.join(output_dir, filename)

            # decide format by extension
            ext = os.path.splitext(filename)[1].lower()
            fmt = "JPEG" if ext in (".jpg",".jpeg") else "PNG" if ext==".png" else None

            if optimize:
                # Preserve EXIF for JPEGs only
                exif_bytes = b""
                if fmt == "JPEG":
                    try:
                        exif_dict = piexif.load(Image.open(input_path).info.get("exif", b""))
                        exif_bytes = piexif.dump(exif_dict)
                    except Exception:
                        exif_bytes = b""

                if fmt == "JPEG":
                    # JPEG: encode efficiently without altering appearance
                    work = img.convert("RGB")
                    work.save(
                        out_path,
                        format="JPEG",
                        quality=quality or 82,     # slider
                        optimize=True,
                        progressive=True,          # smaller/better decode
                        subsampling=2,             # 4:2:0; good balance
                        exif=exif_bytes
                    )

                elif fmt == "PNG":
                    # PNG: lossless; ignore 'quality' and just compress more
                    work = img  # keep exact pixels, including alpha
                    work.save(
                        out_path,
                        format="PNG",
                        optimize=True,
                        compress_level=9           # max zlib compression
                    )

                else:
                    # Other formats: try to save without changing pixels
                    img.save(out_path, optimize=True)


            else:
                if fmt:
                    img.save(out_path, format=fmt)
                else:
                    img.save(out_path)

            optimized_size = os.path.getsize(out_path)
            optimized_image_url = url_for('get_image', filename=filename, _external=True)

            # base64 preview as JPEG (small convenience)
            preview_fmt = "JPEG"
            preview_img = img.convert("RGB")
            preview_b64 = image_to_base64(preview_img, preview_fmt)

            resp.append({
                "filename": filename,
                "original_size": original_size,
                "optimized_size": optimized_size,
                "original_width": orig_w,
                "original_height": orig_h,
                "new_width": target_w,
                "new_height": target_h,
                "optimized_image_url": optimized_image_url,
                "resized_image_data": "" if optimize else preview_b64
            })

            os.remove(input_path)

        return jsonify(resp), 200

    except Exception as e:
        print(f"[upload] error: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

@app.route('/output/<path:filename>')
def get_image(filename):
    return send_from_directory(output_dir, filename)

# ---- run server ----
if __name__ == "__main__":
    # sensible limits + clearer logs
    app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25MB upload cap
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False

    print("Starting Flask on http://127.0.0.1:5050")
    # debug=False avoids the reloader spawning a child that looks like a no-op
    app.run(host="127.0.0.1", port=5050, debug=False, threaded=True)

