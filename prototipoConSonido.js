/*
 Entrega TP1
 Julia Ferrari, Michelle González,
 Micaela Floch, Lucas Gordillo,
 Pilar Fernández, Martina Furh
 Comisión Matías.
 */
let estadoActual = 1;
let trazos = [];
let imagenes = [];
let imagenesinv = [];
let imagenesOrbita = [];
let imagenesRojo = [];
let imagenesRojoinv = [];
let anguloGlobal = 0;
let opacidadFilas = [];

let radioEspiral = 40;
let anguloEspiral; // Ángulo actual del dibujo, irá aumentando o disminuyendo
let radioMaximo = 0;

let anguloInicial = 0;
let anguloFinal; // Límite del ángulo
let incrementoAngulo; // + o - dependiendo de la dirección

//------Configuración.
let amp_min = 0.015; //Umbral mínima de sonido que supera el ruido de fondo.
let amp_max = 0.3;
let amortiguacion = 0.9;
let gestorAmp; //para la amplitud
let altoGestor = 100;
let anchoGestor = 400;
//Amortiguación de la amplitud del micrófono, es un valor entre cero (sin amortiguación) y uno (amortiguación total)

let frec_min = 80;
let frec_max = 500;
let pitch;
let gestorPitch; //para la frecuencia
let audioContext;
const pitchModel = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/'; // modelo entrenado para reconocer frecuencia

let mic; //Micrófono.
let amplitud;
let haySonido = false; //cómo esta el sonido en cada momento
let antesHabiaSonido = false; // memoria del estado anterior del sonido
let imprimir = true; //Eso es para ver la amplitud en el sketch.

//GRAVE = ONDAS.
//AGUDO = PEGARSE AL EXTREMO.
//HAY SONIDO= DESAPARECEN FILAS.
//SIN SONIDO = VUELVE AL INICIAL.

//para elegir random de trazos
let arregloElegido = [];  // Guardará el arreglo activo
let estadoAnterior = -1;  // Para detectar cambio de estado

// para elegir random de direcciones
let espiralReversa = false;
let trazosEspiralGenerados = false;
let indiceDibujo = 0;    // Para ir dibujando poco a poco el espiral
let angulosEspiral = []; // Array con todos los ángulos precalculados (para dibujarlos en orden)

// velocidad
let velocidadEstado1 = 1; // valor por defecto

function preload() {
  for (let i = 0; i < 4; i++) {
    imagenes[i] = loadImage('data/trazo0' + i + '.PNG');
  }
  for (let i = 4; i < 26; i++) {
    let num = i < 10 ? '0' + i : i;
    imagenesOrbita.push(loadImage('data/trazo0' + num + '.PNG'));
  }
  for (let i = 26; i < 30; i++) {
    let num = i < 10 ? '0' + i : i;
    imagenesRojo.push(loadImage('data/trazo0' + num + '.PNG'));
  }
  
  for (let i = 0; i < 4; i++) {
    imagenesinv[i] = loadImage('data/trazo0' + i + 'inv.PNG');
  }
  
  for (let i = 26; i < 30; i++) {
    let num = i < 10 ? '0' + i : i;
    imagenesRojoinv.push(loadImage('data/trazo0' + num + 'inv.PNG'));
  }
}


function setup() {
  createCanvas(500, 600);
  audioContext = getAudioContext(); 
  mic = new p5.AudioIn(); 
  mic.start(startPitch); 
  gestorAmp = new GestorSenial (amp_min, amp_max) 
  gestorAmp. f = amortiguacion;
  gestorPitch = new GestorSenial(frec_min, frec_max);
  userStartAudio();
  generarEstado1();
}
class Trazo {
  constructor(x, y, img, dest = 0, ancho = 70, alto = 30) {
    console.log("El valor de dest es:", dest)
    this.x = x;
    this.y = y;
    this.img = img;
    this.ancho = ancho;
    this.alto = alto;
    this.radio = 0;
    this.anguloBase = 0;
    this.angulo = 0;
    this.destino = dest;
  }

  moverIzquierda() {
    this.x -= velocidadEstado1;
    
  
    if (this.x < -this.ancho) {
      let filaY = this.y;
      let desplazamientoX = (int(this.y / 35) % 2 === 1) ? this.ancho / 2 : 0;
      // Cantidad total de columnas generadas (debe coincidir con generarEstado1)
      let columnasTotales = int(width / this.ancho) + 3;
  
      this.x += columnasTotales * this.ancho;
    }
  
  }

  moverDesdeDerecha() {
    if (this.x > this.destino) {
      this.x -= 15;
      if (this.x < this.destino) this.x = this.destino;
    }
  }
  
  moverDesdeIzquierda() {
    if (this.x < this.destino){
      this.x += 15;
      if (this.x > this.destino) this.x = this.destino;
    }
  }

  orbitar(anguloGlobal) {
    this.angulo = anguloGlobal + this.anguloBase;
    this.x = width / 2 + cos(this.angulo) * this.radio;
    this.y = height / 2 + sin(this.angulo) * this.radio;
  }

