const webcamElement = document.getElementById('webcam'); 
const webcam = new Webcam(webcamElement, 'user'); 
const modelPath = '/models'; 
let currentStream;
let displaySize; 
let canvas; 
let faceDetection; 
let faceData = []; 
let count = 0; 
let imageDescriptors;
/* 
webcamElement: 웹캠 비디오 요소를 가져옵니다.
webcam: Webcam 클래스의 인스턴스를 생성하고, 이를 webcamElement와 연결합니다.
modelPath: 모델 파일의 경로를 지정합니다.
currentStream: 현재 웹캠 스트림을 저장합니다.
displaySize: 화면에 표시할 웹캠 영상의 크기를 저장합니다.
canvas: 얼굴 인식 결과를 그릴 캔버스 요소를 저장합니다.
faceDetection: 얼굴 인식 작업을 주기적으로 실행하는 타이머를 저장합니다.
faceData: 인식된 얼굴 데이터를 저장하는 배열입니다.
count: 서버로 전송된 얼굴 데이터의 개수를 저장하는 카운트 변수입니다.
imageDescriptors: descriptors값을 저장하는 변수입니다.
*/
 
/**
 * 'webcam-switch' 요소의 체크 상태 변화 이벤트 핸들러입니다.
 * 'webcam-switch' 요소의 체크 여부에 따라 웹캠을 시작하거나 중지합니다.
 */
 $("#webcam-switch").change(function () {
  if (this.checked) {
    // 웹캠을 시작하고, 시작 성공 시 cameraStarted 함수 호출 및 비디오 요소의 변환 효과 초기화
    webcam.start()
      .then(result => {
        cameraStarted(); // 카메라가 시작된 후 실행되는 함수 호출
        webcamElement.style.transform = ""; // 비디오 요소의 변환 효과 초기화
        console.log("webcam started");
      })
      .catch(err => {
        displayError(); // 오류 메시지 표시 함수 호출
      });
  } else {
    // 웹캠 중지, cameraStopped 함수 호출 및 웹캠 중지
    cameraStopped(); // 카메라가 중지된 후 실행되는 함수 호출
    webcam.stop();
    console.log("webcam stopped");
  }
});
 
/**
 * 'cameraFlip' 요소의 클릭 이벤트 핸들러입니다.
 * 'cameraFlip' 요소를 클릭할 때마다 웹캠을 플립하여 전면/후면 카메라를 전환합니다.
 */
 $('#cameraFlip').click(function () {
  // 웹캠을 플립하여 전면/후면 카메라를 전환
  webcam.flip();

  // 웹캠을 다시 시작하고, 시작 성공 시 비디오 요소의 변환 효과 초기화
  webcam.start()
    .then(result => {
      webcamElement.style.transform = "";
    });
});
 
/**
 * 웹캠 비디오 요소의 'loadedmetadata' 이벤트 핸들러입니다.
 * 웹캠 비디오 요소의 메타데이터가 로드될 때마다 실행되며,
 * 비디오 요소의 크기를 가져와 displaySize 객체에 저장합니다.
 */
 $("#webcam").bind("loadedmetadata", function () {
  // 웹캠 비디오 요소의 너비와 높이를 가져와 displaySize 객체에 저장
  displaySize = { width: this.clientWidth, height: this.clientHeight };
});
 
/**
 * 얼굴 감지 스위치 상태 변화 이벤트 핸들러입니다.
 * 얼굴 감지 스위치의 체크 여부에 따라 각종 컨트롤과 기능을 활성화 또는 비활성화합니다.
 */
 $("#detection-switch").change(function () {
  if (this.checked) {
    // 얼굴 감지가 활성화되는 경우
    toggleContrl("box-switch", true);
    toggleContrl("name-switch", true);
    toggleContrl("landmarks-switch", true);

    // 박스, 이름, 랜드마크 스위치들을 기본 체크 상태로 설정
    $("#box-switch").prop('checked', true);
    $("#name-switch").prop('checked', true);

    // 로딩 표시 요소 표시
    $(".loading").removeClass('d-none');

    // 얼굴 감지 모델 로딩 후 캔버스 생성 및 감지 시작
    Promise.all([
      faceapi.nets.tinyFaceDetector.load(modelPath),
      faceapi.nets.faceLandmark68TinyNet.load(modelPath),
      faceapi.nets.faceRecognitionNet.load(modelPath)
    ]).then(function () {
      createCanvas(); // 캔버스 생성
      startDetection(); // 얼굴 감지 시작
    });
  } else {
    // 얼굴 감지가 비활성화되는 경우
    clearInterval(faceDetection); // 얼굴 감지 타이머 중지

    // 박스, 이름, 랜드마크 스위치들을 비활성화 상태로 설정
    toggleContrl("box-switch", false);
    toggleContrl("name-switch", false);
    toggleContrl("landmarks-switch", false);

    // 캔버스 초기화
    if (typeof canvas !== "undefined") {
      setTimeout(function () {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      }, 1000);
    }
  }
});
 
