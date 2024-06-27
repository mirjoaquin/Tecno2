let monitorear = false;

let FREC_MIN = 200; // Frecuencia mínima para imágenes cálidas
let FREC_MAX = 200; // Frecuencia máxima para imágenes frías
let pitch;
let audioContext;

let shouldReiniciar = false;
let shouldCambiarFondo = false;


let classifier;
let label = 'waiting...';
let soundModel = 'https://teachablemachine.withgoogle.com/models/f_6cRVYpo/model.json';

const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';

let imagenesCalidas = []; // Imágenes cálidas
let imagenesFrias = []; // Imágenes frías
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
const extraWidthIncrease = 50; // Aumento adicional en el width
const startOffset = -40; // Offset de inicio desde el borde
const minRotation = -Math.PI / 100; // Ángulo mínimo de rotación (en radianes)
const maxRotation = Math.PI / 100; // Ángulo máximo de rotación (en radianes)
let maxRotation2;
let minRotation2;
let rotacion;
let margin = 20; // Define el margen extra alrededor de las imágenes

let frequency = 0;

function preload() {
  // Cargamos todas las imágenes cálidas
  for (let i = 1; i <= 10; i++) {
    imagenesCalidas.push(loadImage(`images/calida${i}.png`));
  }

  // Cargamos todas las imágenes frías
  for (let i = 1; i <= 10; i++) {
    imagenesFrias.push(loadImage(`images/fria${i}.png`));
  }

  // Cargamos las imágenes de fondo
  for (let i = 1; i <= 4; i++) {
    fondoImages.push(loadImage(`images/fondo${i}.png`));
  }

  for (let i = 1; i <= 7; i++) {
    images.push(loadImage(`images/circulo${i}.png`));
  }
}

let startButton;

function setup() {
  createCanvas(700, windowHeight, P2D); // Forzar el uso del modo 2D
  factor = Math.random() < 0.5 ? 1.5 : 2;
  maxRotation2 = Math.PI / 10;
  minRotation2 = -Math.PI / 10;

  // Create a start button for user interaction
  startButton = createButton('Start');
  startButton.position(width / 2 - startButton.width / 2, height / 2);
  startButton.mousePressed(initAudio);

  // Cargar y clasificar el modelo de sonido de Teachable Machine
  classifier = ml5.soundClassifier(soundModel, { probabilityThreshold: 0.95 }, modelReady);

  // Seleccionamos un fondo inicial aleatorio
  currentFondo = random(fondoImages);
}

function initAudio() {
  // Initialize the audio context and start the microphone
  audioContext = getAudioContext();
  audioContext.resume().then(() => {
    mic = new p5.AudioIn();
    mic.start(startPitch);
    startButton.remove(); // Remove the start button after initialization
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

  let vol = mic.getLevel(); // Cargo en vol la amplitud del micrófono (señal cruda);

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

  if (shouldReiniciar) {
    reiniciarDibujo();
    shouldReiniciar = false; // Reiniciar el flag para evitar repeticiones
  } else if (shouldCambiarFondo) {
    cambiarFondoAleatorio();
    shouldCambiarFondo = false; // Reiniciar el flag para evitar repeticiones
  }
}


function reiniciarDibujo() {
  imagesDrawn = []; // Limpiar el array de imágenes dibujadas
  loop(); // Reiniciar el bucle de dibujo si se detuvo
  // decideTamañoImagen(); // Decidir el tamaño de las imágenes después de reiniciar
  decideImageSize();
}

// Función para cambiar el fondo a uno aleatorio
function cambiarFondoAleatorio() {
  currentFondo = random(fondoImages); // Cambiar el fondo a uno aleatorio
  //  decideTamañoImagen(); // Decidir el tamaño de las imágenes después de cambiar el fondo
decideImageSize();
}

function generateImage() {
  let imgSize;
  let rotation = random(minRotation2, maxRotation2); // Ángulo de rotación aleatorio

  // Determinar el tamaño de la imagen
  imgSize = random(imageSizeMin, imageSizeMax);
  imgSize2 = 30;

  // Determinar si la nueva imagen será una de las imágenes circulares
  let useCircularImage = random(1) < 0.08; // 8% de probabilidad para las circulares

  if (useCircularImage) {
    let index = floor(random(images.length - 7, images.length)); // Elegir una imagen circular aleatoria
    let imgArray = random() < 0.5 ? imagenesCalidas : imagenesFrias; // Usar cualquier imagen (calida o fria)
    imagesDrawn.push({ img: images[index % images.length], x: random(width), y: random(height), size: imgSize2, rotation: rotation });
  } else {
    let foundSpot = false;

    // Intentar encontrar una posición en la diagonal
    for (let d = startOffset; d < width + height; d += imgSize) {
      for (let x = startOffset; x <= d; x += imgSize) {
        let y = d - x;
        if (x < width && y < height && !checkOverlap(x, y, imgSize)) {
          let imgArray = frequency < FREC_MIN ? imagenesCalidas : imagenesFrias; // Elegir una imagen aleatoria dependiendo de la frecuencia
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
      for (let i = 0; i < 100; i++) { // Hacer 100 intentos aleatorios
        let x = random(width);
        let y = random(height);
        if (!checkOverlap(x, y, imgSize)) {
          let imgArray = frequency < FREC_MIN ? imagenesCalidas : imagenesFrias; // Elegir una imagen aleatoria dependiendo de la frecuencia
          let index = floor(random(imgArray.length));
          imagesDrawn.push({ img: imgArray[index], x: x, y: y, size: imgSize, rotation: rotation });
          foundSpot = true;
          break; // Terminar el bucle si se encontró una posición válida
        }
      }
      if (!foundSpot) {
        console.log("No se encontró un lugar adecuado para la imagen.");
      }
    }
  }

  // Verificar si el canvas está lleno al máximo
  if (imagesDrawn.length >= (width / imageSizeMin) * (height / imageSizeMin)) {
    noLoop(); // Detener el bucle draw() cuando el canvas está lleno
    console.log("Canvas lleno, deteniendo generación de imágenes.");
  }
  
}

function checkOverlap(x, y, size) {
  // Verifica si la nueva imagen se superpone con alguna imagen existente
  for (let img of imagesDrawn) {
    let d = dist(x + size / 2, y + size / 2, img.x + img.size / 2, img.y + img.size / 2);
    if (d < (size / 2 + img.size / 2 + margin)) {
      return true;
    }
  }
  return false;
}

function decideImageSize() {
  // Reiniciamos el array de imágenes dibujadas
  imagesDrawn = [];

  // Determinamos si las imágenes serán de tamaño 200 píxeles esta vez (25% de probabilidad)
  if (random(1) < 0.25) {
    // Generamos un tamaño aleatorio entre 150 y 200
    imageSizeMin = 100;
    imageSizeMax = 170;
    margin = 70; // Aumentamos el margen cuando las imágenes son más grandes

    // Podemos añadir variabilidad en el tamaño de las imágenes
    imageSizeMin = floor(random(150, 200)); // Tamaño mínimo aleatorio entre 150 y 200
    imageSizeMax = imageSizeMin + floor(random(50, 100)); // Tamaño máximo entre imageSizeMin y imageSizeMin + 50-100
  } else {
    imageSizeMin = 50;
    imageSizeMax = 100;
    margin = 20; // Mantenemos el margen estándar para imágenes más pequeñas
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
      getPitch(); // Llama recursivamente para obtener la frecuencia continuamente
    }
  });
}
