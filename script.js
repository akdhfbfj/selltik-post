const rawAddressInput = document.getElementById("rawAddress");
const postcodeInput = document.getElementById("postcode");
const addressInput = document.getElementById("address");
const detailAddressInput = document.getElementById("detailAddress");
const fullAddressInput = document.getElementById("fullAddress");
const excelLineInput = document.getElementById("excelLine");
const searchButton = document.getElementById("searchButton");
const resetButton = document.getElementById("resetButton");
const copyExcelButton = document.getElementById("copyExcelButton");
const statusMessage = document.getElementById("statusMessage");
const copyButtons = document.querySelectorAll("[data-copy-target]");
const postcodeWrap = document.getElementById("postcodeWrap");
const toggleSearchButton = document.getElementById("toggleSearchButton");

let currentPostcode = null;
let lastParsedAddress = null;

function setStatus(message) {
  statusMessage.textContent = message;
}

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractDetailAddress(rawText) {
  const cleaned = normalizeSpaces(
    rawText.replace(/[,\n]/g, " ").replace(/\d{2,3}-\d{3,4}-\d{4}/g, " ")
  );

  const detailPatterns = [
    /((?:산)?\d+[A-Za-z\-]*동\s*\d+[A-Za-z\-]*호(?:\s*\d+층)?)/,
    /(\d+[A-Za-z\-]*동\s*\d+[A-Za-z\-]*호)/,
    /(\d+층\s*\d+[A-Za-z\-]*호)/,
    /([A-Za-z0-9가-힣]+동\s*\d+호)/,
    /(\d+[A-Za-z\-]*호)/,
    /([A-Za-z0-9가-힣]+동)/,
    /(\d+층)/,
  ];

  for (const pattern of detailPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const detail = normalizeSpaces(match[1]);
      const base = normalizeSpaces(cleaned.replace(match[1], " "));
      return { base, detail };
    }
  }

  return { base: cleaned, detail: "" };
}

function buildExtraAddress(data) {
  const extras = [];

  if (data.bname) {
    extras.push(data.bname);
  }

  if (data.buildingName) {
    extras.push(data.buildingName);
  }

  return extras.length ? ` (${extras.join(", ")})` : "";
}

function updateOutputs(postcode, address, detailAddress) {
  const detail = normalizeSpaces(detailAddress);
  const fullAddress = detail ? `${address} ${detail}` : address;

  postcodeInput.value = postcode;
  addressInput.value = address;
  detailAddressInput.value = detail;
  fullAddressInput.value = fullAddress;
  excelLineInput.value = `${postcode}\t${fullAddress}`;
}

function showSearchArea() {
  postcodeWrap.classList.remove("hidden");
  toggleSearchButton.textContent = "검색창 닫기";
}

function hideSearchArea() {
  postcodeWrap.classList.add("hidden");
  toggleSearchButton.textContent = "검색창 열기";
}

function copyText(value, successMessage) {
  if (!value) {
    setStatus("복사할 내용이 없습니다.");
    return;
  }

  navigator.clipboard
    .writeText(value)
    .then(() => setStatus(successMessage))
    .catch(() => setStatus("복사에 실패했습니다. 브라우저 권한을 확인해 주세요."));
}

function handleSelectedAddress(data, parsed) {
  const selectedBaseAddress =
    data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
  const roadExtra =
    data.userSelectedType === "R" ? buildExtraAddress(data) : "";
  const selectedAddress = `${selectedBaseAddress}${roadExtra}`.trim();

  updateOutputs(data.zonecode, selectedAddress, parsed.detail);
  setStatus("주소를 정리했습니다. 필요한 항목을 바로 복사할 수 있습니다.");
  hideSearchArea();
}

function openPostcodeSearch() {
  const rawText = rawAddressInput.value.trim();

  if (!rawText) {
    setStatus("먼저 주소 원문을 붙여넣어 주세요.");
    rawAddressInput.focus();
    return;
  }

  if (!window.kakao || !window.kakao.Postcode) {
    setStatus("카카오 우편번호 서비스를 불러오지 못했습니다.");
    return;
  }

  const parsed = extractDetailAddress(rawText);
  lastParsedAddress = parsed;
  postcodeWrap.innerHTML = "";
  showSearchArea();

  currentPostcode = new window.kakao.Postcode({
    oncomplete(data) {
      handleSelectedAddress(data, parsed);
    },
    onresize(size) {
      postcodeWrap.style.height = `${Math.max(size.height, 460)}px`;
    },
    hideMapBtn: true,
    hideEngBtn: true,
  });

  currentPostcode.embed(postcodeWrap, { q: parsed.base, autoClose: true });
  setStatus("추출한 주소를 검색창에 넣었습니다. 결과만 선택해 주세요.");
}

function resetForm() {
  rawAddressInput.value = "";
  postcodeInput.value = "";
  addressInput.value = "";
  detailAddressInput.value = "";
  fullAddressInput.value = "";
  excelLineInput.value = "";
  postcodeWrap.innerHTML = "";
  postcodeWrap.style.height = "";
  lastParsedAddress = null;
  currentPostcode = null;
  hideSearchArea();
  setStatus("초기화했습니다.");
}

searchButton.addEventListener("click", openPostcodeSearch);
resetButton.addEventListener("click", resetForm);
toggleSearchButton.addEventListener("click", () => {
  if (postcodeWrap.classList.contains("hidden")) {
    if (lastParsedAddress) {
      openPostcodeSearch();
      return;
    }

    setStatus("먼저 주소 원문을 붙여넣고 추출을 시작해 주세요.");
    return;
  }

  hideSearchArea();
});
copyExcelButton.addEventListener("click", () => {
  copyText(excelLineInput.value, "엑셀용 한 줄을 복사했습니다.");
});

copyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.copyTarget);
    copyText(target.value, "복사했습니다.");
  });
});

rawAddressInput.addEventListener("paste", () => {
  setTimeout(() => {
    if (rawAddressInput.value.trim()) {
      openPostcodeSearch();
    }
  }, 0);
});

hideSearchArea();
