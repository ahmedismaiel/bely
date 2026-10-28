export type MarbleSkin = {
  id: string; name: string; nameAr: string; description: string; descriptionAr: string;
  family: string; familyAr: string; color: number; secondary: number; stars: number; style: number; finish: number;
  requires?: string;
};

const families = [
  { id: 'ribbon', name: 'Ribbon Glass', ar: 'زجاج مخطط', description: 'Transparent glass with three coloured ribbons.', descriptionAr: 'زجاج شفاف بثلاثة أشرطة ملونة.' },
  { id: 'eye', name: "Cat's Eye", ar: 'عين القطة', description: 'A single broad coloured vane inside clear glass.', descriptionAr: 'شريط ملون عريض داخل زجاج صافٍ.' },
  { id: 'cloud', name: 'Cloud Glass', ar: 'زجاج غائم', description: 'Soft clouds of colour suspended inside the glass.', descriptionAr: 'سحب ناعمة من اللون معلقة داخل الزجاج.' },
  { id: 'bubble', name: 'Bubble Glass', ar: 'زجاج فقاعي', description: 'Clear glass with tiny trapped bubbles and a coloured heart.', descriptionAr: 'زجاج صافٍ بفقاعات صغيرة وقلب ملون.' },
  { id: 'candy', name: 'Candy Swirl', ar: 'دوامة ملونة', description: 'Opaque, glossy colour with contrasting curved stripes.', descriptionAr: 'ألوان مصمتة لامعة بخطوط ملتفة متباينة.' },
  { id: 'porcelain', name: 'Porcelain', ar: 'خزف', description: 'Glazed ivory ceramic with a fine coloured band.', descriptionAr: 'خزف عاجي مزجج بشريط ملون رفيع.' },
  { id: 'metal', name: 'Metal', ar: 'معدن', description: 'Polished metal with sharp environmental reflections.', descriptionAr: 'معدن مصقول يعكس المكان بوضوح.' },
  { id: 'pearl', name: 'Pearl', ar: 'لؤلؤ', description: 'A milky surface with a subtle angle-dependent sheen.', descriptionAr: 'سطح لبني بلمعة تتغير مع زاوية النظر.' },
  { id: 'stone', name: 'Agate', ar: 'عقيق', description: 'Satin mineral bands with veins through the polished surface.', descriptionAr: 'طبقات معدنية ناعمة وعروق داخل السطح المصقول.' },
  { id: 'spark', name: 'Aventurine', ar: 'زجاج لامع', description: 'Coloured glass with fine metallic inclusions.', descriptionAr: 'زجاج ملون بداخله رقائق معدنية دقيقة.' },
];
const palettes = [
  { name: 'Nile', ar: 'النيل', color: 0x087fbc, secondary: 0xc8e5dd },
  { name: 'Amber', ar: 'العنبر', color: 0xd38b22, secondary: 0x382b29 },
  { name: 'Mint', ar: 'النعناع', color: 0x23a487, secondary: 0xe6e4ba },
  { name: 'Rose', ar: 'الورد', color: 0xd54f82, secondary: 0x252b4b },
  { name: 'Cobalt', ar: 'الكوبالت', color: 0x253fbd, secondary: 0xd4b543 },
  { name: 'Sunset', ar: 'الغروب', color: 0xe86529, secondary: 0x252325 },
  { name: 'Ivory', ar: 'العاج', color: 0xe3e4da, secondary: 0x246ca0 },
  { name: 'Orchid', ar: 'البنفسج', color: 0x7738ba, secondary: 0x55bbaa },
  { name: 'Jade', ar: 'اليشم', color: 0x529548, secondary: 0xbf462b },
  { name: 'Midnight', ar: 'الليل', color: 0x292b53, secondary: 0xccb767 },
];
const legacy: Record<number, Partial<MarbleSkin>> = {
  0: { id: 'nile', name: 'Nile Blue', nameAr: 'أزرق النيل', stars: 0, style: 0 },
  1: { id: 'honey', name: 'Honey Glass', nameAr: 'العسلية', stars: 2 },
  3: { id: 'rose', name: 'Rose Ribbon', nameAr: 'الشريط الوردي', stars: 14 },
  12: { id: 'mint', name: 'Mint Spiral', nameAr: 'دوامة النعناع', stars: 5 },
  29: { id: 'midnight', name: 'Midnight Oil', nameAr: 'سر الليل', stars: 20 },
  76: { id: 'pearl', name: 'Milk & Cobalt', nameAr: 'لبني وكوبالت', stars: 9 },
  99: { id: 'champion', name: 'The Champion', nameAr: 'بلية البطل', stars: 0, requires: 'king-of-the-hara', color: 0xe4b74b, secondary: 0xf3e6bc },
};

export const MARBLE_SKINS: MarbleSkin[] = families.flatMap((family, finish) => palettes.map((palette, variant) => {
  const index = finish * 10 + variant;
  return {
    id: `${family.id}-${variant + 1}`, name: `${palette.name} ${family.name}`, nameAr: `${family.ar} ${palette.ar}`,
    description: family.description, descriptionAr: family.descriptionAr,
    family: family.name, familyAr: family.ar, color: palette.color, secondary: palette.secondary,
    stars: Math.floor(index * 36 / 99), style: variant % 4, finish,
    ...legacy[index],
  };
}));