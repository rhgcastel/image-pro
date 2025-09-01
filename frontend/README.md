The one-liner

ImagePro is a tiny web app that lets you shrink or resize images in bulk—right in your browser—then download the results.

What it does

Optimize (compress) images to make files much smaller with minimal visible quality loss.

Resize images to exact width/height (optionally keep aspect ratio).

Batch process multiple files at once and download them individually or as a ZIP.

Works with JPEG, PNG, GIF, TIFF, WebP inputs.

How you use it

Choose one or more images.

(Optional) Set Width and/or Height if you want to resize.

Adjust the Quality slider (lower = smaller file, usually same look around 75–85 for photos).

Click Optimize (for best size) or Resize (for exact dimensions).

Preview results and download.

Tip: For PNG files, the quality slider doesn’t change anything unless converting to JPEG/WebP; PNG is lossless by default.

Why it’s useful

Speeds up websites and emails by reducing image weight.

Saves storage and bandwidth.

Quick, no Photoshop required.

What’s happening under the hood (short & sweet)

Frontend: React app (MUI UI) handles the form, slider, and previews.

Backend: A small Flask API (/upload) receives the files, optionally resizes, and optimizes:

JPEGs: auto-rotate, strip heavy metadata, progressive encoding, smart compression; can switch to WebP when smaller.

PNGs: palette quantization/optimization (keeps transparency).

Processed files are served back as URLs; for simple resize we also return a quick preview.

Limits & privacy

Default upload cap: 25 MB per request (configurable).

Files are processed on your server and not kept long-term. Avoid sensitive images if you don’t control the backend.

Where it runs (your setup)

Frontend: Vercel.

Backend: Render (uses /tmp storage so you don’t need a paid disk).

The frontend points to the backend via an API URL env var; CORS is configured so they can talk.

A 30-second pitch

“If you’ve ever tried to email a bunch of giant photos or needed website images to load faster, ImagePro is a dead-simple tool: drop images in, pick a size or just pull the quality slider, hit Optimize, and download much smaller files that look the same. It works on multiple images at once and keeps the workflow painless.”

If you want, I can tailor this into a short readme or landing-page copy.

You said:
a readme
ChatGPT said:
Thought for 31s
ImagePro — Bulk Image Optimizer & Resizer

A tiny web app to shrink and/or resize images in bulk, then download them individually or as a ZIP.

Optimize (compress) JPEG/PNG/GIF/TIFF/WebP

Resize to exact width/height (optionally keep aspect ratio)

Batch upload & process

Preview results and download ZIP

Frontend: React (MUI) • Backend: Flask (Pillow)
Deploy target (example): Frontend on Vercel, Backend on Render

✨ Features

JPEG: auto-rotate using EXIF, progressive, optimized, strips heavy metadata by default (configurable), optional auto-WebP if smaller

PNG: palette quantization fallback (keeps transparency); uses pngquant/oxipng if present

WebP: encodes with good defaults; optional “pick WebP if smaller”

Multiple uploads: process many files at once

ZIP download for processed images

🧭 How it works

Drop/choose images

(Optional) set Width and/or Height (keep aspect ratio if you like)

Set Quality (lower = smaller file; 75–85 is a good photo range)

Click Optimize (best size) or Resize (exact dimensions)

Preview, download single files or Download All (ZIP)

Tip: For PNG, the quality slider doesn’t change size unless converting; PNG is lossless by default.

🗂️ Repo structure
image-pro/
├─ backend/
│  ├─ app.py                # Flask API (POST /upload, GET /output/<file>)
│  └─ requirements.txt
└─ frontend/
   ├─ src/…                 # React app (MUI)
   └─ package.json

🚀 Quick start (local)
Backend (Flask)
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Optional env (otherwise defaults are fine)
export DATA_DIR=./data
export ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

python app.py
# → Flask on http://127.0.0.1:5050

Frontend (React)
cd frontend
npm i

# Vite:
echo "VITE_API_URL=http://127.0.0.1:5050" > .env.local
# CRA:
# echo "REACT_APP_API_URL=http://127.0.0.1:5050" > .env.local

npm run dev   # or npm start


Open the frontend URL shown in your terminal.

⚙️ Backend configuration

Environment variables:

