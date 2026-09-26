// Ảnh được thu nhỏ trước khi lưu cùng công thức để bản ZIP chạy không cần dịch vụ lưu ảnh.
const SetImage = (() => {
  function resize(file) {
    return new Promise((resolve, reject) => {
      if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) return reject(Error('Chọn ảnh JPG, PNG hoặc WebP.'));
      if (file.size > 10 * 1024 * 1024) return reject(Error('Ảnh gốc phải nhỏ hơn 10 MB.'));
      const image = new Image(), url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, 800 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.76);
        if (data.length > 600000) reject(Error('Ảnh quá lớn, hãy chọn ảnh khác.'));
        else resolve(data);
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(Error('Không mở được ảnh này.')); };
      image.src = url;
    });
  }
  return { resize };
})();
