
from flask import Flask, request, jsonify
from ultralytics import YOLO

from sam3_leaf import (
    segment_leaves,
    classify_leaves,
    color_leaves
)

import numpy as np
import cv2
import base64
import time
import torch

from PIL import Image, ImageOps


app = Flask(__name__)


# ==========================================
# 1. CONFIGURATION
# ==========================================

MODEL_PATH = "model/best.pt"

DEVICE = 0 if torch.cuda.is_available() else "cpu"

CONFIDENCE_THRESHOLD = 0.20

YOLO_IOU_THRESHOLD = 0.50

DUPLICATE_IOU_THRESHOLD = 0.50

IMAGE_SIZE = 640

print("Using device:", DEVICE)


# ==========================================
# 2. LOAD YOLO MODEL
# ==========================================

print("Loading YOLO model...")

model = YOLO(MODEL_PATH)

print("YOLO model loaded successfully!")
print("Model type:", model.task)
print("Model classes:", model.names)


# ==========================================
# 3. IMAGE SHARPNESS
# ==========================================

def get_image_sharpness(image):

    if image is None or image.size == 0:
        return 0.0

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    gray = cv2.resize(
        gray,
        (256, 256)
    )

    variance = cv2.Laplacian(
        gray,
        cv2.CV_64F
    ).var()

    return float(variance)


# ==========================================
# 4. FILTER DUPLICATE DISEASE DETECTIONS
# ==========================================

def filter_overlapping_detections(
    detections,
    iou_threshold=DUPLICATE_IOU_THRESHOLD
):

    if not detections:
        return []

    detections = sorted(
        detections,
        key=lambda x: x["confidence"],
        reverse=True
    )

    kept = []

    for candidate in detections:

        x1, y1, x2, y2 = candidate["box"]

        area1 = (
            max(0, x2 - x1) *
            max(0, y2 - y1)
        )

        if area1 <= 0:
            continue

        duplicate = False

        for existing in kept:

            # Chỉ lọc box cùng loại bệnh
            if candidate["class"] != existing["class"]:
                continue

            ex1, ey1, ex2, ey2 = existing["box"]

            area2 = (
                max(0, ex2 - ex1) *
                max(0, ey2 - ey1)
            )

            if area2 <= 0:
                continue

            ix1 = max(x1, ex1)
            iy1 = max(y1, ey1)

            ix2 = min(x2, ex2)
            iy2 = min(y2, ey2)

            intersection = (
                max(0, ix2 - ix1) *
                max(0, iy2 - iy1)
            )

            union = area1 + area2 - intersection

            iou = (
                intersection / union
                if union > 0 else 0
            )

            if iou >= iou_threshold:

                duplicate = True

                print(
                    "[DUPLICATE REMOVED]",
                    candidate["class"],
                    "Confidence:",
                    candidate["confidence"],
                    "IoU:",
                    round(iou, 3)
                )

                break

        if not duplicate:
            kept.append(candidate)

    return kept


# ==========================================
# 5. YOLO DISEASE DETECTION
# ==========================================

def detect_diseases(image):

    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,
        iou=YOLO_IOU_THRESHOLD,
        imgsz=IMAGE_SIZE,
        device=DEVICE,
        verbose=False
    )

    detections = []

    h, w = image.shape[:2]

    for result in results:

        if result.boxes is None:
            continue

        for box in result.boxes:

            class_id = int(box.cls[0])

            class_name = model.names[class_id]

            confidence = float(box.conf[0])

            x1, y1, x2, y2 = map(
                lambda x: int(round(x)),
                box.xyxy[0].tolist()
            )

            x1 = max(0, min(x1, w - 1))
            y1 = max(0, min(y1, h - 1))

            x2 = max(0, min(x2, w))
            y2 = max(0, min(y2, h))

            if x2 <= x1 or y2 <= y1:
                continue

            crop = image[y1:y2, x1:x2]

            sharpness = get_image_sharpness(crop)

            detections.append({

                "class": class_name,

                "confidence": round(
                    confidence,
                    4
                ),

                "box": [
                    x1,
                    y1,
                    x2,
                    y2
                ],

                "sharpness": round(
                    sharpness,
                    2
                )

            })

    return detections


# ==========================================
# 6. API PREDICT
# ==========================================

