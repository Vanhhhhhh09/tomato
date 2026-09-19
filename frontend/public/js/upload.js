document.addEventListener('DOMContentLoaded', function () {
  var dropzone = document.getElementById('dropzone');
  var input = document.getElementById('image-input');
  var previewWrap = document.getElementById('preview-wrap');
  var previewImg = document.getElementById('preview-img');
  var wizardStage = document.getElementById('wizard-stage');
  var stepPlant = document.getElementById('step-plant');
  var uploadGrid = document.getElementById('step-upload-grid');
  var plantTypeInput = document.getElementById('plant-type-input');
  var summaryIcon = document.getElementById('summary-icon');
  var summaryText = document.getElementById('summary-text');
  var heroTop = document.getElementById('hero-top');

  if (wizardStage && uploadGrid) {
    function showChoiceStep(step) {
      if (heroTop) heroTop.classList.add('is-hidden');
      wizardStage.classList.remove('is-hidden');
      uploadGrid.classList.add('is-hidden');
      step.classList.remove('is-hidden');
    }

    function goToUpload(plantType, icon, label) {
      plantTypeInput.value = plantType;
      summaryIcon.textContent = icon;
      summaryText.textContent = label;
      if (heroTop) heroTop.classList.remove('is-hidden');
      wizardStage.classList.add('is-hidden');
      uploadGrid.classList.remove('is-hidden');
    }

    stepPlant.querySelectorAll('.wizard-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var plant = card.getAttribute('data-plant');
        if (plant === 'tomato') {
          goToUpload('tomato', '🍅', 'Cà chua');
        } else if (plant === 'cucumber') {
          goToUpload('cucumber', '🥒', 'Dưa chuột');
        }
      });
    });

    document.querySelectorAll('[data-back-dynamic]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showChoiceStep(stepPlant);
      });
    });
  }

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

document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('.upload-form');
  var submitBtn = document.getElementById('submit-btn');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', function () {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="btn-submit-content">
        <svg class="tomato-spinner" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <path class="tomato-body" d="M20 36c9 0 15-7 15-15S29 8 20 8 5 13 5 21s6 15 15 15z" />
          <path fill="none" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round"
            d="M20 8c-1-3 -4-5-7-5 2 2 2 5 3 6M20 8c1-3 4-5 7-5-2 2-2 5-3 6M20 8c0-2-1-3-1.5-4" />
        </svg>
        Đang phân tích...
      </span>
    `;
  });
});