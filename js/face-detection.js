const webcamElement = document.getElementById('webcam'); 
const webcam = new Webcam(webcamElement, 'user'); 
const modelPath = '/models'; 
let currentStream;
let displaySize; 
let canvas; 
let faceDetection; 
let faceData = []; 
let count = 0; 
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
*/
 
$("#webcam-switch").change(function () {
  //웹캠 스위치 변경 시 동작
  if (this.checked) {
    webcam.start()
      .then(result => {
        cameraStarted();
        webcamElement.style.transform = "";
        console.log("webcam started");
      })
      .catch(err => {
        displayError();
      });
  }
  else {
    cameraStopped();
    webcam.stop();
    console.log("webcam stopped");
  }
});
 
$('#cameraFlip').click(function () {
  // 카메라 플립 버튼 클릭 시 동작
  webcam.flip();
  webcam.start()
    .then(result => {
      webcamElement.style.transform = "";
    });
});
 
$("#webcam").bind("loadedmetadata", function () {
  // 웹캠 비디오 로드 완료 시 동작
  displaySize = { width: this.clientWidth, height: this.clientHeight };
});
 
$("#detection-switch").change(function () {
  // 얼굴 인식 스위치 변경 시 동작
  if (this.checked) {
    toggleContrl("box-switch", true);
    toggleContrl("landmarks-switch", true);
    $("#box-switch").prop('checked', true);
    $(".loading").removeClass('d-none');
    Promise.all([
      faceapi.nets.tinyFaceDetector.load(modelPath),
      faceapi.nets.faceLandmark68TinyNet.load(modelPath),
      faceapi.nets.faceExpressionNet.load(modelPath),
      faceapi.nets.ageGenderNet.load(modelPath)
    ]).then(function () {
      createCanvas();
      startDetection();
    })
  }
  else {
    clearInterval(faceDetection);
    toggleContrl("box-switch", false);
    toggleContrl("landmarks-switch", false);
    if (typeof canvas !== "undefined") {
      setTimeout(function () {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      }, 1000);
    }
  }
});
 
function createCanvas() {
  // 캔버스 생성 함수
    if (document.getElementsByTagName("canvas").length == 0) {
      canvas = faceapi.createCanvasFromMedia(webcamElement);
      canvas.id = "face-canvas";
      videoContainer.appendChild(canvas);
      faceapi.matchDimensions(canvas, displaySize);
    }
  }
 
function toggleContrl(id, show) {
  // 컨트롤 스위치 활성화/비활성화 함수
  if (show) {
    $("#" + id).prop('disabled', false);
    $("#" + id).parent().removeClass('disabled');
  } else {
    $("#" + id).prop('checked', false).change();
    $("#" + id).prop('disabled', true);
    $("#" + id).parent().addClass('disabled');
  }
}
 
function startDetection() {
  // 얼굴 인식 시작 함수
  faceDetection = setInterval(async () => {
    const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceExpressions().withAgeAndGender()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    const faces = resizedDetections.map(detection => {
      const landmarks = detection.landmarks;
      const descriptors = detection.descriptor;

      return {
        landmarks: landmarks,
        descriptors: descriptors
      };
    });

    const newFaces = faces.filter(face => {
      const isCounted = faceData.some(data => {
        return (
          JSON.stringify(data.descriptors) === JSON.stringify(face.descriptors)
        );
      });
      return !isCounted;
    });

    faceData.push(...newFaces);
 
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    if ($("#box-switch").is(":checked")) {
      faceapi.draw.drawDetections(canvas, resizedDetections)
    }
    if ($("#landmarks-switch").is(":checked")) {
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    }
    if (!$(".loading").hasClass('d-none')) {
      $(".loading").addClass('d-none')
    }
  }, 300)
  setInterval(() => {
    sendFaceDataToServer(faceData);
    faceData = [];
  }, 10000);
}
 
function cameraStarted() {
  // 카메라 시작 시 동작
  toggleContrl("detection-switch", true);
  $("#errorMsg").addClass("d-none");
  if (webcam.webcamList.length > 1) {
    $("#cameraFlip").removeClass('d-none');
  }
}
 
function cameraStopped() {
  // 카메라 중지 시 동작
  toggleContrl("detection-switch", false);
  $("#errorMsg").addClass("d-none");
  $("#cameraFlip").addClass('d-none');
}
 
function displayError(err = '') {
  // 에러 메시지 표시 함수
  if (err != '') {
    $("#errorMsg").html(err);
  }
  $("#errorMsg").removeClass("d-none");
}
 
 
function sendFaceDataToServer(data) {
  // 서버로 얼굴 데이터 전송 함수
  count += data.length;
  const requestData = {
    faceData: data,
    count: count
  };
  $.ajax({
    url: 'https://biqapp.com/api/v1/face/save-data',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(requestData),
    success: function(response) {
        console.log('얼굴 데이터 전송 성공');
        console.log('현재 카운트:', count);
        console.log(response);
    },
    error: function(error) {
      console.error('얼굴 데이터 전송 중 오류 발생', error);
    },
    complete: function() {
      count = 0;
    }
  });
}