Variable	Default	Notes
ALLOWED_ORIGINS	http://localhost:3000,http://localhost:5173	Comma-separated list; must include your frontend domain(s)
DATA_DIR	/tmp	Where files are written. On Render free tier, /tmp is easiest (ephemeral). If you add a paid Disk, set /data.
INPUT_DIR	$DATA_DIR/input	Override if needed
OUTPUT_DIR	$DATA_DIR/output	Override if needed
MAX_UPLOAD_MB	25	Max request size in MB
PORT	5050	Dev only; Render sets its own $PORT
🧩 API
POST /upload

Form fields (multipart):

file[] | files[] | file | image — image(s) to process

width (int, optional) — target width

height (int, optional) — target height

optimize (bool string) — "true" for compression/optimization

quality (int 1–100, optional) — only used when optimize=true

keep_metadata (bool string, default "false") — keep EXIF (JPEG)

autowebp (bool string) — if true, also encode WebP and keep it only if it’s at least 10% smaller

convert_to (string, optional) — force format: "webp" or "jpeg"

Response (array of objects):

[
  {
    "filename": "myphoto.webp",
    "original_size": 3123456,
    "optimized_size": 1023456,
    "original_width": 4032,
    "original_height": 3024,
    "new_width": 2048,
    "new_height": 1536,
    "optimized_image_url": "https://api.example.com/output/myphoto.webp",
    "resized_image_data": "data:image/jpeg;base64,..." // only when optimize=false
  }
]


CORS: Server returns Access-Control-Allow-Origin for any origin listed in ALLOWED_ORIGINS.

Examples

# preflight (CORS)
curl -i -X OPTIONS https://YOUR-BACKEND/upload \
  -H "Origin: https://YOUR-FRONTEND"

# upload & optimize
curl -i -X POST https://YOUR-BACKEND/upload \
  -H "Origin: https://YOUR-FRONTEND" \
  -F "file=@/path/to/photo.jpg" \
  -F "optimize=true" \
  -F "quality=80" \
  -F "keep_metadata=false" \
  -F "autowebp=true"

☁️ Deploy
Frontend — Vercel

Vite: set VITE_API_URL=https://<your-render-app>.onrender.com

CRA: set REACT_APP_API_URL=…

Deploy as usual.

Backend — Render (free tier)

Option A: Root Directory = backend (recommended)

Root Directory: backend

Build Command: pip install -r requirements.txt

Start Command:
gunicorn app:app --workers 2 --threads 4 --bind 0.0.0.0:$PORT

Environment → add:

DATA_DIR=/tmp
ALLOWED_ORIGINS=https://YOUR-VERCEL-APP.vercel.app,http://localhost:3000,http://localhost:5173


Option B: no Root Directory

Build Command: pip install -r backend/requirements.txt

Start Command: gunicorn backend.app:app --workers 2 --threads 4 --bind 0.0.0.0:$PORT

If you add a Disk on Render (paid), set DATA_DIR=/data and mount the disk at /data.

🛠️ Troubleshooting

CORS error in the browser
Make sure your frontend origin is included in ALLOWED_ORIGINS. Redeploy backend.

404 with x-render-routing: no-server
Backend isn’t running (deploy failed or crashed). Fix Start/Build/Root settings and redeploy.

413 Request Entity Too Large
Bump MAX_UPLOAD_MB on the backend and redeploy.

Files “disappear” after a while on Render
Using DATA_DIR=/tmp means ephemeral storage. It resets on restart. This is fine for on-demand processing; don’t rely on long-term URLs.

📐 Quality & format tips

JPEG photos: quality=75–85 usually preserves visual quality with big savings.

Metadata: set keep_metadata=false unless you truly need EXIF; metadata can be very large.

WebP: use autowebp=true to keep WebP only when it’s smaller than JPEG.

PNG: for photos, consider converting to JPEG or WebP; PNG shines for graphics/transparency.

📄 License

Add your preferred license (e.g., MIT) in LICENSE.

🙌 Credits

Flask

Pillow

(Optional) pngquant, oxipng, mozjpeg if you use a Docker image with these installed.

🧵 One-liner for non-devs

“ImagePro helps you make images smaller or resize them in bulk. Drop files in, pick size/quality, click Optimize, and download much smaller images that look the same.”