  mostrar() {
    image(this.img, this.x, this.y, this.ancho, this.alto);
  }



  mostrarRotado(tamanoAncho = this.ancho, tamanoAlto = this.alto) {
    push();
    translate(this.x, this.y);
    rotate(this.angulo + HALF_PI);
    imageMode(CENTER);
    image(this.img, 0, 0, tamanoAncho, tamanoAlto);
    pop();
  }

  setDestino(dest) {
    this.destino = dest;
  }
}

function definirTamanoCanvas() {
  let nuevoAlto = random() < 0.75 ? 600 : 500;
  resizeCanvas(500, nuevoAlto);
  background(237, 229, 206); 
}


function draw() {
  background(237, 229,206);
  gestorAmp.actualizar(mic.getLevel())
  amplitud = gestorAmp.filtrada;
  haySonido = amplitud > amp_min;

  let empezoElSonido = haySonido && !antesHabiaSonido;
  let terminaElSonido = !haySonido && antesHabiaSonido;
   
  if (haySonido) {
    let tono = gestorPitch.filtrada;

    if (tono > 0.6) {
      if (estadoActual !== 2) {
        estadoActual = 2;
        generarEstado2();
      }
    } else if (tono < 0.3) {
      if (estadoActual !== 3) {
        estadoActual = 3;
        generarEstado3();
      }
    } else {
      if (estadoActual !== 1) {
        estadoActual = 1;
        generarEstado1();
      }
    }
  } else {
    if (estadoActual !== 1) {
      estadoActual = 1;
      generarEstado1();
    }
  }

  if (imprimir) {
    printData();
  }

  if (estadoActual === 1) {
    for (let i = 0; i < trazos.length; i++) {
      trazos[i].moverIzquierda();

      let filaIndex = int(trazos[i].y / (height / opacidadFilas.length));
      if (opacidadFilas[filaIndex] > 0) {
        tint(255, opacidadFilas[filaIndex]);
        trazos[i].mostrar();
      }
    }
    noTint();

    if (empezoElSonido) {
      for (let i = 0; i < opacidadFilas.length; i++) {
        if (i % 2 !== 0) {
          opacidadFilas[i] = max(opacidadFilas[i] - 10, 0);
        } else {
          opacidadFilas[i] = min(opacidadFilas[i] + 10, 255);
        }
      }
    } else {
      for (let i = 0; i < opacidadFilas.length; i++) {
        opacidadFilas[i] = min(opacidadFilas[i] + 10, 255);
      }
    }
  }

  if (estadoActual === 2) {
    let velocidadMovimiento = 15;

    for (let i = 0; i < trazos.length; i++) {
      if (trazos[i].x > trazos[i].destino) {
        trazos[i].x -= velocidadMovimiento;
        if (trazos[i].x < trazos[i].destino) trazos[i].x = trazos[i].destino;
      } else if (trazos[i].x < trazos[i].destino) {
        trazos[i].x += velocidadMovimiento;
        if (trazos[i].x > trazos[i].destino) trazos[i].x = trazos[i].destino;
      }

      let filaIndex = int(trazos[i].y / 28);
      let filaTrazos = trazos.filter(t => int(t.y / 28) === filaIndex);
      let indexEnFila = filaTrazos.indexOf(trazos[i]);
      let opacidad = (indexEnFila >= filaTrazos.length - 2) ? 150 : 255;
      tint(255, opacidad);

      // Mostrar espejado si se mueve hacia la derecha
      trazos[i].mostrar();

    }
    noTint();
  }

  if (estadoActual === 3) {
    anguloGlobal += 0.005;

    if (indiceDibujo < angulosEspiral.length) {
      let a = angulosEspiral[indiceDibujo];
      let r = 5 * a;

      if (r > 0) {
        let x = width / 2 + cos(a) * r;
        let y = height / 2 + sin(a) * r;

        let img = random(arregloElegido);
        let trazo = new Trazo(x, y, img);
        trazo.radio = r;
        trazo.anguloBase = a;
        trazos.push(trazo);
      }
      indiceDibujo++;
    }

    for (let i = 0; i < trazos.length; i++) {
      trazos[i].orbitar(anguloGlobal);
      trazos[i].mostrarRotado(20, 20);
    }
  }

  estadoAnterior = estadoActual; // Actualiza para detectar cambio en la siguiente iteración
}

//-------- PITCH DETECTION ---------

function startPitch() {
  pitch = ml5.pitchDetection(pitchModel, audioContext , mic.stream, modelLoaded); 
}

function modelLoaded() {
  getPitch();
}

function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency) {
      gestorPitch.actualizar(frequency)
      //console.log(frequency);
    } else {
    }
    getPitch();
  })
}