/**
 * 웹캠 영상을 위한 캔버스를 생성하는 함수입니다.
 * 웹캠 영상을 표시하기 위한 캔버스가 없는 경우에만 생성합니다.
 */
 function createCanvas() {
  // 페이지 내에 캔버스 요소가 없는 경우에만 실행
  if (document.getElementsByTagName("canvas").length === 0) {
    // 웹캠 영상을 기반으로 캔버스 생성
    canvas = faceapi.createCanvasFromMedia(webcamElement);
    canvas.id = "face-canvas";
    
    // 캔버스를 비디오 컨테이너에 추가
    videoContainer.appendChild(canvas);
    
    // 캔버스의 크기를 화면 크기에 맞게 조정
    faceapi.matchDimensions(canvas, displaySize);
  }
}

 
/**
 * 특정 컨트롤 요소의 활성화 여부를 전환하는 함수입니다.
 * @param {string} id - 활성화 여부를 전환할 컨트롤 요소의 ID
 * @param {boolean} show - true면 컨트롤을 활성화하고, false면 비활성화합니다.
 */
 function toggleContrl(id, show) {
  if (show) {
    // 컨트롤을 활성화하고, 활성화 스타일 제거
    $("#" + id).prop('disabled', false);
    $("#" + id).parent().removeClass('disabled');
  } else {
    // 컨트롤을 비활성화하고, 체크를 해제하고 변경 이벤트를 트리거하여 체크 여부를 업데이트합니다.
    $("#" + id).prop('checked', false).change();
    // 컨트롤을 비활성화하고, 비활성화 스타일 추가
    $("#" + id).prop('disabled', true);
    $("#" + id).parent().addClass('disabled');
  }
}

$.getJSON('https://biqapp.com/api/v1/face/descriptors', function(jsonData) {
  // JSON 데이터를 변수로 활용하거나 출력합니다.
  imageDescriptors = jsonData;
})
.fail(function(jqxhr, textStatus, error) {
  console.error('데이터를 불러오는데 문제가 발생하였습니다.');
});

/**
 * 얼굴 감지를 시작하는 함수입니다.
 * 일정 간격으로 얼굴을 감지하고, 감지된 얼굴에 대한 작업 및 데이터 처리를 수행합니다.
 */
 function startDetection() {
  // 얼굴 감지를 주기적으로 수행하는 타이머 설정
  faceDetection = setInterval(async () => {
    // 웹캠을 사용하여 얼굴을 감지합니다.
    const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    // 감지된 얼굴 데이터를 화면 크기에 맞게 조절합니다.
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // 감지된 얼굴의 랜드마크와 특징을 추출하여 배열로 구성합니다.
    const faces = resizedDetections.map(detection => {
      const landmarks = detection.landmarks;
      const descriptors = detection.descriptor;

      return {
        landmarks: landmarks,
        descriptors: descriptors
      };
    });

    // 새로 감지된 얼굴 중 이미 등록되지 않은 얼굴을 필터링하여 신규 얼굴 배열에 추가합니다.
    const newFaces = faces.filter(face => {
      const isCounted = faceData.some(data => {
        if (data.descriptors && face.descriptors) {
          const similarity = faceapi.euclideanDistance(data.descriptors, face.descriptors);
          return similarity <= 0.5; // 일정 유사도 이상이면 이미 등록된 얼굴로 판단
        }
        return false;
      });
      return !isCounted; // 이미 등록되지 않은 얼굴만 반환
    });

    // 신규 얼굴 데이터를 기존 얼굴 데이터에 추가합니다.
    faceData.push(...newFaces);

    // 캔버스를 초기화하여 이전에 그려진 내용을 지웁니다.
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    // 체크박스에 따라 얼굴 시각화 및 이름 표시 작업을 수행합니다.
    if ($("#box-switch").is(":checked") || $("#name-switch").is(":checked")) {
      resizedDetections.forEach((detection, index) => {
        const box = detection.detection.box;

        if ($("#box-switch").is(":checked")) {
          faceapi.draw.drawDetections(canvas, [detection]);
        }
        if ($("#name-switch").is(":checked")) {
          const bestMatch = findBestMatch(faces[index].descriptors, imageDescriptors);
            const name = bestMatch? bestMatch.name: "";
            const affiliation = bestMatch? bestMatch.class: "";
            const textHeight = 14; 
            const textX = box.x + box.width + 5; 
            const textY = box.y + box.height - textHeight;

            // 이름을 바운딩 박스 옆에 표시합니다.
            canvas.getContext('2d').font = '14px Arial';
            canvas.getContext('2d').fillStyle = 'blue';
            canvas.getContext('2d').fillText(name, textX, textY -15);
            canvas.getContext('2d').fillText(affiliation, textX, textY);
        }
      });
    }

    // 얼굴 시각화 및 랜드마크 시각화 작업을 수행합니다.
    if ($("#box-switch").is(":checked")) {
      faceapi.draw.drawDetections(canvas, resizedDetections);
    }
    if ($("#landmarks-switch").is(":checked")) {
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }

    // 로딩 표시 요소를 숨깁니다.
    if (!$(".loading").hasClass('d-none')) {
      $(".loading").addClass('d-none');
    }
  }, 300);

  // 일정 시간마다 서버로 얼굴 데이터 전송하는 타이머 설정
  setInterval(() => {
    if (faceData.length !== 0) {
      // 얼굴 데이터를 서버로 전송하고, 전송 후 배열을 초기화합니다.
      sendFaceDataToServer(faceData);
      faceData = [];
    }
  }, 10000); // 10초마다 전송
}

