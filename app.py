from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import os

# Create FastAPI app
app = FastAPI(
    title="NERV Celestial Tracking System",
    description="A sci-fi inspired interface for Ramadan calendar and celestial data",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="."), name="static")

# Define routes
@app.get("/", response_class=HTMLResponse)
async def read_root():
    # Return the index.html file
    return FileResponse("index.html")

# Serve specific files directly
@app.get("/script.js")
async def get_script():
    return FileResponse("script.js")

@app.get("/style.css")
async def get_style():
    return FileResponse("style.css")

# Serve files from assets directory
@app.get("/assets/{file_path:path}")
async def get_asset(file_path: str):
    return FileResponse(f"assets/{file_path}")
