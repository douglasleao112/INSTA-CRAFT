export type AspectRatio = '1:1' | '4:5' | '9:16';

export type LayoutType = 
  | 'full-bg' 
  | 'text-top-img-bottom' 
  | 'img-top-text-bottom' 
  | 'img-right-text-left' 
  | 'headline-img-subheadline';

export interface SignatureSlot {
  enabled: boolean;
  type: 'text' | 'page';
 position: { x: number; y: number };
homePosition?: { x: number; y: number }; // ✅ posição original
  name: string;
  handle: string;
  isVerified: boolean;
  showAvatar: boolean;
  avatar?: string;
  avatarBorderColor: string;
  avatarBorderWidth: number;
  avatarBorderRadius: number;
  avatarSize: number;
  showFrame: boolean;
}

export interface Branding {
  backgroundColor: string;
  alternativeBackgroundColor: string;
  thirdBackgroundColor: string;
  primaryColor: string;
  alternativePrimaryColor: string;
  thirdPrimaryColor: string;
  secondaryColor: string;
  alternativeSecondaryColor: string;
  thirdSecondaryColor: string;
  highlightColor: string;
  vignette: boolean;
  alternativeVignette: boolean;
  thirdVignette: boolean;
  handle: string;
  name: string;
  imageRadius: number;
  avatar?: string;
  isVerified: boolean;
  showAvatar: boolean;
  container: {
    enabled: boolean;
    backgroundColor: string;
    opacity: number;
    borderColor: string;
    borderRadius: number;
  };
  signatures: {
    topLeft: SignatureSlot;
    topRight: SignatureSlot;
    centerLow: SignatureSlot;
    bottomLeft: SignatureSlot;
    bottomRight: SignatureSlot;
  };
  typography: {
    headlineFontFamily: string;
    headlineFontSize: number;   // px
    headlineFontWeight: number;

    subheadlineFontFamily: string;
    subheadlineFontSize: number; // px
    subheadlineFontWeight: number;

    signatureFontFamily: string;
    signatureFontSize: number; // px
    signatureFontWeight: number;
  };
}

export interface SlideData {
  headlineStyle?: { fontFamily?: string; fontSize?: number; fontWeight?: number };
  subheadlineStyle?: { fontFamily?: string; fontSize?: number; fontWeight?: number };
  id: string;
  headline: string;
  subheadline: string;
  image?: string;
  layout: LayoutType;
  backgroundColor?: string;
  headlinePos?: { x: number; y: number };
  subheadlinePos?: { x: number; y: number };
  imagePos?: { x: number; y: number };
  signaturePositions?: {
    topLeft?: { x: number; y: number };
    topRight?: { x: number; y: number };
    centerLow?: { x: number; y: number };
    bottomLeft?: { x: number; y: number };
    bottomRight?: { x: number; y: number };
  };
}

export interface CarouselConfig {
  aspectRatio: AspectRatio;
  slideCount: number;
  branding: Branding;
  slides: SlideData[];
  isGlobalBranding: boolean;
}
