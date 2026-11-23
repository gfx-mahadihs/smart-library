import type { Book } from "@/types/library";

export interface BookSpineStyle {
  bgGradient: string;
  textColor: string;
  accentColor: string;
  width: number;
  height: number;
  badge?: string;
}

export interface BookPreviewPage {
  title: string;
  pageNumber: number;
  content: {
    heading?: string;
    subheading?: string;
    text?: string[];
    tableOfContents?: { title: string; page: number }[];
    metadata?: Record<string, string>;
    quote?: { text: string; author: string };
  };
}

export function getBookSpineStyle(book: Book, index: number): BookSpineStyle {
  const styles: BookSpineStyle[] = [
    {
      bgGradient: "from-[#1a2332] via-[#24334a] to-[#141b27]",
      textColor: "#f0f4f8",
      accentColor: "#38bdf8",
      width: 38,
      height: 310,
      badge: "VOL. 01",
    },
    {
      bgGradient: "from-[#8b261d] via-[#a83226] to-[#741f17]",
      textColor: "#fff5f5",
      accentColor: "#fca5a5",
      width: 44,
      height: 295,
      badge: "ED. 02",
    },
    {
      bgGradient: "from-[#1e293b] via-[#334155] to-[#0f172a]",
      textColor: "#f8fafc",
      accentColor: "#94a3b8",
      width: 34,
      height: 285,
    },
    {
      bgGradient: "from-[#0f3a2c] via-[#15543f] to-[#0a271e]",
      textColor: "#f0fdf4",
      accentColor: "#4ade80",
      width: 46,
      height: 320,
      badge: "REF",
    },
    {
      bgGradient: "from-[#4c1d95] via-[#5b21b6] to-[#3b0764]",
      textColor: "#faf5ff",
      accentColor: "#c084fc",
      width: 40,
      height: 300,
      badge: "CLASSIC",
    },
    {
      bgGradient: "from-[#78350f] via-[#92400e] to-[#451a03]",
      textColor: "#fffbeb",
      accentColor: "#fcd34d",
      width: 36,
      height: 290,
    },
    {
      bgGradient: "from-[#0c4a6e] via-[#0369a1] to-[#082f49]",
      textColor: "#f0f9ff",
      accentColor: "#7dd3fc",
      width: 42,
      height: 315,
      badge: "SCI",
    },
    {
      bgGradient: "from-[#312e81] via-[#3730a3] to-[#1e1b4b]",
      textColor: "#eef2ff",
      accentColor: "#818cf8",
      width: 36,
      height: 280,
    },
    {
      bgGradient: "from-[#18181b] via-[#27272a] to-[#09090b]",
      textColor: "#fafafa",
      accentColor: "#e4e4e7",
      width: 50,
      height: 325,
      badge: "CORE",
    },
    {
      bgGradient: "from-[#831843] via-[#9d174d] to-[#500724]",
      textColor: "#fdf2f8",
      accentColor: "#f472b6",
      width: 34,
      height: 290,
    },
  ];

  return styles[index % styles.length];
}

export function generatePreviewPages(book: Book): BookPreviewPage[] {
  const categoryName = book.category?.name ?? "General";
  const authorName = book.authors.join(", ") || "Unknown Author";

  return [
    {
      title: "Cover & Title Page",
      pageNumber: 1,
      content: {
        heading: book.title,
        subheading: `By ${authorName}`,
        text: [
          `First published in ${book.publicationYear ?? "N/A"} by ${book.publisher ?? "Academic Press"}.`,
          `Library Classification: ${categoryName} Collection.`,
          "This preview provides an exploratory look into the opening chapters, thematic structure, and foundational ideas presented in this work.",
        ],
        metadata: {
          ISBN: book.isbn,
          Category: categoryName,
          Language: book.language.toUpperCase(),
          Pages: `${book.pages ?? 320} Pages`,
        },
      },
    },
    {
      title: "Frontispiece & Reflection",
      pageNumber: 2,
      content: {
        heading: "Prologue & Context",
        subheading: "Curator's Reading Notes",
        quote: {
          text: "Knowledge is an ongoing journey of exploration, questioning fundamental assumptions to build clearer understandings of our world.",
          author: authorName,
        },
        text: [
          book.description ??
            "An insightful volume selected for its exceptional clarity, enduring relevance, and capacity to stimulate inquiry among students and researchers.",
          "Every discipline advances through the deliberate examination of core principles, synthesizing experimental evidence with systematic analysis.",
        ],
      },
    },
    {
      title: "Table of Contents",
      pageNumber: 3,
      content: {
        heading: "Table of Contents",
        subheading: "Volume Structure & Chapters",
        tableOfContents: [
          { title: "Introduction & Foundational Questions", page: 1 },
          { title: "Chapter 1: The Architecture of the Field", page: 19 },
          { title: "Chapter 2: Methods, Models, and Observations", page: 54 },
          { title: "Chapter 3: Analysis of Core Paradigms", page: 102 },
          { title: "Chapter 4: Complex Dynamics & Case Studies", page: 168 },
          { title: "Chapter 5: Synthesis and Future Horizons", page: 235 },
          { title: "Selected Bibliography & Subject Index", page: 298 },
        ],
      },
    },
    {
      title: "Chapter 1: Opening",
      pageNumber: 4,
      content: {
        heading: "Chapter 1: The Architecture of the Field",
        subheading: "I. Foundations and First Principles",
        text: [
          "To begin any meaningful inquiry into this subject requires us to clarify the terms of our observation. How do individual components interact to create coherent, reproducible behaviors across time?",
          "Throughout the history of research in this domain, thinkers have consistently returned to a small set of persistent questions: What determines stability? How do variations propagate? And by what mechanisms can systemic change be reliably measured?",
          "In the discussions that follow, we construct a unified framework designed to reconcile traditional conceptual foundations with modern empirical insights.",
        ],
      },
    },
    {
      title: "Chapter 1: Observations",
      pageNumber: 5,
      content: {
        heading: "Key Hypotheses & Frameworks",
        subheading: "II. Analytical Perspectives",
        text: [
          "When we subject theoretical models to rigorous scrutiny, several surprising patterns emerge. Complexity does not always imply fragility; rather, adaptable structures frequently develop robust self-regulating equilibria.",
          "Careful documentation and critical evaluation provide the strongest safeguards against premature conclusions. By establishing clear diagnostic metrics early, practitioners can evaluate outcomes with measurable confidence.",
          "This principle underpins every case study examined in subsequent chapters.",
        ],
        quote: {
          text: "The essence of rigorous thinking lies not in possessing all answers, but in continually refining the quality of questions we pose.",
          author: "Editorial Commentary",
        },
      },
    },
    {
      title: "Library Summary & Availability",
      pageNumber: 6,
      content: {
        heading: "Library Circulation Information",
        subheading: "Access & Borrowing Details",
        text: [
          `This title is part of our active physical catalog with ${book.availableCopies} of ${book.totalCopies} copies currently ready for pickup at the main library circulation desk.`,
          `Physical Shelf Location: Section ${categoryName.slice(0, 3).toUpperCase()}-${(book.publicationYear ?? 2020) % 100}`,
          "Registered patrons can reserve this title immediately through their dashboard or speak directly with library staff for extended research loans.",
        ],
        metadata: {
          "Total Copies": String(book.totalCopies),
          "Available Now": String(book.availableCopies),
          Rating: `${book.rating} / 5.0`,
          "Circulation Status":
            book.availableCopies > 0 ? "Available on Shelf" : "All Copies Checked Out",
        },
      },
    },
  ];
}
