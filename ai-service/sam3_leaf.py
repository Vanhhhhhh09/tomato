
import cv2
import numpy as np
import torch

from PIL import Image
from transformers import Sam3Model, Sam3Processor


# ==========================================
# 1. CONFIGURATION
# ==========================================

MODEL_ID = "facebook/sam3"

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

TEXT_PROMPT = "tomato leaf"

SAM3_SCORE_THRESHOLD = 0.15
SAM3_MASK_THRESHOLD = 0.50
MIN_MASK_AREA_RATIO = 0.001
MASK_IOU_THRESHOLD = 0.90

print("Loading SAM3 on:", DEVICE)
print("========== DEVICE INFO ==========")
print("CUDA available:", torch.cuda.is_available())
print("Device:", DEVICE)

if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))

print("=================================")

processor = Sam3Processor.from_pretrained(MODEL_ID)

sam3_model = Sam3Model.from_pretrained(
    MODEL_ID
).to(DEVICE)

sam3_model.eval()

print("SAM3 loaded successfully!")


# ==========================================
# 2. MASK IOU
# ==========================================

def calculate_mask_iou(mask1, mask2):
    intersection = np.logical_and(mask1, mask2).sum()
    union = np.logical_or(mask1, mask2).sum()

    if union == 0:
        return 0.0

    return float(intersection / union)


# ==========================================
# 3. REMOVE DUPLICATE MASKS
# ==========================================

def filter_duplicate_masks(masks, scores):
    if len(masks) == 0:
        return []

    order = np.argsort(scores)[::-1]
    kept_masks = []

    for index in order:
        candidate = masks[index]

        duplicate = any(
            calculate_mask_iou(candidate, existing)
            >= MASK_IOU_THRESHOLD
            for existing in kept_masks
        )

        if not duplicate:
            kept_masks.append(candidate)

    return kept_masks


# ==========================================
# 4. SAM3 LEAF SEGMENTATION
# ==========================================

def segment_leaves(image_bgr):
    if image_bgr is None or image_bgr.size == 0:
        return []

    height, width = image_bgr.shape[:2]

    image_rgb = cv2.cvtColor(
        image_bgr,
        cv2.COLOR_BGR2RGB
    )

    pil_image = Image.fromarray(image_rgb)

    inputs = processor(
        images=pil_image,
        text=TEXT_PROMPT,
        return_tensors="pt"
    ).to(DEVICE)

    with torch.inference_mode():
        outputs = sam3_model(**inputs)
    print("\n========== SAM3 OUTPUT DEBUG ==========")
    print("Output keys:", outputs.keys())

    if outputs.pred_logits is not None:
        probs = outputs.pred_logits.sigmoid()

        print("Logits shape:", outputs.pred_logits.shape)
        print("Max confidence:", probs.max().item())
        print("Min confidence:", probs.min().item())

    if outputs.pred_masks is not None:
        print("Pred masks shape:", outputs.pred_masks.shape)

    print("======================================")

    results = processor.post_process_instance_segmentation(
        outputs,
        threshold=SAM3_SCORE_THRESHOLD,
        mask_threshold=SAM3_MASK_THRESHOLD,
        target_sizes=inputs["original_sizes"].tolist()
    )

    result = results[0]
    masks = result.get("masks")

    if masks is None:
        return []

    if torch.is_tensor(masks):
        masks = masks.detach().cpu().numpy()

    masks = np.asarray(masks)

    if masks.ndim == 2:
        masks = masks[np.newaxis, ...]

    masks = np.squeeze(masks)

    if masks.ndim == 2:
        masks = masks[np.newaxis, ...]

    if masks.ndim != 3:
        return []

    scores = result.get("scores")

    if scores is not None:
        if torch.is_tensor(scores):
            scores = scores.detach().cpu().numpy()

        scores = np.asarray(scores).reshape(-1)
    else:
        scores = np.ones(len(masks), dtype=np.float32)

    valid_masks = []
    valid_scores = []

    min_area = max(
        100,
        int(height * width * MIN_MASK_AREA_RATIO)
    )

    for index, raw_mask in enumerate(masks):
        mask = raw_mask > 0

        if mask.shape != (height, width):
            continue

        area = int(mask.sum())

        if area < min_area:
            continue

        if area > height * width * 0.98:
            continue

        valid_masks.append(mask)
        valid_scores.append(float(scores[index]))

    print("\n========== SAM3 DEBUG ==========")
    print("Raw masks:", len(masks))
    print("Masks shape:", masks.shape)
    print("Image size:", width, "x", height)
    print("Score threshold:", SAM3_SCORE_THRESHOLD)
    print("Mask threshold:", SAM3_MASK_THRESHOLD)

    print("Valid masks before dedup:", len(valid_masks))

    if len(valid_masks) == 0:
        print("SAM3: NO VALID LEAF MASK FOUND")
        return []

    leaf_masks = filter_duplicate_masks(valid_masks, valid_scores)

    print("Valid leaves after dedup:", len(leaf_masks))
    print("================================")

    return leaf_masks


