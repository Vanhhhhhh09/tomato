from ultralytics import YOLO

model = YOLO("model/best.pt")

print("\n========== MODEL INFO ==========")

print("Model type:", model.task)
print("Model names:", model.names)

print("\n========== DETECTION CLASSES ==========")

for class_id, name in model.names.items():
    print(f"ID: {class_id} | Name: {name}")

print("\n========== MODEL SUCCESSFULLY LOADED ==========")