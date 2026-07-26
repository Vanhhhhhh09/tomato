export const diseaseInfo = {
  bacterial_spot: {
    name: 'Đốm vi khuẩn',
    description: 'Do vi khuẩn Xanthomonas gây ra, xuất hiện các đốm nhỏ sũng nước trên lá.',
  },
  early_blight: {
    name: 'Đốm bạc lá',
    description: 'Xuất hiện các vòng tròn đồng tâm màu nâu trên lá già trước.',
  },
  late_blight: {
    name: 'Đốm sương',
    description: 'Bệnh lây lan nhanh trong điều kiện ẩm ướt, gây thối lá và thân.',
  },
  mold_leaf: {
    name: 'Mốc lá',
    description: 'Nấm mốc phát triển ở mặt dưới lá, thường gặp trong nhà kính ẩm.',
  },
  mosaic_virus: {
    name: 'Khảm lá',
    description: 'Virus gây loang lổ màu xanh đậm/nhạt trên lá, lá biến dạng.',
  },
  septoria_leaf_spot: {
    name: 'Đốm lá',
    description: 'Đốm tròn nhỏ màu nâu có viền vàng, thường ở lá dưới gốc.',
  },
  spider_mites_leaf: {
    name: 'Nhện đỏ',
    description: 'Côn trùng nhỏ gây vàng lá, xuất hiện mạng tơ mỏng ở mặt dưới lá.',
  },
  yellow_leaf_curl_virus: {
    name: 'Xoăn vàng lá',
    description: 'Virus do bọ phấn trắng truyền, gây xoăn và vàng lá non.',
  },
};

export function getDiseaseName(classKey) {
  return diseaseInfo[classKey]?.name || classKey;
}