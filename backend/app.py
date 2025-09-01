# app.py
from flask import Flask, request, send_from_directory, jsonify, url_for
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.utils import secure_filename

from PIL import Image, ImageOps
import piexif

import os, io, sys, base64, shutil, subprocess

# ------------------------------------------------------------------------------
# Config (env-driven; works on Render free tier)
# ------------------------------------------------------------------------------
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

# Use /tmp by default so you don't need a paid disk. You may override with DATA_DIR.
DATA_DIR   = os.getenv("DATA_DIR", "/tmp")
INPUT_DIR  = os.getenv("INPUT_DIR",  os.path.join(DATA_DIR, "input"))
OUTPUT_DIR = os.getenv("OUTPUT_DIR", os.path.join(DATA_DIR, "output"))
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
PORT = int(os.getenv("PORT", "5050"))

# ------------------------------------------------------------------------------
# Flask setup
# ------------------------------------------------------------------------------
app = Flask(__name__)
# Ensure correct scheme/host in url_for behind Render’s proxy
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024  # e.g., 25MB

# ------------------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------------------
def image_to_base64(image, fmt="JPEG"):
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return f"data:image/{fmt.lower()};base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

def _safe_int(v, default=None):
    try:
        return int(v) if v not in (None, "", "null", "undefined") else default
    except Exception:
        return default

def run(cmd):
    """Run a CLI tool; return True if it succeeded."""
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except FileNotFoundError:
        print(f"[compress] tool not found: {cmd[0]}", file=sys.stderr)
        return False
    except subprocess.CalledProcessError as e:
        print(f"[compress] error: {e}", file=sys.stderr)
        return False

def have_tool(name: str) -> bool:
    return shutil.which(name) is not None

# --- PNG helpers --------------------------------------------------------------
def compress_png_quantize(in_path, out_path, qmin=60, qmax=90, speed=1):
    """
    Quantize + dither PNG (lossy-ish, preserves alpha). Uses pngquant + oxipng if available.
    """
    tmp = out_path + ".tmp.png"
    cmd = [
        "pngquant",
        f"--quality={qmin}-{qmax}",
        f"--speed={speed}",
        "--strip",
        "--force",
        "--output", tmp,
        "--", in_path
    ]
    ok = run(cmd)
    if not ok:
        return False
    # extra squeeze (lossless)
    if have_tool("oxipng"):
        run(["oxipng", "-o", "4", "--strip", "all", "--quiet", tmp])
    shutil.move(tmp, out_path)
    return True

def compress_png_lossless(in_path, out_path):
    shutil.copy2(in_path, out_path)
    if have_tool("oxipng"):
        return run(["oxipng", "-o", "6", "--strip", "all", "--quiet", out_path])
    return True

