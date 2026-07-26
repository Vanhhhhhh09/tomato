from flask import Flask, request, jsonify
from ultralytics import YOLO
import base64
import io
import time
from PIL import Image

app = Flask(__name__)

# Tạm dùng model pretrained (COCO) để test luồng kỹ thuật.
# Sau khi huấn luyện xong, đổi thành: YOLO("model/best.pt")
model = YOLO("model/best.pt")


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image provided"}), 400

    file = request.files["image"]
    img = Image.open(file.stream).convert("RGB")

    start = time.time()
    results = model.predict(img, conf=0.25)
    inference_time = int((time.time() - start) * 1000)

    r = results[0]
    detections = []
    for box in r.boxes:
        cls_id = int(box.cls[0])
        detections.append({
            "class": model.names[cls_id],
            "confidence": float(box.conf[0]),
            "box": [round(x, 2) for x in box.xyxy[0].tolist()],
        })

    annotated = r.plot()  # numpy array, BGR
    annotated_img = Image.fromarray(annotated[:, :, ::-1])  # BGR -> RGB
    buf = io.BytesIO()
    annotated_img.save(buf, format="JPEG")
    annotated_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return jsonify({
        "success": True,
        "inference_time_ms": inference_time,
        "detections": detections,
        "annotated_image_base64": annotated_base64,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)