function generarEstado1() {
  definirTamanoCanvas(); 
  velocidadEstado1 = random(0.5, 3);
  trazos = [];
  opacidadFilas = [];

  let columnaAncho = int(random(40, 80));
  let totalFilas = int(random(4, 25));
  let filaAltura = height / totalFilas;

  let arreglosDisponibles = [imagenes, imagenesRojo];
  arregloElegido = random(arreglosDisponibles);

  for (let fila = 0; fila < totalFilas; fila++) {
    // Asignar opacidad fija por fila al momento de crearla
    let chance = random();
    if (chance < 0.3) {
      opacidadFilas[fila] = 0;       // Invisible
    } else if (chance < 0.6) {
      opacidadFilas[fila] = 100;     // Semi visible
    } else {
      opacidadFilas[fila] = 255;     // Visible
    }

    let y = fila * filaAltura;
    let desplazamientoX = (fila % 2 === 1) ? columnaAncho / 2 : 0;
    let columnas = int(width / columnaAncho) + 3;

    for (let col = 0; col < columnas; col++) {
      let x = col * columnaAncho + desplazamientoX;
      let img = random(arregloElegido);
      trazos.push(new Trazo(x, y, img, 0, columnaAncho, filaAltura * 0.8));
    }
  }
}




function generarEstado2() {
  definirTamanoCanvas(); 
  trazos = [];

  let filas = 25;
  let maxColumnas = 5;
  let espacioX = 70;

  let modoDireccion = random([0, 1, 2]); 
  let modoColor = random([1, 2, 3]);     

  for (let fila = 0; fila < filas; fila++) {
    let cantidad = int(random(2, maxColumnas + 1));
    let y = fila * 28;

    let direccionFila;
    if (modoDireccion === 2) {
      direccionFila = random([0,1]);
    } else {
      direccionFila = modoDireccion;
    }


    let arreglosPosibles;
    if (modoColor === 1) {
      arreglosPosibles = [imagenes];
    } else if (modoColor === 2) {
      arreglosPosibles = [imagenesRojo];
    } else {
      arreglosPosibles = [imagenes, imagenesRojo];
    }

    for (let col = 0; col < cantidad; col++) {
      let xDestino;
      let xInicial;

      if (direccionFila === 0) {
        xDestino = col * espacioX;
        xInicial = width + random(50, 150);
      } else {
        xDestino = width - (col + 1) * espacioX;
        xInicial = -random(50, 150);
      }


      let arregloElegidoParaTrazo = random(arreglosPosibles);
      let img;
        if (direccionFila === 0) {

          img = random(arregloElegidoParaTrazo);
        } else {

          if (arregloElegidoParaTrazo === imagenes) {
            img = random(imagenesinv);
          } else if (arregloElegidoParaTrazo === imagenesRojo) {
            img = random(imagenesRojoinv);
          } else {
            img = random(arregloElegidoParaTrazo);
          }
        }


      let trazo = new Trazo(xInicial, y, img, xDestino, 70, 30);
      trazos.push(trazo);
    }
  }
}






function generarEstado3() {
  definirTamanoCanvas();  
  trazos = [];
  angulosEspiral = [];
  indiceDibujo = 0;

  espiralReversa = random([true, false]);

  radioMaximo = width / 2 
  let anguloMaximo = radioMaximo / 5;

  let paso = 0.1;
  console.log(radioMaximo);
  if (espiralReversa) {
    for (let a = anguloMaximo; a >= 0; a -= paso) {
      
      angulosEspiral.push(a);
    }
  } else {
    for (let a = 0; a <= anguloMaximo; a += paso) {
      angulosEspiral.push(a);
    }
  }

  // Elegir un arreglo aleatorio de imágenes
  let arreglosDisponibles = [imagenes, imagenesOrbita, imagenesRojo];
  arregloElegido = random(arreglosDisponibles);
}

class GestorSenial{


	//----------------------------------------

	constructor( minimo_ , maximo_ ){

		this.minimo = minimo_;
		this.maximo = maximo_;

		this.puntero = 0;
		this.cargado = 0;
		this.mapeada = [];
		this.filtrada = 0;
		this.anterior = 0;
		this.derivada = 0;
		this.histFiltrada = [];		
		this.histDerivada = [];		
		this.amplificadorDerivada = 15.0;
		this.dibujarDerivada = false;

		this.f = 0.80;
	}
	//----------------------------------------


	actualizar( entrada_ ){

		this.mapeada[ this.puntero ] = map( entrada_ , this.minimo , this.maximo , 0.0 , 1.0 );
		this.mapeada[ this.puntero ] = constrain( this.mapeada[ this.puntero ] , 0.0 , 1.0 );

		this.filtrada = this.filtrada * this.f + this.mapeada[ this.puntero ] * ( 1-this.f );
		this.histFiltrada[ this.puntero ] = this.filtrada;

		this.derivada = ( this.filtrada - this.anterior ) * this.amplificadorDerivada;
		this.histDerivada[ this.puntero ] = this.derivada;

		this.anterior = this.filtrada;

		this.puntero++;
		if( this.puntero >= anchoGestor ){
			this.puntero = 0;			
		}
		this.cargado = max( this.cargado , this.puntero );

	}

}
