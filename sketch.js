let monitorear = false;

let FREC_MIN = 200;  
let FREC_MAX = 200; 
let pitch;
let audioContext;

let shouldReiniciar = false;
let shouldCambiarFondo = false;

let classifier;
let label = 'waiting...';
let soundModel = 'https://teachablemachine.withgoogle.com/models/f_6cRVYpo/model.json';

const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';

let imagenesCalidas = []; 
let imagenesFrias = []; 
let fondoImages = [];
let images = [];
let currentFondo;
let mic;
let amp;
let amp_min = 0.0055;
let imgSize2;
let imageSizeMin = 50;
let imageSizeMax = 100;
let imagesDrawn = [];
let imageGenInterval = 70;
let lastImageGenTime = 0;
let factor;
let extraWidthIncrease = 60; // Aumento adicional en el width
const startOffset = -40; 
const minRotation = -Math.PI / 100; 
const maxRotation = Math.PI / 100; 
let maxRotation2;
let minRotation2;
let rotacion;
let margin = 20; 

let frequency = 0;
let circularImagesCount = 0; 
let circularImagesLimit; 

function preload() { 
  for (let i = 1; i <= 10; i++) {
    imagenesCalidas.push(loadImage(`images/calida${i}.png`));
  }
 
  for (let i = 1; i <= 10; i++) {
    imagenesFrias.push(loadImage(`images/fria${i}.png`));
  }

  for (let i = 1; i <= 16; i++) {
    fondoImages.push(loadImage(`images/fondo${i}.png`));
  }

  for (let i = 1; i <= 7; i++) {
    images.push(loadImage(`images/circulo${i}.png`));
  }
}

let startButton;

function setup() {
  createCanvas(700, windowHeight, P2D); // Forzar el uso del modo 2D (para evitar error que nos saltaba)
  factor = Math.random() < 0.5 ? 1.5 : 2;
  maxRotation2 = Math.PI / 10;
  minRotation2 = -Math.PI / 10;

  startButton = createButton('Start');
  startButton.position(width / 2 - startButton.width / 2, height / 2);
  startButton.mousePressed(initAudio);

  classifier = ml5.soundClassifier(soundModel, { probabilityThreshold: 0.95 }, modelReady); //teachable machine

  currentFondo = random(fondoImages);
  
  circularImagesLimit = floor(random(5, 7)); 
}

function initAudio() {
  audioContext = getAudioContext();
  audioContext.resume().then(() => {
    mic = new p5.AudioIn();
    mic.start(startPitch);
    startButton.remove(); 
  });
}

function modelReady() {
  console.log('Modelo de sonido cargado');
  if (typeof classifier.classify === 'function') {
    classifier.classify(gotResult);
  } else {
    console.error('classifier no tiene un método classify');
  }
}

function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  if (results && results[0]) {
    label = results[0].label;
    if (label === 'sh') {
      shouldReiniciar = true;
    } else if (label === 'aplauso') {
      shouldCambiarFondo = true;
    }
  }
}

function draw() {
  if (!mic) {
    return; 
  }

  background(currentFondo);

  if (shouldReiniciar) {
    reiniciarDibujo();
    shouldReiniciar = false; // Reiniciar el flag para evitar repeticiones
  } else if (shouldCambiarFondo) {
    cambiarFondoAleatorio();
    shouldCambiarFondo = false; // Reiniciar el flag para evitar repeticiones
  }

  amp = mic.getLevel();

  // Generar imágenes gradualmente
  if (amp > amp_min && millis() - lastImageGenTime > imageGenInterval) {
    generateImage();
    lastImageGenTime = millis();
  }

  // Dibujamos las imágenes en el canvas
  for (let img of imagesDrawn) {
    if (img.size === imgSize2) { 
      image(img.img, img.x, img.y, imgSize2, imgSize2);
    } else {
    let ratio = img.size / imageSizeMax; 
    let newWidth = img.size + ratio * extraWidthIncrease * factor;

    push();
    translate(img.x + img.size / 2, img.y + img.size / 2); 
    rotate(img.rotation); 
    imageMode(CENTER);
    image(img.img, 0, 0, newWidth, img.size); 
    pop();
  }
}
}