@app.route("/predict", methods=["POST"])
def predict():

    request_start = time.perf_counter()

   

    if "image" not in request.files:

        print("========== API RESPONSE ==========")
        print("Total leaves:", len(leaves))
        print("Diseased leaves:", diseased_leaves)
        print("Not detected leaves:", not_detected_leaves)
        print("Detections:", detections)
        print("Annotated image:", len(annotated_base64))

        return jsonify({
            "success": False,
            "error": "No image provided"
        }), 400

    try:

        file = request.files["image"]

        if not file.filename:

            return jsonify({
                "success": False,
                "error": "Empty filename"
            }), 400

        # ==================================
        # STEP 1: READ IMAGE
        # ==================================

        img = Image.open(file.stream)

        img = ImageOps.exif_transpose(img)

        img = img.convert("RGB")

        img.load()

        image_np = np.array(img)

        image = cv2.cvtColor(
            image_np,
            cv2.COLOR_RGB2BGR
        )

        h, w = image.shape[:2]

        if h < 32 or w < 32:

            return jsonify({
                "success": False,
                "error": "Image is too small"
            }), 400

        preprocess_time = (
            time.perf_counter() - request_start
        ) * 1000

        # ==================================
        # STEP 2: SAM3 LEAF SEGMENTATION
        # ==================================

        print("\n========== SAM3 LEAF SEGMENTATION ==========")

        sam3_start = time.perf_counter()

        leaf_masks = segment_leaves(image)

        sam3_time = (
            time.perf_counter() - sam3_start
        ) * 1000

        print(
            "Total leaf instances:",
            len(leaf_masks)
        )

        print(
            "SAM3 time:",
            round(sam3_time, 2),
            "ms"
        )

        # ==================================
        # STEP 3: YOLO DISEASE DETECTION
        # ==================================

        print("\n========== YOLO DISEASE DETECTION ==========")

        yolo_start = time.perf_counter()

        raw_detections = detect_diseases(image)

        print(
            "Raw predictions:",
            len(raw_detections)
        )

        # ==================================
        # STEP 4: FILTER DUPLICATE BOXES
        # ==================================

        print("\n========== DISEASE BOX FILTER ==========")

        print(
            "Before filtering:",
            len(raw_detections)
        )

        detections = filter_overlapping_detections(
            raw_detections,
            iou_threshold=DUPLICATE_IOU_THRESHOLD
        )

        print(
            "After filtering:",
            len(detections)
        )

        yolo_time = (
            time.perf_counter() - yolo_start
        ) * 1000

        # ==================================
        # STEP 5: CLASSIFY EACH LEAF
        # ==================================

        print("\n========== CLASSIFY LEAVES ==========")

        leaves = classify_leaves(
            leaf_masks,
            detections
        )

        diseased_leaves = sum(
            1 for leaf in leaves
            if leaf["has_disease"]
        )

        not_detected_leaves = (
            len(leaves) - diseased_leaves
        )

        print("Total leaves:", len(leaves))
        print("Leaves with disease:", diseased_leaves)
        print(
            "Leaves without detected disease:",
            not_detected_leaves
        )

        # ==================================
        # STEP 6: DRAW LEAF COLORS
        # ==================================

        print("\n========== COLOR LEAVES ==========")

        annotated = color_leaves(
            image.copy(),
            leaves,
            alpha=0.40
        )

        # ==================================
        # STEP 7: PRINT DISEASE INFORMATION
        # ==================================

        print("\n========== DISEASE RESULTS ==========")

        for detection in detections:

            print(
                f"Class: {detection['class']} | "
                f"Confidence: {detection['confidence']} | "
                f"Box: {detection['box']} | "
                f"Sharpness: {detection['sharpness']}"
            )

        # ==================================
        # STEP 8: ENCODE ANNOTATED IMAGE
        # ==================================

        success, buffer = cv2.imencode(
            ".jpg",
            annotated,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                95
            ]
        )

        if not success:

            raise Exception(
                "Cannot encode annotated image"
            )

        annotated_base64 = (
            "data:image/jpeg;base64,"
            + base64.b64encode(
                buffer.tobytes()
            ).decode("utf-8")
        )

        # ==================================
        # STEP 9: TOTAL PROCESSING TIME
        # ==================================

        total_time = (
            time.perf_counter() - request_start
        ) * 1000

        # ==================================
        # STEP 10: API RESPONSE
        # ==================================

        return jsonify({

            "success": True,

            "image_width": w,

            "image_height": h,

            "total_leaves": len(leaves),

            "diseased_leaves": diseased_leaves,

            "not_detected_leaves": not_detected_leaves,

            "total_detections": len(detections),

            "preprocess_time_ms": round(
                preprocess_time,
                2
            ),

            "sam3_time_ms": round(
                sam3_time,
                2
            ),

            "yolo_time_ms": round(
                yolo_time,
                2
            ),

            "total_time_ms": round(
                total_time,
                2
            ),

            "detections": detections,

            "annotated_image_base64": annotated_base64

        })

    except Exception as e:

        app.logger.exception(
            "Prediction failed"
        )

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ==========================================
# 7. RUN SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=False
    )