/**
 * 얼굴 특징과 이미지들의 얼굴 특징들 사이에서 가장 적합한 매칭을 찾아 반환합니다.
 * @param {Array} descriptor - 현재 얼굴 객체의 특징 배열
 * @param {Array} imageDescriptors - 이미지들의 얼굴 특징들 배열
 * @returns {Object|string} - 가장 적합한 매칭을 가진 이미지 정보 또는 매칭이 없는 경우 특정 문자열
 */
 function findBestMatch(descriptor, imageDescriptors) {
  // 가장 적합한 매칭을 저장할 변수
  let bestMatch = null;
  // 현재까지의 최적 거리
  let bestDistance = Number.MAX_VALUE;

  // 이미지들과의 거리 비교
  for (const imageDesc of imageDescriptors) {
    // 현재 얼굴 특징과 이미지의 얼굴 특징 간의 유클리드 거리 계산
    const distance = faceapi.euclideanDistance(descriptor, imageDesc.descriptors);

    // 최적 거리보다 작을 경우에만 아래 작업 수행
    if (distance < bestDistance) {
      // 최적 거리 및 매칭 정보 업데이트
      bestDistance = distance;
      console.log(bestDistance);
      bestMatch = imageDesc;
    }
  }

  // 일정 유사도 이하의 경우에는 매칭 정보 반환, 그 외에는 null 반환
  return bestDistance <= 0.5 ? bestMatch : null;
}

/**
 * 카메라가 시작된 후 호출되는 함수입니다.
 * 카메라가 시작되면 실행되며, 필요한 제어를 활성화하고 오류 메시지를 숨깁니다.
 * 또한 여러 개의 웹캠이 연결되어 있는 경우 카메라 플립 기능을 활성화합니다.
 */
 function cameraStarted() {
  // 얼굴 감지 스위치 활성화
  toggleContrl("detection-switch", true);

  // 오류 메시지 숨김
  $("#errorMsg").addClass("d-none");

  // 여러 개의 웹캠이 연결되어 있는 경우 카메라 플립 기능 활성화
  if (webcam.webcamList.length > 1) {
    $("#cameraFlip").removeClass('d-none');
  }
}

/**
 * 카메라가 중지된 후 호출되는 함수입니다.
 * 카메라 중지 시 실행되며, 얼굴 감지 스위치를 비활성화하고 오류 메시지를 숨기며
 * 카메라 플립 기능을 비활성화합니다.
 */
 function cameraStopped() {
  // 얼굴 감지 스위치 비활성화
  toggleContrl("detection-switch", false);

  // 오류 메시지 숨김
  $("#errorMsg").addClass("d-none");

  // 카메라 플립 기능 비활성화
  $("#cameraFlip").addClass('d-none');
}

/**
 * 오류 메시지를 표시하는 함수입니다.
 * @param {string} err - 표시할 오류 메시지 (선택 사항)
 */
 function displayError(err = '') {
  // 만약 오류 메시지가 주어졌다면, 해당 메시지를 #errorMsg 요소에 설정
  if (err !== '') {
    $("#errorMsg").html(err);
  }

  // 오류 메시지를 화면에 표시하기 위해 클래스 제거
  $("#errorMsg").removeClass("d-none");
}

/**
 * 얼굴 데이터를 서버로 전송하는 함수입니다.
 * @param {Array} data - 전송할 얼굴 데이터 배열
 */
 function sendFaceDataToServer(data) {
  // 전송한 얼굴 데이터의 수를 기록하는 변수인 'count' 증가
  count += data.length;

  // 전송할 요청 데이터 객체 생성
  const requestData = {
    faceData: data, // 얼굴 데이터 배열
    count: count // 현재까지 전송한 얼굴 데이터의 총 수
  };

  // 서버로 데이터 전송
  $.ajax({
    url: 'https://biqapp.com/api/v1/face/save-data', // 데이터 전송할 URL
    type: 'POST', // POST 요청
    contentType: 'application/json', // 요청 데이터 형식
    data: JSON.stringify(requestData), // JSON 형식으로 데이터 변환하여 전송
    success: function(response) {
      console.log('얼굴 데이터 전송 성공');
      console.log('현재 카운트:', count);
      console.log(response); // 서버 응답 로그 출력
    },
    error: function(error) {
      console.error('얼굴 데이터 전송 중 오류 발생', error);
    },
    complete: function() {
      count = 0; // 전송 완료 후 'count' 초기화
    }
  });
}