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
    toggleContrl("name-switch", true);
    toggleContrl("landmarks-switch", true);
    $("#box-switch").prop('checked', true);
    $("#name-switch").prop('checked', true);
    $(".loading").removeClass('d-none');
    Promise.all([
      faceapi.nets.tinyFaceDetector.load(modelPath),
      faceapi.nets.faceLandmark68TinyNet.load(modelPath),
      faceapi.nets.faceRecognitionNet.load(modelPath)
    ]).then(function () {
      createCanvas();
      startDetection();
    })
  }
  else {
    clearInterval(faceDetection);
    toggleContrl("box-switch", false);
    toggleContrl("name-switch", false);
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

// 이미지에서 가져온 얼굴 특징값 리스트
const imageDescriptors = [
  // 이미지에서 가져온 얼굴 특징값들을 넣어주세요
  // 예: { name: "Person1", descriptors: [...], landmarks: [...] },
  //     { name: "Person2", descriptors: [...], landmarks: [...] },
  {name: "장태영", 
  class: "보안과",
  descriptors: [
  -0.10796964168548584,
  0.11063645780086517,
  0.002650010399520397,
  -0.05858393758535385,
  -0.08180209994316101,
  -0.10717493295669556,
  -0.07516109943389893,-0.15867555141448975,0.13405776023864746,-0.08758267015218735,0.2729109227657318,-0.03166250139474869,-0.17755915224552155,-0.1668262779712677,-0.06898770481348038,0.1849915087223053,-0.1853914111852646,-0.09929034113883972,-0.06846406310796738,-0.025645725429058075,0.12955939769744873,-0.008250088430941105,0.04921139404177666,0.039339207112789154,-0.07200369238853455,-0.31537315249443054,-0.08517275005578995,-0.08151450753211975,-0.00551361870020628,-0.060541436076164246,-0.0089366864413023,0.0007067825645208359,-0.22175395488739014,-0.1028754711151123,0.02874690853059292,0.08430048823356628,-0.0088015366345644,-0.006317250430583954,0.16953745484352112,-0.04323801025748253,-0.18701356649398804,-0.037198927253484726,0.060849256813526154,0.21075066924095154,0.1672922521829605,0.07243102043867111,-0.004628535360097885,-0.14913156628608704,0.0953371599316597,-0.1728096306324005,0.04616539552807808,0.12854315340518951,0.03730493038892746,0.07006597518920898,0.02278664894402027,-0.08495412021875381,0.07711609452962875,0.12192272394895554,-0.12621203064918518,-0.04688619077205658,0.09446981549263,-0.10362549871206284,-0.12090035527944565,-0.0632346048951149,0.2546027898788452,0.06764630973339081,-0.12878352403640747,-0.14037677645683289,0.07981934398412704,-0.09830786287784576,-0.12007226049900055,0.02675236389040947,-0.11233431100845337,-0.1532825529575348,-0.35027480125427246,-0.00438366923481226,0.42162567377090454,0.08150386065244675,-0.22862380743026733,0.05923972278833389,-0.06645648181438446,0.013539900071918964,0.18649135529994965,0.0975876972079277,0.008049460127949715,0.04500151053071022,-0.11063404381275177,0.028300287202000618,0.14573167264461517,-0.08481121808290482,-0.01628882810473442,0.2062537670135498,-0.022900156676769257,0.12897005677223206,0.015589350834488869,0.04513932392001152,-0.04142114892601967,0.06547711789608002,-0.12208142131567001,0.005754442885518074,0.13873466849327087,0.038456641137599945,-0.010582879185676575,0.059331513941287994,-0.12306384742259979,0.10124851763248444,0.04559927061200142,0.054889556020498276,0.04013833403587341,-0.07112029194831848,-0.10062279552221298,-0.0673520565032959,0.09283433109521866,-0.20787598192691803,0.26325851678848267,0.16168208420276642,0.0048317513428628445,0.13345494866371155,0.1414819359779358,0.06593557447195053,-0.010717840865254402,-0.05953861027956009,-0.2192409336566925,-0.016413863748311996,0.11328567564487457,-0.026423631235957146,0.09708216786384583,
  -0.026122113689780235], landmarks: []}
];

function startDetection() {
  // 얼굴 인식 시작 함수
  faceDetection = setInterval(async () => {
    const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

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
        if (data.descriptors && face.descriptors) {
          const similarity = faceapi.euclideanDistance(data.descriptors, face.descriptors);
          console.log(similarity);
          return similarity <= 0.8; // Change the condition to use the euclideanDistance
        }
        return false;
      });
      return !isCounted;
    });
    

    faceData.push(...newFaces);

    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if ($("#box-switch").is(":checked") || $("#name-switch").is(":checked")) {
      resizedDetections.forEach((detection, index) => {
        const box = detection.detection.box;

        if ($("#box-switch").is(":checked")) {
          faceapi.draw.drawDetections(canvas, [detection]);
        }

        if ($("#name-switch").is(":checked")) {
          const bestMatch = findBestMatch(faces[index].descriptors, imageDescriptors);
          const name = bestMatch.name;
          const textHeight = 14; // Font size
          const textX = box.x + box.width + 5; // Adjust as needed
          const textY = box.y + box.height - textHeight;

          // Display name next to the bounding box
          canvas.getContext('2d').font = '14px Arial';
          canvas.getContext('2d').fillStyle = 'black';
          canvas.getContext('2d').fillText(name, textX, textY);
        }
      });
    }


    if ($("#box-switch").is(":checked")) {
      faceapi.draw.drawDetections(canvas, resizedDetections);
    }
    if ($("#landmarks-switch").is(":checked")) {
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }

    if (!$(".loading").hasClass('d-none')) {
      $(".loading").addClass('d-none');
    }
  }, 300);

  setInterval(() => {
    if (faceData.length !== 0) {
      sendFaceDataToServer(faceData);
      faceData = [];
    }
  }, 10000);
}

function findBestMatch(descriptor, imageDescriptors) {
  let bestMatch = null;
  let bestDistance = Number.MAX_VALUE;

  for (const imageDesc of imageDescriptors) {
    const distance = faceapi.euclideanDistance(descriptor, imageDesc.descriptors);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = imageDesc;
    }
  }

  return bestMatch;
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




