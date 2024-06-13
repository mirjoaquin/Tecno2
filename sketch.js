let monitorear = false;

let FREC_MIN = 900;
let FREC_MAX = 2000;
let pitch;
let audioCotext;

//let gestorPitch;
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';



let images = [];
let fondoImages = [];
let currentFondo;
let mic;
let amp;
let amp_min = 0.004;
let imageSizeMin = 50;
let imageSizeMax = 100;
let imagesDrawn = [];
let imageGenInterval = 30;
let lastImageGenTime = 0;
let factor;
const extraWidthIncrease = 50; // Aumento adicional en el width
const startOffset = -40; // Offset de inicio desde el borde
const minRotation = -Math.PI / 100; // Ángulo mínimo de rotación (en radianes)
const maxRotation = Math.PI / 100; // Ángulo máximo de rotación (en radianes)
let maxRotation2;
let minRotation2;
let rotacion;

function preload() {
  // Cargamos todas las imágenes antes de iniciar el programa
  for (let i = 1; i <= 20; i++) {
    images.push(loadImage(`images/${i}.png`));
  }
  
  // Cargamos las nuevas imágenes circulares
  for (let i = 1; i <= 7; i++) {
    images.push(loadImage(`images/circulo${i}.png`));
  }
  
  // Cargamos las imágenes de fondo
  for (let i = 1; i <= 4; i++) {
    fondoImages.push(loadImage(`images/fondo${i}.png`));
  }
}

function setup() {
  createCanvas(700, windowHeight);
  audioContext = getAudioContext(); // inicia el motor de audio
  factor = Math.random() < 0.5 ? 1.5 : 2;
  maxRotation2 = Math.PI / 10;
  minRotation2 = -Math.PI / 10;

  // Seleccionamos un fondo inicial aleatorio
  currentFondo = random(fondoImages);
  
  // Inicializamos el micrófono
  mic = new p5.AudioIn();
  
  mic.start();
  mic.start(startPitch);
  userStartAudio();

  // Determinamos el tamaño inicial de las imágenes
  decideImageSize();

  //gestorPitch = new GestorSenial( FREC_MIN, FREC_MAX);
}

function draw() {

  let vol = mic.getLevel(); // cargo en vol la amplitud del micrófono (señal cruda);

  // Dibujamos el fondo actual
  background(220);
  image(currentFondo, 0, 0, width, height);
  

  // Obtenemos la amplitud del micrófono
  amp = mic.getLevel();
  
  // Generamos imágenes gradualmente si hay suficiente amplitud
  if (amp > amp_min && millis() - lastImageGenTime > imageGenInterval) {
    generateImage();
    lastImageGenTime = millis();
  }

  // Dibujamos las imágenes en el canvas
  for (let img of imagesDrawn) {
    // Calculate the new width proportionally to the original size of the image
    let ratio = img.size / imageSizeMax; // Ratio between current size and maximum size
    let newWidth = img.size + ratio * extraWidthIncrease * factor;
    
    // Draw the image with the newly calculated width
    push();
    translate(img.x + img.size / 2, img.y + img.size / 2); // Translate to image center
    rotate(img.rotation); // Apply the stored rotation
    imageMode(CENTER);
    image(img.img, 0, 0, newWidth, img.size); // Draw the image
    pop();
  }

  //if(monitorear){
    //gestorPitch.dibujar(100, 300);
  //}

  

  // Mostramos los datos adicionales usando la función printData()
  //printData();
}

function generateImage() {
  let imgSize;
  let imgX, imgY;
  let rotation = random(minRotation2, maxRotation2); // Random rotation angle

  // Determinamos el tamaño de la imagen
  imgSize = random(imageSizeMin, imageSizeMax);
  imgSize2 = 30;

  // Determinamos si la nueva imagen será una de las imágenes circulares
  let useCircularImage = random(1) < 0.08; // 1% de probabilidad para las circulares

  if (useCircularImage) {
    let index = floor(random(images.length - 7, images.length)); // Elegir una imagen circular aleatoria
    imagesDrawn.push({ img: images[index], x: random(width), y: random(height), size: imgSize2 , rotation: rotation });
  } else {
    // Encontramos la posición para la nueva imagen de manera diagonal
    for (let d = startOffset; d < width + height; d += imgSize) {
      for (let x = startOffset; x <= d; x += imgSize) {
        let y = d - x;
        if (x < width && y < height && !checkOverlap(x, y, imgSize)) {
          let index = floor(random(images.length - 7)); // Elegir una imagen aleatoria (excluyendo las circulares)
          imagesDrawn.push({ img: images[index], x: x, y: y, size: imgSize, rotation: rotation });
          return; // Termina la función después de encontrar una posición válida
        }
      }
    }
  }

  // Si llenamos el canvas, detenemos la generación de imágenes
  if (imagesDrawn.length >= (width / imgSize) * (height / imgSize)) {
    noLoop(); // Detiene el bucle draw() cuando el canvas está lleno
  }
}

function checkOverlap(x, y, size) {
  // Verifica si la nueva imagen se superpone con alguna imagen existente
  for (let img of imagesDrawn) {
    let d = dist(x + size / 2, y + size / 2, img.x + img.size / 2, img.y + img.size / 2);
    if (d < (size / 2 + img.size / 2)) {
      return true;
    }
  }
  return false;
}



function keyPressed() {
  if (key === 'r' || key === 'R') {
    // Reiniciar el dibujo limpiando el array de imágenes dibujadas
    imagesDrawn = [];
    loop(); // Vuelve a iniciar el bucle de dibujo

    // Decidimos el tamaño de las imágenes después de reiniciar
    decideImageSize();
  }

  if (key === 'f' || key === 'F') {
    // Cambiar el fondo a uno aleatorio al presionar la tecla 'f'
    currentFondo = random(fondoImages);

    // Decidimos el tamaño de las imágenes después de cambiar el fondo
    decideImageSize();
  }
}

function decideImageSize() {
  // Reiniciamos el array de imágenes dibujadas
  imagesDrawn = [];

  // Determinamos si las imágenes serán de tamaño 200 píxeles esta vez (25% de probabilidad)
  if (random(1) < 0.25) {
    imageSizeMin = 150;
    imageSizeMax = 200;
  } else {
    imageSizeMin = 50;
    imageSizeMax = 100;
  }
}

function startPitch() {
  pitch = ml5.pitchDetection(model_url, audioContext , mic.stream, modelLoaded);
}

