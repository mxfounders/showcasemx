const fs = require('fs');

const es = {
  contacto: {
    heroTitle1: "Hay algo que quieres resolver.",
    heroTitle2: "Empecemos por ahí.",
    heroDesc: "Ya sea que buscas una solución, construyes una o quieres colaborar, danos el contexto para llevar la conversación al lugar correcto.",
    bullets: [
      "Tu mensaje llega directamente al equipo.",
      "No te suscribimos al newsletter.",
      "Tus datos se usan únicamente para responder."
    ],
    form: {
      title: "Enviar un mensaje",
      nameLabel: "Nombre completo",
      namePlaceholder: "Tu nombre",
      emailLabel: "Correo de trabajo",
      emailPlaceholder: "tu@empresa.com",
      topicLabel: "¿De qué quieres hablar?",
      topics: {
        buy: "Busco una solución para mi empresa",
        sell: "Construyo una herramienta B2B",
        other: "Otro tema (colaboraciones, prensa, etc)"
      },
      messageLabel: "Mensaje",
      messagePlaceholder: "Cuéntanos un poco más sobre lo que necesitas...",
      submitBtn: "Enviar mensaje",
      successTitle: "Mensaje enviado",
      successDesc: "Hemos recibido tu mensaje. Lo revisaremos y nos pondremos en contacto contigo pronto.",
      successBtn: "Volver al inicio"
    }
  }
};

const en = {
  contacto: {
    heroTitle1: "There's something you want to solve.",
    heroTitle2: "Let's start there.",
    heroDesc: "Whether you're looking for a solution, building one, or want to collaborate, give us the context to take the conversation to the right place.",
    bullets: [
      "Your message goes straight to the team.",
      "We don't subscribe you to the newsletter.",
      "Your data is only used to reply."
    ],
    form: {
      title: "Send a message",
      nameLabel: "Full name",
      namePlaceholder: "Your name",
      emailLabel: "Work email",
      emailPlaceholder: "you@company.com",
      topicLabel: "What do you want to talk about?",
      topics: {
        buy: "I'm looking for a solution for my company",
        sell: "I build a B2B tool",
        other: "Other (collaborations, press, etc)"
      },
      messageLabel: "Message",
      messagePlaceholder: "Tell us a bit more about what you need...",
      submitBtn: "Send message",
      successTitle: "Message sent",
      successDesc: "We've received your message. We'll review it and get in touch with you soon.",
      successBtn: "Back to home"
    }
  }
};

function inject(file, extras) {
  let content = fs.readFileSync(file, 'utf8');
  const jsonStr = JSON.stringify(extras, null, 2);
  const insertStr = jsonStr.substring(2, jsonStr.length - 2);
  content = content.replace('"footer": {', insertStr + ',\n  "footer": {');
  fs.writeFileSync(file, content);
}

inject('src/i18n/dictionaries/es.ts', es);
inject('src/i18n/dictionaries/en.ts', en);

let page = fs.readFileSync('src/app/[locale]/(contact)/contacto/page.tsx', 'utf8');

page = page.replace(
  'export default function ContactPage() {',
  'import { getDictionary } from "@/i18n/get-dictionary";\nimport type { Locale } from "@/i18n/config";\n\nexport default async function ContactPage({params}:{params:Promise<{locale:string}>}) {\nconst {locale} = await params;\nconst dict = await getDictionary(locale as Locale);\nconst t = dict.contacto;'
);

page = page.replace(
  '<span className="block whitespace-nowrap">Hay algo que quieres resolver.</span><span className="block whitespace-nowrap">Empecemos por ahí.</span>',
  '<span className="block whitespace-nowrap">{t?.heroTitle1 || "Hay algo que quieres resolver."}</span><span className="block whitespace-nowrap">{t?.heroTitle2 || "Empecemos por ahí."}</span>'
);

page = page.replace(
  'Ya sea que buscas una solución, construyes una o quieres colaborar, danos el contexto para llevar la conversación al lugar correcto.',
  '{t?.heroDesc || "Ya sea que buscas una solución, construyes una o quieres colaborar, danos el contexto para llevar la conversación al lugar correcto."}'
);

page = page.replace(
  "['Tu mensaje llega directamente al equipo.', 'No te suscribimos al newsletter.', 'Tus datos se usan únicamente para responder.']",
  "(t?.bullets || ['Tu mensaje llega directamente al equipo.', 'No te suscribimos al newsletter.', 'Tus datos se usan únicamente para responder.'])"
);

page = page.replace(
  '<ContactForm />',
  '<ContactForm dict={t?.form} />'
);

fs.writeFileSync('src/app/[locale]/(contact)/contacto/page.tsx', page);
