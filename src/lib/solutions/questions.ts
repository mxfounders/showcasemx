import {solutionErrors,type SolutionData} from './model';
export const solutionQuestions=[
 {id:'identity',phase:0,title:'¿Cómo se llama lo que construyes?',hint:'El nombre que verá una empresa al descubrir tu proyecto.',fields:['name'],optional:false},
 {id:'categories',phase:0,title:'¿Qué ofreces y dónde encaja?',hint:'Elige el tipo de solución y todas las categorías que realmente cubres.',fields:['kind','category'],optional:false},
 {id:'problem',phase:1,title:'¿Qué problema haces más fácil?',hint:'Explica qué ocurre hoy y qué cambia con tu solución. Habla de lo concreto.',fields:['problem'],optional:false},
 {id:'audience',phase:1,title:'¿Para quién está pensada?',hint:'Tipo de empresa, equipo y momento en el que tu solución resulta útil.',fields:['audience'],optional:false},
 {id:'market',phase:1,title:'¿A quién sirve, en concreto?',hint:'Industrias y tamaños de empresa donde tu solución encaja de verdad. Si sirve a cualquiera, dilo — es una respuesta válida.',fields:['industries','companySizes'],optional:false},
 {id:'scope',phase:1,title:'¿Qué incluye y hasta dónde llega?',hint:'Ayuda a entender el alcance antes de iniciar una conversación.',fields:['scope','notFor'],optional:true},
 {id:'founders',phase:1,title:'¿Quién está detrás del proyecto?',hint:'Presenta a sus creadores o al equipo responsable. Estos datos serán públicos si se aprueba la ficha.',fields:['founders'],optional:true},
 {id:'links',phase:1,title:'¿Dónde podemos seguir el proyecto?',hint:'Redes oficiales, comunidad y enlaces útiles. Las redes personales van en la pregunta anterior.',fields:['projectLinks'],optional:true},
 {id:'screenshots',phase:1,title:'Muéstralo por dentro.',hint:'Capturas del producto o del trabajo entregado, con contexto y sin datos privados.',fields:['screenshots'],optional:true},
 {id:'demo',phase:1,title:'¿Podemos verlo en acción?',hint:'Una demo interactiva, un recorrido en video o una presentación pública.',fields:['demoUrl'],optional:true},
 {id:'pricing',phase:2,title:'¿Cómo se contrata?',hint:'Moneda, periodicidad, condiciones y qué está incluido. Si cotizas a medida, explica de qué depende.',fields:['pricing'],optional:true},
 {id:'delivery',phase:2,title:'¿Qué pasa después de contratar?',hint:'Puesta en marcha, integraciones disponibles y acompañamiento real.',fields:['implementation','integrations','support'],optional:true},
 {id:'evidence',phase:2,title:'¿Qué trabajo puedes respaldar?',hint:'Comparte un caso, un portafolio o una experiencia con contexto; evita resultados sin sustento.',fields:['evidence','evidenceUrl'],optional:true},
 {id:'contact',phase:2,title:'¿Dónde te encuentran?',hint:'El sitio aparecerá en la ficha. El correo es privado y se usa para la revisión.',fields:['website','contactEmail'],optional:false},
 {id:'review',phase:3,title:'Así estás presentando tu proyecto.',hint:'Revisa la información pública y el contacto privado antes de enviar.',fields:[],optional:false},
] as const;
export type SolutionQuestion=typeof solutionQuestions[number]['id'];
export function questionIndex(question:unknown,legacyStep=0){const found=solutionQuestions.findIndex(item=>item.id===question);return found>=0?found:Math.max(0,solutionQuestions.findIndex(item=>item.phase===legacyStep));}
export function isSolutionQuestion(value:unknown):value is SolutionQuestion{return solutionQuestions.some(item=>item.id===value);}
export function questionErrors(data:SolutionData,index:number){const errors=solutionErrors(data);return Object.entries(errors).filter(([key])=>(solutionQuestions[index].fields as readonly string[]).includes(key)).map(([,message])=>message!);}