# --- JPEG helpers -------------------------------------------------------------
def encode_jpeg_pillow(in_path, out_path, quality=82, keep_exif=False):
    """
    Re-encode JPEG with strong defaults:
      - Auto-rotate from EXIF, then drop EXIF unless keep_exif=True
      - Progressive, optimize, 4:2:0 subsampling
    """
    with Image.open(in_path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")

        save_kwargs = dict(
            format="JPEG",
            quality=int(quality),
            optimize=True,
            progressive=True,
            subsampling="4:2:0",  # ~ Pillow's subsampling=2
        )

        if keep_exif:
            exif = im.info.get("exif")
            if exif:
                save_kwargs["exif"] = exif  # keep original EXIF
        # (Intentionally not keeping ICC profiles; they can be large.)

        im.save(out_path, **save_kwargs)

def encode_jpeg_mozjpeg(in_path, out_path, quality=82):
    """
    Use mozjpeg (cjpeg) if available for slightly smaller files at same quality.
    Normalize through a temporary JPEG first.
    """
    with Image.open(in_path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        tmp = out_path + ".pre.jpg"
        im.save(tmp, format="JPEG", quality=95, optimize=True)
    ok = run(["cjpeg", "-quality", str(quality), "-progressive", "-optimize",
              "-outfile", out_path, tmp])
    try:
        os.remove(tmp)
    except:
        pass
    return ok

# --- WebP helper --------------------------------------------------------------
def encode_webp(in_path, out_path, quality=80, lossless=False):
    if have_tool("cwebp"):
        cmd = ["cwebp"]
        if lossless:
            cmd += ["-lossless", "-z", "9"]
        else:
            cmd += ["-q", str(quality), "-m", "6"]
        cmd += [in_path, "-o", out_path]
        return run(cmd)
    # Pillow fallback
    with Image.open(in_path) as im:
        if lossless:
            im.save(out_path, format="WEBP", lossless=True, method=6)
        else:
            im.save(out_path, format="WEBP", quality=quality, method=6)
    return True

def try_webp_and_pick_smaller(in_path, current_out, quality=80):
    """
    Encode to WebP from the (possibly resized) input and keep it only if
    it's at least 10% smaller than the current output.
    Returns the chosen output path.
    """
    alt = os.path.splitext(current_out)[0] + ".webp"
    encode_webp(in_path, alt, quality=quality, lossless=False)
    try:
        if os.path.getsize(alt) < os.path.getsize(current_out) * 0.90:
            # prefer webp; remove larger file
            try: os.remove(current_out)
            except: pass
            return alt
        else:
            try: os.remove(alt)
            except: pass
            return current_out
    except Exception:
        return current_out

# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------
@app.get("/health")
@app.get("/healthz")
def health():
    return jsonify(ok=True)

@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload():
    if request.method == 'OPTIONS':
        # CORS preflight handled here
        return '', 200

    try:
        # Accept multiple possible field names
        files = []
        if "file[]" in request.files:
            files = request.files.getlist("file[]")
        elif "files[]" in request.files:
            files = request.files.getlist("files[]")
        elif "file" in request.files:
            files = [request.files["file"]]
        elif "image" in request.files:
            files = [request.files["image"]]

        width        = _safe_int(request.form.get('width'))
        height       = _safe_int(request.form.get('height'))
        optimize     = str(request.form.get('optimize')).lower() == 'true'
        quality      = _safe_int(request.form.get('quality'), 82) if optimize else None
        convert_to   = (request.form.get("convert_to") or "").lower()  # '', 'webp', 'jpeg'
        keep_meta    = str(request.form.get("keep_metadata", "0")).lower() in ("1", "true", "yes")
        autowebp     = str(request.form.get("autowebp", "0")).lower() in ("1", "true", "yes")

        if not files:
            return jsonify({"error": "No files uploaded (expected 'file[]', 'files[]', 'file' or 'image')"}), 400

        resp = []

        for uf in files:
            raw_name = uf.filename or "image"
            safe_name = secure_filename(raw_name)
            ext = os.path.splitext(safe_name)[1].lower()
            if ext not in (".jpg", ".jpeg", ".png", ".gif", ".tiff", ".tif", ".webp"):
                return jsonify({"error": f"Invalid file format for {raw_name}"}), 400

            in_path  = os.path.join(INPUT_DIR, safe_name)
            out_path = os.path.join(OUTPUT_DIR, safe_name)
            uf.save(in_path)

            # Basic info
            with Image.open(in_path) as img:
                orig_w, orig_h = img.size
            original_size = os.path.getsize(in_path)

            # Optional resize (fallback to original when missing one dim)
            target_w = width or orig_w
            target_h = height or orig_h
            if width or height:
                with Image.open(in_path) as img:
                    # Preserve orientation during resize
                    img = ImageOps.exif_transpose(img)
                    img = img.resize((target_w, target_h), resample=Image.LANCZOS)
                    # keep alpha for PNG/WebP; force RGB for JPEG
                    if ext in (".jpg", ".jpeg"):
                        img = img.convert("RGB")
                    img.save(in_path)  # overwrite input for next stage

            # Determine family
            fmt = "JPEG" if ext in (".jpg", ".jpeg") else "PNG" if ext == ".png" else None

            if optimize:
                # --- PNG branch ------------------------------------------------
                if fmt == "PNG":
                    if convert_to == "webp":
                        out_path = os.path.splitext(out_path)[0] + ".webp"
                        encode_webp(in_path, out_path, quality=quality or 80, lossless=False)
                    else:
                        # Prefer binaries if present; otherwise Pillow quantization
                        qmin, qmax = 60, max(60, min(100, quality or 82))
                        if have_tool("pngquant"):
                            ok = compress_png_quantize(in_path, out_path, qmin, qmax, speed=1)
                            if not ok:
                                compress_png_lossless(in_path, out_path)
                        else:
                            with Image.open(in_path) as im:
                                im = im.convert("RGBA")
                                # Map 0–100 → ~32–256 colors (slightly aggressive)
                                colors = max(32, min(256, int((quality or 82) * 2.0)))
                                qimg = im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
                                qimg.save(out_path, format="PNG", optimize=True, compress_level=9)

                # --- JPEG branch -----------------------------------------------
                elif fmt == "JPEG":
                    if convert_to == "webp":
                        out_path = os.path.splitext(out_path)[0] + ".webp"
                        encode_webp(in_path, out_path, quality=quality or 80, lossless=False)
                    else:
                        # Try mozjpeg if available; otherwise Pillow
                        if have_tool("cjpeg"):
                            ok = encode_jpeg_mozjpeg(in_path, out_path, quality=quality or 82)
                            if not ok:
                                encode_jpeg_pillow(in_path, out_path, quality=quality or 82, keep_exif=keep_meta)
                        else:
                            encode_jpeg_pillow(in_path, out_path, quality=quality or 82, keep_exif=keep_meta)
                        # Optionally keep WebP only if smaller
                        if autowebp:
                            out_path = try_webp_and_pick_smaller(in_path, out_path, quality=quality or 80)

                # --- Other formats ---------------------------------------------
                else:
                    if convert_to == "webp":
                        out_path = os.path.splitext(out_path)[0] + ".webp"
                        encode_webp(in_path, out_path, quality=quality or 80, lossless=False)
                    else:
                        # Best effort re-save
                        with Image.open(in_path) as im:
                            im.save(out_path, optimize=True)

            else:
                # No optimize: just save resized/original copy
                with Image.open(in_path) as im:
                    im = ImageOps.exif_transpose(im)
                    if fmt == "JPEG":
                        im = im.convert("RGB")
                        im.save(out_path, format="JPEG", quality=95, optimize=True, progressive=True)
                    elif fmt == "PNG":
                        im.save(out_path, format="PNG", optimize=True, compress_level=9)
                    else:
                        im.save(out_path)

            optimized_size = os.path.getsize(out_path)
            optimized_url  = url_for('get_image', filename=os.path.basename(out_path), _external=True)

            # Base64 preview only when not optimizing (avoid big payloads)
            preview_b64 = ""
            if not optimize:
                with Image.open(out_path) as preview:
                    preview_b64 = image_to_base64(preview.convert("RGB"), "JPEG")

            resp.append({
                "filename": os.path.basename(out_path),
                "original_size": original_size,
                "optimized_size": optimized_size,
                "original_width": orig_w,
                "original_height": orig_h,
                "new_width": target_w,
                "new_height": target_h,
                "optimized_image_url": optimized_url,
                "resized_image_data": preview_b64
            })

            # cleanup input copy
            try:
                os.remove(in_path)
            except:
                pass

        return jsonify(resp), 200

    except Exception as e:
        print(f"[upload] error: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

@app.route('/output/<path:filename>')
def get_image(filename):
    # You may add Cache-Control here if you want CDN caching
    return send_from_directory(OUTPUT_DIR, filename)

# ------------------------------------------------------------------------------
# Run (use gunicorn in production; this is for local/dev)
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    print(f"Starting Flask on 0.0.0.0:{PORT} (DATA_DIR={DATA_DIR})")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
