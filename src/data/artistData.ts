export interface SocialLinks {
  instagram: string;
  tiktok: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  cityStateZip: string;
  fullAddress: string;
  socials: SocialLinks;
}

export interface TattooStyle {
  id: string;
  name: string;
  description: string;
  sampleImage: string;
}

export interface PortfolioItem {
  id: string;
  src: string;
  alt: string;
  categories: string[];
}

export const BOOKING_PAYMENT_URL = ""; // Unconfigured state, ready to receive payment link later

export const ARTIST_INFO = {
  name: "Jordynn Kapri Smith",
  brandName: "KaprInk",
  studioBranding: "KaprInk Tattoo Studio",
  bio: "I love cars, I love to paint. I’m a big lover and family girl. I love the outdoors, so does my dog stormi. Stormis my world!",
  stormiNote: "Stormi is Jordynn's beloved dog and constant outdoor companion. As Jordynn says, 'Stormi's my world!'",
};

export const CONTACT_INFO: ContactInfo = {
  phone: "801-791-0045",
  email: "Jordynnkaprink@gmail.com",
  address: "10348 South Redwood Road",
  cityStateZip: "South Jordan, Utah 84095",
  fullAddress: "10348 South Redwood Road, South Jordan, Utah 84095",
  socials: {
    instagram: "https://www.instagram.com/kapriink/",
    tiktok: "https://www.tiktok.com/@kaprink17",
  },
};

export const AVAILABILITY = {
  weekdays: {
    days: "Monday – Friday",
    hours: "3:00 PM – 8:00 PM",
  },
  weekends: {
    days: "Saturday – Sunday",
    hours: "10:00 AM – 7:00 PM",
  },
};

export const STYLES: TattooStyle[] = [
  {
    id: "abstract",
    name: "ABSTRACT",
    description: "Creative, unconventional tattoo compositions and expressive designs.",
    sampleImage: "/assets/kapriink/tattoos/tattoo_abstract_skull_8ball.jpg",
  },
  {
    id: "dark-shading",
    name: "DARK SHADING",
    description: "Bold tattoos with deeper contrast and darker shading.",
    sampleImage: "/assets/kapriink/tattoos/tattoo_skull_arrow.jpg",
  },
  {
    id: "fine-line",
    name: "FINE LINE",
    description: "Delicate, detailed linework with a lighter visual character.",
    sampleImage: "/assets/kapriink/tattoos/tattoo_botanical_sternum.jpg",
  },
  {
    id: "color",
    name: "COLOR",
    description: "Colorful tattoo work that brings more vibrancy to the design.",
    sampleImage: "/assets/kapriink/tattoos/tattoo_red_floral.jpg",
  },
];

export const PORTFOLIO: PortfolioItem[] = [
  {
    id: "skull-arrow",
    src: "/assets/kapriink/tattoos/tattoo_skull_arrow.jpg",
    alt: "Black and gray skull tattoo with arrow design on lower leg",
    categories: ["Dark Shading", "Fine Line"],
  },
  {
    id: "cowboy-hat",
    src: "/assets/kapriink/tattoos/tattoo_cowboy_hat.jpg",
    alt: "Small fine-line cowboy hat tattoo with cow-print pattern on ankle",
    categories: ["Fine Line"],
  },
  {
    id: "script-back",
    src: "/assets/kapriink/tattoos/tattoo_script_back.jpg",
    alt: "Script tattoo along the spine: 'Perfectly Imperfect : Psalms 139' ending with heart outline",
    categories: ["Fine Line"],
  },
  {
    id: "red-floral",
    src: "/assets/kapriink/tattoos/tattoo_red_floral.jpg",
    alt: "Red floral outline tattoo with multiple flower heads on arm",
    categories: ["Color", "Fine Line"],
  },
  {
    id: "botanical-sternum",
    src: "/assets/kapriink/tattoos/tattoo_botanical_sternum.jpg",
    alt: "Fine-line botanical branches tattoo extending horizontally below the chest",
    categories: ["Fine Line"],
  },
  {
    id: "spider-amor",
    src: "/assets/kapriink/tattoos/tattoo_spider_amor.jpg",
    alt: "Black ink symmetrical spider tattoo forming a heart around the belly button with 'amor' script text above",
    categories: ["Dark Shading", "Fine Line"],
  },
  {
    id: "eye-heart",
    src: "/assets/kapriink/tattoos/tattoo_eye_heart.jpg",
    alt: "Illustrative eye tattoo inside a flaming black heart outline on arm",
    categories: ["Dark Shading"],
  },
  {
    id: "mushroom",
    src: "/assets/kapriink/tattoos/tattoo_mushroom.jpg",
    alt: "Mushroom/jellyfish-like illustrative tattoo with bubbles on calf",
    categories: ["Dark Shading", "Fine Line"],
  },
  {
    id: "abstract-skull-8ball",
    src: "/assets/kapriink/tattoos/tattoo_abstract_skull_8ball.jpg",
    alt: "Abstract melting skull design, dripping 8-ball, and graffiti-like crown on forearm",
    categories: ["Abstract", "Dark Shading"],
  },
];

export const LOGOS = {
  circular: "/assets/kapriink/logo/logo_circular.jpg",
  studio: "/assets/kapriink/logo/logo_studio.jpg",
};
