export const getIdenticonUrl = (id?: string) => {
  return `https://api.natsuneko.com/egeria/v0/identicon/${id ?? "lumine"}.svg`;
};

const MEDIA_VARIANTS = {
  // size-based
  xtiny: "xtiny", // 96x96 downscale
  tiny: "tiny", // 256x256 downscale
  xsmall: "xsmall", // 512x512 downscale
  small: "small", // 1024x1024 downscale
  medium: "medium", // 2048x2048 downscale
  large: "large", // 4096x4096 downscale
  xlarge: "xlarge", // 8192x8192 downscale
  original: "original", // 9999x9999 downscale

  // usage-based
  ogp: "ogp", // 1200×630 cover
  blur: "blur", // 1200x630 blurred cover
  icon: "tiny", // 256x256 square
  header: "header", // 1500x500 downscale
  thumbnail: "thumbnail", // 512x512 square
  timeline: "xsmall", // 512x512 downscale

  // compatibilities
  "user-icon": "tiny",
  "user-header": "header",
  "upload-thumbnail": "thumbnail",
  "post-thumbnail": "thumbnail",
  "post-details": "small",
  "post-background": "xsmall",
  "ogp-thumbnail": "ogp",
};

type GetCdnUrlArgs = {
  variant?: keyof typeof MEDIA_VARIANTS;
  src: string;
  aspect?: { w: number; h: number };
  width: number;
  mode?: "fill" | "crop";
};

export const getCdnUrl = ({ src, variant, width, aspect, mode }: GetCdnUrlArgs) => {
  if (!src) {
    return "";
  }

  if (
    src.startsWith("https://imagedelivery.net") ||
    src.startsWith("https://cdn.natsuneko.com") ||
    src.startsWith("https://citlali.natsuneko.com")
  ) {
    let additional = "";
    if (src.includes("citlali")) {
      additional = "?format=auto";
    }

    return `${src}/${MEDIA_VARIANTS[variant ?? "original"]}${additional}`;
  }

  if (src.startsWith(`https://api.natsuneko.com`)) {
    return src;
  }

  let cdn = new URL(src);

  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  if (src.startsWith("https://images.natsuneko.com/")) {
    cdn = new URL(new URL(src).pathname, "https://images.natsuneko.com/");
  }
  cdn.searchParams.set("quality", "85");
  cdn.searchParams.set("width", width.toString());

  if (aspect) {
    if (aspect.h > aspect.w) {
      cdn.searchParams.set("fit", mode ?? "crop");
    }

    if (aspect.h < aspect.w) {
      cdn.searchParams.set("fit", mode ?? "fill");
    }

    if (aspect.h === aspect.w) {
      cdn.searchParams.set("crop", `${aspect?.w ?? 1}:${aspect?.h ?? 1}`);
    }
  } else {
    cdn.searchParams.set("crop", "1:1");
  }

  return cdn.toString();
};
