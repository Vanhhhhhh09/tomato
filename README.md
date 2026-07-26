# AgriScan - Phát hiện và khoanh vùng bệnh lá cà chua bằng YOLO

Ứng dụng web cho phép tải ảnh lá cà chua lên, hệ thống dùng mô hình YOLOv8 để phát hiện và khoanh vùng (bounding box) các loại bệnh phổ biến trên lá.

## Kiến trúc

Dự án gồm 3 phần độc lập, giao tiếp với nhau qua HTTP:

```
tomato-disease-detection/
├── frontend/       # Views (Pug) + CSS/JS tĩnh, được backend render/serve
├── backend/        # Fastify (Node.js) - nhận upload, gọi ai-service, lưu MongoDB
├── ai-service/     # Flask (Python) - chạy model YOLOv8, trả kết quả detect
└── docs/           # Tài liệu khóa luận
```

Luồng xử lý 1 lượt phát hiện bệnh:

```
Trình duyệt --(upload ảnh)--> Fastify --(gọi API)--> Flask (YOLOv8)
                                  |                        |
                                  |<---- JSON + ảnh đã khoanh vùng
                                  |
                             Lưu MongoDB, render kết quả
```

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js, Fastify, Pug (SSR) |
| AI Service | Python, Flask, Ultralytics YOLOv8 |
| Database | MongoDB |
| Model training | Google Colab (GPU miễn phí) |
| Dataset | Roboflow (gán nhãn, quản lý version) |

## Yêu cầu môi trường

- Node.js >= 20
- Python 3.9+ (đã test với 3.13)
- MongoDB (local hoặc MongoDB Atlas)

## Cài đặt và chạy

### 1. Backend (Fastify)

```bash
cd backend
npm install
cp .env.example .env    # chỉnh MONGO_URI, AI_SERVICE_URL nếu cần
npm run dev
```

Mặc định chạy tại `http://localhost:3000`.

### 2. AI Service (Flask)

```bash
cd ai-service
python -m venv venv

# Windows (PowerShell)
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Mặc định chạy tại `http://localhost:5000`.

**Lưu ý quan trọng:** file weight model (`ai-service/model/best.pt`) **không được đưa vào git** (file nặng). Cần tải riêng từ Google Colab sau khi train (xem `docs/train_tomato_yolov8.ipynb`) và đặt vào đúng đường dẫn `ai-service/model/best.pt` trước khi chạy. Nếu chưa có file này, `app.py` sẽ báo lỗi không tìm thấy model.

Cả 2 service (`backend` và `ai-service`) cần chạy song song (2 terminal riêng) để hệ thống hoạt động đầy đủ.

### 3. MongoDB

Cài MongoDB Community Server chạy local, hoặc dùng MongoDB Atlas (cloud, miễn phí) — chỉnh `MONGO_URI` trong `backend/.env` tương ứng.

## Cấu trúc lớp bệnh model nhận diện

Model được huấn luyện để nhận diện 8 loại:

- `bacterial_spot` - Đốm vi khuẩn
- `early_blight` - Đốm bạc lá
- `late_blight` - Đốm sương
- `mold_leaf` - Mốc lá
- `mosaic_virus` - Khảm lá
- `septoria_leaf_spot` - Đốm lá
- `spider_mites_leaf` - Nhện đỏ
- `yellow_leaf_curl_virus` - Xoăn vàng lá

## Huấn luyện lại model

Xem notebook `docs/train_tomato_yolov8.ipynb` — chạy trên Google Colab (cần bật GPU: Runtime > Change runtime type > T4 GPU). Notebook bao gồm: tải dataset từ Roboflow, xử lý gộp lớp, train YOLOv8, đánh giá (mAP/Precision/Recall), và tải file weight về máy.

## Kết quả model hiện tại

Model `yolov8s`, train 100 epoch trên dataset ~630+ ảnh (Roboflow, đã bổ sung dữ liệu cho lớp `spider_mites_leaf`):

| Chỉ số | Giá trị |
|---|---|
| mAP50 | 0.477 |
| mAP50-95 | 0.256 |
| Precision | 0.455 |
| Recall | 0.493 |