function reiniciarDibujo() {
  imagesDrawn = []; 
  circularImagesCount = 0; 
  loop(); // Reiniciar el bucle de dibujo si se detuvo
  decideImageSize(); // Decidir el tamaño de las imágenes después de reiniciar
}

// Función para cambiar el fondo a uno aleatorio
function cambiarFondoAleatorio() {
  currentFondo = random(fondoImages); 
  
}

function generateImage() {
  let imgSize;
  let rotation = random(minRotation2, maxRotation2); // Ángulo de rotación aleatorio

  // Determinar el tamaño de la imagen
  imgSize = random(imageSizeMin, imageSizeMax);
  imgSize2 = 40;


  let useCircularImage = circularImagesCount < circularImagesLimit && random(1) < 0.05; // 5-7 imágenes circulares

  if (useCircularImage) {
    circularImagesCount++; 
    let index = floor(random(images.length - 7, images.length)); // Elegir una imagen circular aleatoria
    let imgArray = random() < 0.5 ? imagenesCalidas : imagenesFrias; 
    imagesDrawn.push({ img: images[index % images.length], x: random(width), y: random(height), size: imgSize2, rotation: rotation });
  } else {
    let foundSpot = false;

    // Intentar encontrar una posición en la diagonal
    for (let d = startOffset; d < width + height; d += imgSize) {
      for (let x = startOffset; x <= d; x += imgSize) {
        let y = d - x;
        if (x < width && y < height && !checkOverlap(x, y, imgSize)) {
          let imgArray = frequency < FREC_MIN ? imagenesCalidas : imagenesFrias; 
          let index = floor(random(imgArray.length));
          imagesDrawn.push({ img: imgArray[index], x: x, y: y, size: imgSize, rotation: rotation });
          foundSpot = true;
          break; // Terminar el bucle interno después de encontrar una posición válida
        }
      }
      if (foundSpot) break; // Terminar el bucle externo si se encontró una posición válida
    }

    // Si no se encontró un lugar en la diagonal, intentar colocar en posiciones aleatorias
    if (!foundSpot) {
      for (let i = 0; i < 100; i++) { 
        let x = random(width);
        let y = random(height);
        if (!checkOverlap(x, y, imgSize)) {
          let imgArray = frequency < FREC_MIN ? imagenesCalidas : imagenesFrias; 
          let index = floor(random(imgArray.length));
          imagesDrawn.push({ img: imgArray[index], x: x, y: y, size: imgSize, rotation: rotation });
          break; 
        }
      }
    }
  }
}

function checkOverlap(x, y, size) {
  // Verificar si la nueva imagen se superpone con alguna de las imágenes dibujadas
  for (let img of imagesDrawn) {
    if (dist(x, y, img.x, img.y) < size / 2 + img.size / 2 + margin) {
      return true; // Hay superposición
    }
  }
  return false; // No hay superposición
}


function decideImageSize() {
  
  imagesDrawn = [];

  // Determinamos si las imágenes serán de un tamaño mayor (25% de probabilidad)
  if (random(1) < 0.25) {
    imageSizeMin = 30;
    imageSizeMax = 170;
    imgSize2 = 60;
    extraWidthIncrease = 150;
    margin = 70; 

    // Generamos también imágenes pequeñas dentro del mismo bloque de decisión
    } else {
    imageSizeMin = 30;
    imageSizeMax = 100;
    extraWidthIncrease = 60;
    margin = 40; 
 
  }
}


function startPitch() {
  pitch = ml5.pitchDetection(model_url, audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  console.log('Modelo de pitch detection cargado');
  getPitch();
}

function getPitch() {
  pitch.getPitch(function(err, frequencyValue) {
    if (err) {
      console.error(err);
    } else {
      if (frequencyValue) {
        frequency = frequencyValue;
      }
      getPitch(); 
    }
  });
}
