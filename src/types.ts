export interface Entry {
  org: string;
  location: string;
  role: string;
  start: string;
  end: string | null;
  tags: string[];
  bullets: string[];
}

export interface Honor {
  category: string;
  title: string;
  years: string[];
  tags?: string[];
}

export interface ImpactNumber {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  source: string;
}

export interface Education {
  school: string;
  location: string;
  start: string;
  end: string | null;
  display_dates?: string;
  degrees?: string[];
  gpa?: string;
}

export interface Greeting {
  language: string;
  lang: string;
  greeting: string;
}

export interface Resume {
  person: {
    name: string;
    tagline: string;
    looking_for?: string;
    focus_areas?: string[];
    location: { display: string };
    email: string;
    links: { linkedin: string };
    languages: string[];
    language_greetings?: Greeting[];
    intro_translations?: IntroTranslation[];
  };
  education: Education[];
  research: Entry[];
  service: Entry[];
  leadership: Entry[];
  music_and_work: Entry[];
  honors: Honor[];
  impact_numbers: ImpactNumber[];
  papers?: Paper[];
  explainers?: { pcos?: PcosExplainer; glioblastoma?: GbmExplainer };
  places?: Place[];
}

export interface Paper {
  id: string;
  title: string;
  title_en?: string;
  language: string;
  related_org: string;
  advisors: string[];
  status: string;
  tags: string[];
  abstract: { en: string; es?: string };
}

export interface Draftable {
  draft?: boolean;
}

export interface PcosTrait {
  id: string;
  label: string;
  axis: 'metabolic' | 'reproductive';
  min: number;
  max: number;
  unit: string;
}

export interface PcosExplainer extends Draftable {
  title: string;
  note: string;
  intro: string;
  traits: PcosTrait[];
  examples: { label: string; values: Record<string, number> }[];
  subtypes: Record<'reproductive' | 'metabolic' | 'indeterminate', { label: string; text: string }>;
  footnote: string;
}

export interface GbmExplainer extends Draftable {
  title: string;
  lab: string;
  intro: string;
  note: string;
  groups: { id: string; label: string; text: string }[];
  nodes: { id: string; group: string; role: string }[];
  links: [string, string][];
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
  kind: 'worked' | 'studied';
  items: string[];
}

export interface IntroTranslation extends Draftable {
  lang: string;
  label: string;
  text: string;
}