# ==========================================
# 5. DETERMINE WHETHER A LEAF HAS DISEASE
# ==========================================

def classify_leaves(leaf_masks, detections):
    """
    Gán trạng thái bệnh cho từng lá dựa trên
    bounding box YOLO giao với mask SAM3.

    Lưu ý: Đây là phép ghép vùng gần đúng,
    không phải phân đoạn chính xác vùng mô bệnh.
    """

    results = []

    for leaf_index, mask in enumerate(leaf_masks):
        has_disease = False

        ys, xs = np.where(mask)

        if len(xs) == 0:
            continue

        leaf_box = (
            int(xs.min()),
            int(ys.min()),
            int(xs.max()) + 1,
            int(ys.max()) + 1
        )

        leaf_area = int(mask.sum())

        for detection in detections:
            x1, y1, x2, y2 = map(
                int,
                detection["box"]
            )

            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(mask.shape[1], x2)
            y2 = min(mask.shape[0], y2)

            if x2 <= x1 or y2 <= y1:
                continue

            detection_mask = np.zeros(
                mask.shape,
                dtype=np.uint8
            )

            detection_mask[y1:y2, x1:x2] = 1

            intersection = np.logical_and(
                mask,
                detection_mask
            ).sum()

            # Chỉ xem là có bệnh khi box YOLO
            # giao với ít nhất 5% diện tích lá.
            if intersection / max(leaf_area, 1) >= 0.05:
                has_disease = True
                break

        results.append({
            "leaf_id": len(results) + 1,
            "mask": mask,
            "box": leaf_box,
            "has_disease": has_disease,
            "status": (
                "diseased"
                if has_disease
                else "not_detected"
            )
        })

    return results


# ==========================================
# 6. COLOR EACH LEAF
# ==========================================

def color_leaves(image, leaves, alpha=0.40):
    if image is None or image.size == 0:
        return image

    annotated = image.copy()

    # BGR: đỏ = có bệnh, xanh = chưa phát hiện bệnh
    DISEASE_COLOR = (0, 0, 255)
    NO_DISEASE_COLOR = (0, 200, 0)

    overlay = image.copy()

    for leaf in leaves:
        mask = leaf["mask"]

        color = (
            DISEASE_COLOR
            if leaf["has_disease"]
            else NO_DISEASE_COLOR
        )

        overlay[mask] = color

    annotated = cv2.addWeighted(
        image,
        1 - alpha,
        overlay,
        alpha,
        0
    )

    for leaf in leaves:
        mask_uint8 = (
            leaf["mask"].astype(np.uint8) * 255
        )

        color = (
            DISEASE_COLOR
            if leaf["has_disease"]
            else NO_DISEASE_COLOR
        )

        contours, _ = cv2.findContours(
            mask_uint8,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        cv2.drawContours(
            annotated,
            contours,
            -1,
            color,
            2
        )

        x1, y1, x2, y2 = leaf["box"]

        label = (
            f"Leaf {leaf['leaf_id']}: "
            + (
                "Disease"
                if leaf["has_disease"]
                else "No disease detected"
            )
        )

        label_y = max(20, y1 - 8)

        cv2.putText(
            annotated,
            label,
            (x1, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2,
            cv2.LINE_AA
        )

    return annotated
