// Script to just help me format the dictionary
const fs = require('fs');

const en = {
  compradores: {
    heading: "For buyers",
    col1Heading: "By operational problem",
    col2Heading: "By industry",
    col3Heading: "Your selection",
    links: {
      cobros: { label: "Billing & Accounts Receivable", desc: "Reduce your collection cycle from weeks to days" },
      contratos: { label: "Contracts & Digital Signature", desc: "Close deals without printing a single page" },
      nomina: { label: "Payroll & Compliance", desc: "IMSS, SAT and disbursement in one place" },
      finanzas: { label: "Financial Visibility", desc: "Know exactly what comes in, what goes out and when" },
      inventario: { label: "Inventory & Supply Chain", desc: "Real-time stock control, no Excel sheets" },
      ventas: { label: "Sales & CRM", desc: "Clear pipeline to close more and lose less" },
      soporte: { label: "Customer Support", desc: "Multichannel helpdesk without operational chaos" },
      agencias: { label: "Agencies & Consulting", desc: "Invoice, manage projects and collect on time" },
      retail: { label: "Retail & E-commerce", desc: "Integrated inventory, payments and logistics" },
      manufactura: { label: "Manufacturing", desc: "Digitize plant, suppliers and quality" },
      legal: { label: "Law Firms", desc: "Paperless files, clients and fees" },
      construccion: { label: "Construction & Real Estate", desc: "Construction contracts, estimates and progress" },
      salud: { label: "Healthcare & Clinics", desc: "Agenda, clinical records and billing in one system" },
      educacion: { label: "Education & EdTech", desc: "Enrollment, collection and parent communication" },
      essential: { label: "Essential Stack MX", desc: "The minimum tools to operate without chaos" },
      cfo: { label: "CFO Toolkit", desc: "Financial control for finance directors" },
      agencia: { label: "Agency in 30 days", desc: "Launch your service operation from scratch" },
      legalStack: { label: "Modern Legal Stack", desc: "From contract signing to collection, without printers" },
    },
    featured: {
      tag: "New",
      label: "Discover projects",
      desc: "Learn what they solve, save options and compare before contacting.",
      cta: "Explore catalog →"
    }
  },
  fundadores: {
    heading: "For founders",
    col1Heading: "Enter the catalog",
    col2Heading: "Your presence",
    col3Heading: "News",
    links: {
      aplicar: { label: "How to apply", desc: "The 3-step entry process, without bureaucracy" },
      criterios: { label: "Entry criteria", desc: "What the team evaluates: traction, model and execution" },
      proceso: { label: "Review process", desc: "From draft to published: times and direct communication" },
      faq: { label: "FAQ", desc: "Everything you need to know before sending your application" },
      soluciones: { label: "My solutions", desc: "Apply, check progress and manage your solutions" },
      leads: { label: "Opportunities", desc: "Companies that saw your solution and want to talk" },
      cuenta: { label: "Your account", desc: "Update your details and preferences" },
      drops: { label: "Weekly Drops", desc: "Be part of the most viewed weekly launch in the ecosystem" },
      directorio: { label: "Founders directory", desc: "Meet who else is building in the catalog" },
      eventos: { label: "Events & Networking", desc: "In-person B2B meetings in CDMX and Monterrey" },
      newsletter: { label: "Newsletter", desc: "Market intelligence: what companies are looking for today" },
      destacados: { label: "Featured Founders", desc: "The most tractioned operators in the catalog this month" },
    },
    featured: {
      tag: "Read it",
      label: "The Project",
      desc: "Why we built shwcs, how the selection process works and what it means to be in the catalog.",
      cta: "Read more →"
    }
  },
  recursos: {
    heading: "Resources",
    col1Heading: "Get to know shwcs",
    col2Heading: "Stay close",
    links: {
      proyecto: { label: "The Project", desc: "Why shwcs exists and how we choose what to present" },
      blog: { label: "Blog", desc: "Ideas to choose, build and operate better projects" },
      changelog: { label: "Changelog", desc: "What changes in the catalog and in the experience" },
      contacto: { label: "Contact", desc: "Tell us what you are looking for, building or want to propose" },
    },
    featured: {
      tag: "shwcs",
      label: "Projects with context",
      desc: "A selection to understand what each project solves and who is behind it.",
      cta: "Get to know the project →"
    }
  }
};
console.log(JSON.stringify(en, null, 2));
