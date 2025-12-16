"""
FastAPI backend for detecting whether a cell phone is present in an uploaded
image. The service loads a pre‑trained YOLOv5 model via PyTorch Hub and
responds with a JSON object indicating if a phone was detected.  The model
returns bounding boxes and class indices for detected objects; class index 67
corresponds to the 'cell phone' class in the COCO dataset【367209703169497†L320-L327】.

To start the server, install the dependencies listed in requirements.txt and
run this script with uvicorn:

    uvicorn app:app --reload

The `--reload` flag enables hot reloading during development.
"""

import base64
import io
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch


class ImagePayload(BaseModel):
    """Schema for the incoming JSON payload containing a base64‑encoded image."""

    image: str


def load_model() -> torch.nn.Module:
    """
    Load a YOLOv5 model from PyTorch Hub.  When run for the first time, this
    function downloads the model weights from the Ultralytics GitHub
    repository.  The model is cached locally afterwards.  We default to the
    small model ('yolov5s') for faster inference and reduced resource
    requirements.  See the Ultralytics documentation for details【412847489301705†L140-L163】.

    Returns:
        A PyTorch model ready for inference.
    """

    try:
        model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True)
    except Exception as exc:
        raise RuntimeError(
            "Failed to load YOLOv5 model via torch.hub. Ensure PyTorch and internet access are available."
        ) from exc
    return model


def detect_phone_in_image(model: torch.nn.Module, image: Image.Image) -> bool:
    """
    Perform inference on an image using the provided YOLOv5 model and return
    whether a cell phone was detected.  YOLOv5 returns predictions as a
    tensor where the fifth column corresponds to the class index.  The COCO
    dataset assigns class index 67 to 'cell phone'【367209703169497†L320-L327】.  We treat any detection
    of this class as a positive phone detection.

    Args:
        model: Pre‑loaded YOLOv5 model.
        image: A PIL image to analyse.

    Returns:
        True if at least one cell phone is detected; otherwise False.
    """

    # Run inference.  The second argument sets the image size.  A larger
    # image size can improve accuracy at the cost of speed.
    results = model(image, size=640)
    # Extract tensor of detections (x1, y1, x2, y2, confidence, class)
    predictions = results.xyxy[0]  # type: ignore[attr-defined]
    phone_class_id = 67
    # Check if any detection corresponds to a phone
    for *_, conf, cls in predictions.tolist():
        if int(cls) == phone_class_id:
            return True
    return False


app = FastAPI(title="Phone Detection API")

# Allow requests from any origin so the frontend running in the browser can
# communicate with this API.  In a production environment you should set
# allow_origins to the specific domain where your frontend is hosted.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    """Load the YOLO model once when the application starts."""
    global model  # pylint: disable=global-statement
    model = load_model()


@app.post("/detect_phone", response_model=Dict[str, bool])
async def detect_phone(payload: ImagePayload) -> Dict[str, bool]:
    """
    Accept a base64‑encoded image via POST and determine whether a cell phone is
    present.  The frontend sends the image encoded as a data URI (for
    example, 'data:image/png;base64,iVBORw0...').  We strip the prefix and
    decode the base64 string into raw bytes, then load it into a PIL image.

    Args:
        payload: JSON body containing the base64‑encoded image.

    Returns:
        A dictionary with a single key 'phone_detected' set to True if a phone is
        detected, otherwise False.
    """

    data = payload.image
    if not data:
        raise HTTPException(status_code=400, detail="No image provided")
    # Remove data URI prefix if present
    if data.startswith("data:image"):
        # Split on the comma
        try:
            data = data.split(",", 1)[1]
        except IndexError:
            raise HTTPException(status_code=400, detail="Invalid data URI format")
    try:
        image_bytes = base64.b64decode(data)
    except base64.binascii.Error as err:
        raise HTTPException(status_code=400, detail="Invalid base64 data") from err
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as err:
        raise HTTPException(status_code=400, detail="Uploaded data is not a valid image") from err
    detected = detect_phone_in_image(model, image)
    return {"phone_detected": detected}
