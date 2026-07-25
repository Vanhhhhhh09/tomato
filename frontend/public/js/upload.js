document.addEventListener('DOMContentLoaded', function () {
  var dropzone = document.getElementById('dropzone');
  var input = document.getElementById('image-input');
  var previewWrap = document.getElementById('preview-wrap');
  var previewImg = document.getElementById('preview-img');

  if (!dropzone || !input) return;

  function showPreview(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewWrap.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change', function () {
    showPreview(input.files[0]);
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
    });
  });

  dropzone.addEventListener('drop', function (e) {
    var file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      showPreview(file);
    }
  });
});