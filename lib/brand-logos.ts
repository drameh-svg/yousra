// Each brand's own website, used to show its logo (site icon) next to its name.
export const BRAND_DOMAINS: Record<string, string> = {
  "Zara": "zara.com", "H&M": "hm.com", "ASOS": "asos.com", "Reformation": "thereformation.com", "& Other Stories": "stories.com",
  "Mango": "mango.com", "Uniqlo": "uniqlo.com", "COS": "cos.com", "Massimo Dutti": "massimodutti.com", "Arket": "arket.com",
  "Sézane": "sezane.com", "Reiss": "reiss.com", "Club Monaco": "clubmonaco.com", "Theory": "theory.com", "Banana Republic": "bananarepublic.gap.com",
  "J.Crew": "jcrew.com", "Anthropologie": "anthropologie.com", "Free People": "freepeople.com", "Everlane": "everlane.com", "Vince": "vince.com",
  "Totême": "toteme-studio.com", "Staud": "staud.clothing", "Ganni": "ganni.com", "Baum und Pferdgarten": "baumundpferdgarten.com", "Gestuz": "gestuz.com",
  "Stand Studio": "standstudio.com", "Rotate": "rotatebirgerchristensen.com", "Selected Femme": "selected.com", "Vila": "vila.com", "Object": "object.com",
};
// The site's own icon via Google's public favicon service; the name always shows alongside it.
export const brandLogo = (name: string, size = 64) => BRAND_DOMAINS[name] ? `https://www.google.com/s2/favicons?domain=${BRAND_DOMAINS[name]}&sz=${size}` : null;
